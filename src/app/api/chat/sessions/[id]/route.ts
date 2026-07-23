import { NextResponse } from 'next/server';
import { db } from '@/db';
import { chatSessions } from '@/db/schema';
import { getSessionUser } from '@/lib/auth';
import { eq, and } from 'drizzle-orm';

// PATCH /api/chat/sessions/[id] - Rename or pin/unpin a session
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'unauthorized', message: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    const existing = await db.query.chatSessions.findFirst({
      where: and(eq(chatSessions.id, id), eq(chatSessions.userId, user.id)),
    });

    if (!existing) {
      return NextResponse.json({ error: 'not_found', message: 'Session not found' }, { status: 404 });
    }

    const updateFields: any = {};
    if (body.title !== undefined) updateFields.title = body.title.trim();
    if (body.isPinned !== undefined) updateFields.isPinned = body.isPinned ? 1 : 0;

    await db.update(chatSessions)
      .set(updateFields)
      .where(and(eq(chatSessions.id, id), eq(chatSessions.userId, user.id)));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating chat session:', error);
    return NextResponse.json({ error: 'server_error', message: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/chat/sessions/[id] - Delete a session and its message threads
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'unauthorized', message: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const existing = await db.query.chatSessions.findFirst({
      where: and(eq(chatSessions.id, id), eq(chatSessions.userId, user.id)),
    });

    if (!existing) {
      return NextResponse.json({ error: 'not_found', message: 'Session not found' }, { status: 404 });
    }

    await db.delete(chatSessions)
      .where(and(eq(chatSessions.id, id), eq(chatSessions.userId, user.id)));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting chat session:', error);
    return NextResponse.json({ error: 'server_error', message: 'Internal server error' }, { status: 500 });
  }
}
