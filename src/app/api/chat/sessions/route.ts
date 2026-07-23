import { NextResponse } from 'next/server';
import { db } from '@/db';
import { chatSessions } from '@/db/schema';
import { getSessionUser } from '@/lib/auth';
import { eq, and, desc } from 'drizzle-orm';
import crypto from 'crypto';

// GET /api/chat/sessions - Fetch all chat sessions for the authenticated user
export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'unauthorized', message: 'Unauthorized' }, { status: 401 });
    }

    const sessions = await db.query.chatSessions.findMany({
      where: eq(chatSessions.userId, user.id),
      orderBy: [desc(chatSessions.isPinned), desc(chatSessions.createdAt)],
    });

    return NextResponse.json({ sessions });
  } catch (error) {
    console.error('Error fetching chat sessions:', error);
    return NextResponse.json({ error: 'server_error', message: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/chat/sessions - Create a new chat session
export async function POST(request: Request) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'unauthorized', message: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const title = body.title?.trim() || 'New Conversation';

    const newSession = {
      id: crypto.randomUUID(),
      userId: user.id,
      title,
      isPinned: 0,
      createdAt: Date.now(),
    };

    await db.insert(chatSessions).values(newSession);

    return NextResponse.json({ success: true, session: newSession });
  } catch (error) {
    console.error('Error creating chat session:', error);
    return NextResponse.json({ error: 'server_error', message: 'Internal server error' }, { status: 500 });
  }
}
