import { cookies } from 'next/headers';
import { db } from '@/db';
import { users, sessions } from '@/db/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

const SESSION_COOKIE_NAME = 'session_token';
const SESSION_EXPIRY = 30 * 24 * 60 * 60 * 1000; // 30 days

export async function createSession(userId: string): Promise<string> {
  const sessionId = crypto.randomUUID();
  const expiresAt = Date.now() + SESSION_EXPIRY;

  await db.insert(sessions).values({
    id: sessionId,
    userId,
    expiresAt,
  });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, sessionId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_EXPIRY / 1000,
  });

  return sessionId;
}

export async function getSessionUser() {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!sessionId) return null;

  const sessionRecord = await db.query.sessions.findFirst({
    where: eq(sessions.id, sessionId),
  });

  if (!sessionRecord) return null;

  if (Date.now() > sessionRecord.expiresAt) {
    // Session expired, clean up database record
    await db.delete(sessions).where(eq(sessions.id, sessionId));
    return null;
  }

  // Extend session if it is close to expiration (less than 15 days left)
  if (sessionRecord.expiresAt - Date.now() < 15 * 24 * 60 * 60 * 1000) {
    const nextExpiry = Date.now() + SESSION_EXPIRY;
    await db
      .update(sessions)
      .set({ expiresAt: nextExpiry })
      .where(eq(sessions.id, sessionId));
      
    cookieStore.set(SESSION_COOKIE_NAME, sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: SESSION_EXPIRY / 1000,
    });
  }

  const user = await db.query.users.findFirst({
    where: eq(users.id, sessionRecord.userId),
  });

  if (!user) return null;

  // Return user details without password hash for safety
  const { passwordHash, ...userWithoutPassword } = user;
  return userWithoutPassword;
}

export async function destroySession() {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (sessionId) {
    await db.delete(sessions).where(eq(sessions.id, sessionId));
  }

  cookieStore.set(SESSION_COOKIE_NAME, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
}
