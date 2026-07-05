import { NextResponse } from 'next/server';
import { db } from '@/db';
import { actionItems } from '@/db/schema';
import { getSessionUser } from '@/lib/auth';
import { eq, and } from 'drizzle-orm';

// PATCH /api/action-items/[id] - Update an action item
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'unauthorized', message: 'Unauthorized access' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { status, priority, title, description, dueDate } = body;

    // Verify ownership
    const existing = await db.query.actionItems.findFirst({
      where: and(eq(actionItems.id, id), eq(actionItems.userId, user.id)),
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'not_found', message: 'Action item not found' },
        { status: 404 }
      );
    }

    // Build update payload
    const updates: Record<string, unknown> = {};

    if (title !== undefined) updates.title = title;
    if (description !== undefined) updates.description = description;
    if (priority !== undefined) updates.priority = priority;
    if (dueDate !== undefined) updates.dueDate = dueDate;

    if (status !== undefined) {
      updates.status = status;

      if (status === 'completed' && existing.status !== 'completed') {
        updates.completedAt = Date.now();
      } else if (status !== 'completed' && existing.status === 'completed') {
        updates.completedAt = null;
      }
    }

    await db.update(actionItems)
      .set(updates)
      .where(and(eq(actionItems.id, id), eq(actionItems.userId, user.id)));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating action item:', error);
    return NextResponse.json(
      { error: 'server_error', message: 'Internal server error while updating action item' },
      { status: 500 }
    );
  }
}

// DELETE /api/action-items/[id] - Delete an action item
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'unauthorized', message: 'Unauthorized access' }, { status: 401 });
    }

    const { id } = await params;

    // Verify ownership
    const existing = await db.query.actionItems.findFirst({
      where: and(eq(actionItems.id, id), eq(actionItems.userId, user.id)),
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'not_found', message: 'Action item not found' },
        { status: 404 }
      );
    }

    await db.delete(actionItems)
      .where(and(eq(actionItems.id, id), eq(actionItems.userId, user.id)));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting action item:', error);
    return NextResponse.json(
      { error: 'server_error', message: 'Internal server error while deleting action item' },
      { status: 500 }
    );
  }
}
