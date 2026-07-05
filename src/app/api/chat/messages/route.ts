import { NextResponse } from 'next/server';
import { db } from '@/db';
import { chatMessages } from '@/db/schema';
import { getSessionUser } from '@/lib/auth';
import { eq, and, asc } from 'drizzle-orm';

// GET /api/chat/messages - Fetch chat history for authenticated user
export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'unauthorized', message: 'Unauthorized access' }, { status: 401 });
    }

    const rawMessages = await db.query.chatMessages.findMany({
      where: eq(chatMessages.userId, user.id),
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

// DELETE /api/chat/messages - Clear all chat history for authenticated user
export async function DELETE() {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'unauthorized', message: 'Unauthorized access' }, { status: 401 });
    }

    await db.delete(chatMessages).where(eq(chatMessages.userId, user.id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error clearing chat messages:', error);
    return NextResponse.json(
      { error: 'server_error', message: 'Internal server error while clearing chat messages' },
      { status: 500 }
    );
  }
}
