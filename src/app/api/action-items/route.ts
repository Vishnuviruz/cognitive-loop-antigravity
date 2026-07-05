import { NextResponse } from 'next/server';
import { db } from '@/db';
import { actionItems, thoughts } from '@/db/schema';
import { getSessionUser } from '@/lib/auth';
import { eq, and, desc } from 'drizzle-orm';
import crypto from 'crypto';
import { generateTaskReflection } from '@/lib/groq';

// GET /api/action-items - Fetch action items with optional filtering
export async function GET(request: Request) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'unauthorized', message: 'Unauthorized access' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const priority = searchParams.get('priority');

    const conditions = [eq(actionItems.userId, user.id)];

    if (status) {
      conditions.push(eq(actionItems.status, status));
    }

    if (priority) {
      conditions.push(eq(actionItems.priority, priority));
    }

    const items = await db.query.actionItems.findMany({
      where: and(...conditions),
      orderBy: desc(actionItems.createdAt),
    });

    // Fetch source thought summaries
    const itemsWithSummary = await Promise.all(
      items.map(async (item) => {
        let thoughtSummary = null;
        if (item.thoughtId) {
          const thought = await db.query.thoughts.findFirst({
            where: eq(thoughts.id, item.thoughtId),
            columns: { summary: true },
          });
          thoughtSummary = thought?.summary ?? null;
        }

        return {
          ...item,
          thoughtSummary,
        };
      })
    );

    return NextResponse.json({ actionItems: itemsWithSummary });
  } catch (error) {
    console.error('Error fetching action items:', error);
    return NextResponse.json(
      { error: 'server_error', message: 'Internal server error while fetching action items' },
      { status: 500 }
    );
  }
}

// POST /api/action-items - Create a manual action item
export async function POST(request: Request) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'unauthorized', message: 'Unauthorized access' }, { status: 401 });
    }

    const body = await request.json();
    const { thoughtId, title, description, priority, dueDate, category } = body;

    if (!title || typeof title !== 'string' || !title.trim()) {
      return NextResponse.json(
        { error: 'bad_request', message: 'Title is required and must be non-empty' },
        { status: 400 }
      );
    }

    const validPriorities = ['high', 'medium', 'low'];
    if (!priority || !validPriorities.includes(priority)) {
      return NextResponse.json(
        { error: 'bad_request', message: 'Priority must be one of: high, medium, low' },
        { status: 400 }
      );
    }

    const newId = crypto.randomUUID();
    const now = Date.now();

    // Call AI to generate reflection/insight if this is manually created or description is empty
    let finalDescription = description ?? '';
    if (!finalDescription.trim()) {
      const generatedReflection = await generateTaskReflection(
        title.trim(),
        null,
        priority,
        category ?? 'Work',
        user.name ?? undefined
      );
      finalDescription = generatedReflection;
    }

    const actionItem = {
      id: newId,
      userId: user.id,
      thoughtId: thoughtId ?? null,
      title: title.trim(),
      description: finalDescription.trim(),
      priority,
      status: 'pending' as const,
      dueDate: dueDate ?? null,
      completedAt: null,
      createdAt: now,
      category: category ?? 'Work',
    };

    await db.insert(actionItems).values(actionItem);

    return NextResponse.json({ success: true, actionItem });
  } catch (error) {
    console.error('Error creating action item:', error);
    return NextResponse.json(
      { error: 'server_error', message: 'Internal server error while creating action item' },
      { status: 500 }
    );
  }
}
