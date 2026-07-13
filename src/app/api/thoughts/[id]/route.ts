import { NextResponse } from 'next/server';
import { db } from '@/db';
import { thoughts } from '@/db/schema';
import { getSessionUser } from '@/lib/auth';
import { eq, and } from 'drizzle-orm';

// PATCH /api/thoughts/[id] - Update a thought (category, summary, content, tags, parentId)
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

    const existing = await db.query.thoughts.findFirst({
      where: and(eq(thoughts.id, id), eq(thoughts.userId, user.id)),
    });

    if (!existing) {
      return NextResponse.json({ error: 'not_found', message: 'Thought not found' }, { status: 404 });
    }

    const updateFields: any = {};
    if (body.category !== undefined) updateFields.category = body.category;
    if (body.summary !== undefined) updateFields.summary = body.summary;
    if (body.content !== undefined) updateFields.content = body.content;
    if (body.tags !== undefined) updateFields.tags = JSON.stringify(body.tags);
    if (body.suggestedTasks !== undefined) updateFields.suggestedTasks = JSON.stringify(body.suggestedTasks);
    if (body.parentId !== undefined) updateFields.parentId = body.parentId;
    if (body.groupId !== undefined) updateFields.groupId = body.groupId;

    await db.update(thoughts)
      .set(updateFields)
      .where(and(eq(thoughts.id, id), eq(thoughts.userId, user.id)));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating thought:', error);
    return NextResponse.json({ error: 'server_error', message: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/thoughts/[id] - Delete a thought
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

    const existing = await db.query.thoughts.findFirst({
      where: and(eq(thoughts.id, id), eq(thoughts.userId, user.id)),
    });

    if (!existing) {
      return NextResponse.json({ error: 'not_found', message: 'Thought not found' }, { status: 404 });
    }

    await db.delete(thoughts).where(and(eq(thoughts.id, id), eq(thoughts.userId, user.id)));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting thought:', error);
    return NextResponse.json({ error: 'server_error', message: 'Internal server error' }, { status: 500 });
  }
}
