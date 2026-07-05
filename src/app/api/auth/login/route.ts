import { NextResponse } from 'next/server';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { verifyPassword, createSession } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password, isDemo } = body;

    // Handle Demo Mode login bypass
    if (isDemo === true) {
      const demoId = 'demo-user';
      const demoEmail = 'demo@cognitiveloop.com';
      const demoName = 'Demo Explorer';

      let user = await db.query.users.findFirst({
        where: eq(users.id, demoId),
      });

      if (!user) {
        await db.insert(users).values({
          id: demoId,
          email: demoEmail,
          name: demoName,
          createdAt: Date.now(),
        });
      }

      await createSession(demoId);

      return NextResponse.json({
        success: true,
        user: {
          id: demoId,
          email: demoEmail,
          name: demoName,
        },
      });
    }

    if (!email || !password) {
      return NextResponse.json(
        { error: 'bad_request', message: 'Email and password are required' },
        { status: 400 }
      );
    }

    const user = await db.query.users.findFirst({
      where: eq(users.email, email.toLowerCase().trim()),
    });

    if (!user || !user.passwordHash) {
      return NextResponse.json(
        { error: 'invalid_credentials', message: 'Invalid email or password' },
        { status: 400 }
      );
    }

    const isPasswordCorrect = await verifyPassword(password, user.passwordHash);

    if (!isPasswordCorrect) {
      return NextResponse.json(
        { error: 'invalid_credentials', message: 'Invalid email or password' },
        { status: 400 }
      );
    }

    await createSession(user.id);

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatarUrl,
      },
    });
  } catch (error: any) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'server_error', message: 'Internal server error during login' },
      { status: 500 }
    );
  }
}
