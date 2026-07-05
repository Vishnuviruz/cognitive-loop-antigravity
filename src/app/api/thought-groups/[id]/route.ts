import { NextResponse } from 'next/server';
import { db } from '@/db';
import { thoughts, thoughtGroups } from '@/db/schema';
import { getSessionUser } from '@/lib/auth';
import { eq, and } from 'drizzle-orm';

// PATCH /api/thought-groups/[id] - Update a thought group
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
    const { name, description, color } = body;

    // Verify ownership
    const existing = await db.query.thoughtGroups.findFirst({
      where: and(eq(thoughtGroups.id, id), eq(thoughtGroups.userId, user.id)),
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'not_found', message: 'Thought group not found' },
        { status: 404 }
      );
    }

    // Build update payload
    const updates: Record<string, unknown> = {};

    if (name !== undefined) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (color !== undefined) updates.color = color;

    await db.update(thoughtGroups)
      .set(updates)
      .where(and(eq(thoughtGroups.id, id), eq(thoughtGroups.userId, user.id)));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating thought group:', error);
    return NextResponse.json(
      { error: 'server_error', message: 'Internal server error while updating thought group' },
      { status: 500 }
    );
  }
}

// DELETE /api/thought-groups/[id] - Delete a thought group (unlinks thoughts)
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
    const existing = await db.query.thoughtGroups.findFirst({
      where: and(eq(thoughtGroups.id, id), eq(thoughtGroups.userId, user.id)),
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'not_found', message: 'Thought group not found' },
        { status: 404 }
      );
    }

    // Unlink thoughts from this group (don't delete the thoughts)
    await db.update(thoughts)
      .set({ groupId: null })
      .where(eq(thoughts.groupId, id));

    // Delete the group
    await db.delete(thoughtGroups)
      .where(and(eq(thoughtGroups.id, id), eq(thoughtGroups.userId, user.id)));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting thought group:', error);
    return NextResponse.json(
      { error: 'server_error', message: 'Internal server error while deleting thought group' },
      { status: 500 }
    );
  }
}
