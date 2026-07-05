import { NextResponse } from 'next/server';
import { db } from '@/db';
import { thoughts, relationships } from '@/db/schema';
import { getSessionUser } from '@/lib/auth';
import { eq, and, or } from 'drizzle-orm';
import crypto from 'crypto';

// POST /api/relationships - Manually connect two thoughts
export async function POST(request: Request) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'unauthorized', message: 'Unauthorized' }, { status: 401 });
    }

    const { thoughtId1, thoughtId2, score = 0.8 } = await request.json();

    if (!thoughtId1 || !thoughtId2) {
      return NextResponse.json({ error: 'bad_request', message: 'Both thoughtId1 and thoughtId2 are required' }, { status: 400 });
    }

    // Verify both thoughts belong to the user
    const [thought1, thought2] = await Promise.all([
      db.query.thoughts.findFirst({ where: and(eq(thoughts.id, thoughtId1), eq(thoughts.userId, user.id)) }),
      db.query.thoughts.findFirst({ where: and(eq(thoughts.id, thoughtId2), eq(thoughts.userId, user.id)) })
    ]);

    if (!thought1 || !thought2) {
      return NextResponse.json({ error: 'not_found', message: 'One or both thoughts not found or unauthorized' }, { status: 404 });
    }

    // Check if relationship already exists
    const existing = await db.query.relationships.findFirst({
      where: or(
        and(eq(relationships.thoughtId1, thoughtId1), eq(relationships.thoughtId2, thoughtId2)),
        and(eq(relationships.thoughtId1, thoughtId2), eq(relationships.thoughtId2, thoughtId1))
      )
    });

    if (existing) {
      // Update existing score
      await db.update(relationships)
        .set({ score, createdAt: Date.now() })
        .where(eq(relationships.id, existing.id));
      return NextResponse.json({ success: true, relationship: { ...existing, score } });
    }

    const newId = crypto.randomUUID();
    const newRelation = {
      id: newId,
      thoughtId1,
      thoughtId2,
      score,
      createdAt: Date.now()
    };

    await db.insert(relationships).values(newRelation);

    return NextResponse.json({ success: true, relationship: newRelation });
  } catch (error) {
    console.error('Error creating relationship:', error);
    return NextResponse.json({ error: 'server_error', message: 'Internal server error' }, { status: 500 });
  }
}

// PATCH /api/relationships - Update relationship score
export async function PATCH(request: Request) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'unauthorized', message: 'Unauthorized' }, { status: 401 });
    }

    const { id, score } = await request.json();

    if (!id || score === undefined) {
      return NextResponse.json({ error: 'bad_request', message: 'id and score are required' }, { status: 400 });
    }

    // Verify relationship exists and belongs to user
    const existing = await db.query.relationships.findFirst({
      where: eq(relationships.id, id)
    });

    if (!existing) {
      return NextResponse.json({ error: 'not_found', message: 'Relationship not found' }, { status: 404 });
    }

    // Verify ownership via thoughts table
    const thought = await db.query.thoughts.findFirst({
      where: and(eq(thoughts.id, existing.thoughtId1), eq(thoughts.userId, user.id))
    });

    if (!thought) {
      return NextResponse.json({ error: 'unauthorized', message: 'Unauthorized' }, { status: 401 });
    }

    await db.update(relationships)
      .set({ score, createdAt: Date.now() })
      .where(eq(relationships.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating relationship:', error);
    return NextResponse.json({ error: 'server_error', message: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/relationships - Delete a connection
export async function DELETE(request: Request) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'unauthorized', message: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'bad_request', message: 'Relationship id is required' }, { status: 400 });
    }

    // Verify relationship exists
    const existing = await db.query.relationships.findFirst({
      where: eq(relationships.id, id)
    });

    if (!existing) {
      return NextResponse.json({ error: 'not_found', message: 'Relationship not found' }, { status: 404 });
    }

    // Verify ownership
    const thought = await db.query.thoughts.findFirst({
      where: and(eq(thoughts.id, existing.thoughtId1), eq(thoughts.userId, user.id))
    });

    if (!thought) {
      return NextResponse.json({ error: 'unauthorized', message: 'Unauthorized' }, { status: 401 });
    }

    await db.delete(relationships).where(eq(relationships.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting relationship:', error);
    return NextResponse.json({ error: 'server_error', message: 'Internal server error' }, { status: 500 });
  }
}
