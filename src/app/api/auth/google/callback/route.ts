import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { createSession } from '@/lib/auth';
import crypto from 'crypto';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');

    const cookieStore = await cookies();
    const savedState = cookieStore.get('google_oauth_state')?.value;

    // Clear state cookie immediately
    cookieStore.set('google_oauth_state', '', { path: '/', maxAge: 0 });

    if (!code || !state || !savedState || state !== savedState) {
      return NextResponse.json(
        { error: 'bad_request', message: 'Invalid or missing CSRF state token.' },
        { status: 400 }
      );
    }

    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/google/callback`;

    if (!clientId || !clientSecret) {
      return NextResponse.json(
        { error: 'configuration_error', message: 'Google OAuth secrets not configured.' },
        { status: 500 }
      );
    }

    // Exchange authorization code for access tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok || !tokenData.access_token) {
      console.error('Google token exchange error:', tokenData);
      return NextResponse.json(
        { error: 'oauth_exchange_failed', message: 'Failed to exchange authorization code.' },
        { status: 400 }
      );
    }

    // Retrieve user details from Google
    const userinfoResponse = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });

    const googleUser = await userinfoResponse.json();

    if (!userinfoResponse.ok || !googleUser.email) {
      console.error('Google userinfo fetch error:', googleUser);
      return NextResponse.json(
        { error: 'userinfo_fetch_failed', message: 'Failed to fetch user info from Google.' },
        { status: 400 }
      );
    }

    const email = googleUser.email.toLowerCase().trim();
    const name = googleUser.name || googleUser.given_name || email.split('@')[0];
    const avatarUrl = googleUser.picture;

    // Check if user exists in local database
    let user = await db.query.users.findFirst({
      where: eq(users.email, email),
    });

    if (!user) {
      // Create new user for Google Sign-in
      const userId = crypto.randomUUID();
      await db.insert(users).values({
        id: userId,
        email,
        name,
        avatarUrl,
        createdAt: Date.now(),
      });
      user = {
        id: userId,
        email,
        name,
        avatarUrl,
        passwordHash: null,
        createdAt: Date.now(),
      };
    } else {
      // Update name or avatar if updated on Google profile
      await db
        .update(users)
        .set({ name, avatarUrl })
        .where(eq(users.id, user.id));
    }

    // Set up auth session
    await createSession(user.id);

    // Redirect to app dashboard
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/dashboard`);
  } catch (error) {
    console.error('Google OAuth callback handler error:', error);
    return NextResponse.json(
      { error: 'server_error', message: 'Internal server error during Google Authentication.' },
      { status: 500 }
    );
  }
}
