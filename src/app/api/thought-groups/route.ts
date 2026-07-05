import { NextResponse } from 'next/server';
import { db } from '@/db';
import { thoughtGroups, thoughts } from '@/db/schema';
import { getSessionUser } from '@/lib/auth';
import { eq, desc } from 'drizzle-orm';
import crypto from 'crypto';

// GET /api/thought-groups - Fetch all thought groups with thought counts
export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'unauthorized', message: 'Unauthorized access' }, { status: 401 });
    }

    const groups = await db.query.thoughtGroups.findMany({
      where: eq(thoughtGroups.userId, user.id),
      orderBy: desc(thoughtGroups.createdAt),
    });

    // Count thoughts per group
    const groupsWithCount = await Promise.all(
      groups.map(async (group) => {
        const groupThoughts = await db.query.thoughts.findMany({
          where: eq(thoughts.groupId, group.id),
          columns: { id: true },
        });

        return {
          ...group,
          thoughtCount: groupThoughts.length,
        };
      })
    );

    return NextResponse.json({ groups: groupsWithCount });
  } catch (error) {
    console.error('Error fetching thought groups:', error);
    return NextResponse.json(
      { error: 'server_error', message: 'Internal server error while fetching thought groups' },
      { status: 500 }
    );
  }
}

// POST /api/thought-groups - Create a new thought group
export async function POST(request: Request) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'unauthorized', message: 'Unauthorized access' }, { status: 401 });
    }

    const body = await request.json();
    const { name, description, color } = body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json(
        { error: 'bad_request', message: 'Group name is required and must be non-empty' },
        { status: 400 }
      );
    }

    const newId = crypto.randomUUID();
    const now = Date.now();

    const group = {
      id: newId,
      userId: user.id,
      name: name.trim(),
      description: description ?? null,
      color: color || '#6366f1',
      createdAt: now,
    };

    await db.insert(thoughtGroups).values(group);

    return NextResponse.json({ success: true, group });
  } catch (error) {
    console.error('Error creating thought group:', error);
    return NextResponse.json(
      { error: 'server_error', message: 'Internal server error while creating thought group' },
      { status: 500 }
    );
  }
}
