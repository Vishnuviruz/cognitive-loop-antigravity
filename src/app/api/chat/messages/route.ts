import { NextResponse } from 'next/server';
import { db } from '@/db';
import { chatMessages } from '@/db/schema';
import { getSessionUser } from '@/lib/auth';
import { eq, and, asc } from 'drizzle-orm';

// GET /api/chat/messages - Fetch chat history for authenticated user
export async function GET(request: Request) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'unauthorized', message: 'Unauthorized access' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');

    const conditions = [eq(chatMessages.userId, user.id)];
    if (sessionId) {
      conditions.push(eq(chatMessages.sessionId, sessionId));
    }

    const rawMessages = await db.query.chatMessages.findMany({
      where: and(...conditions),
      orderBy: asc(chatMessages.createdAt),
    });

    const messages = rawMessages.map((msg) => ({
      id: msg.id,
      role: msg.role,
      content: msg.content,
      contextUsed: msg.contextUsed ? JSON.parse(msg.contextUsed) : null,
      createdAt: msg.createdAt,
    }));

    return NextResponse.json({ messages });
  } catch (error) {
    console.error('Error fetching chat messages:', error);
    return NextResponse.json(
      { error: 'server_error', message: 'Internal server error while fetching chat messages' },
      { status: 500 }
    );
  }
}

// DELETE /api/chat/messages - Clear chat history for authenticated user
export async function DELETE(request: Request) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'unauthorized', message: 'Unauthorized access' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');

    const conditions = [eq(chatMessages.userId, user.id)];
    if (sessionId) {
      conditions.push(eq(chatMessages.sessionId, sessionId));
    }

    await db.delete(chatMessages).where(and(...conditions));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error clearing chat messages:', error);
    return NextResponse.json(
      { error: 'server_error', message: 'Internal server error while clearing chat messages' },
      { status: 500 }
    );
  }
}
