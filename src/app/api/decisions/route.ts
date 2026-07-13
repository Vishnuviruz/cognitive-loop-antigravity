import { NextResponse } from 'next/server';
import { db } from '@/db';
import { decisions, thoughts } from '@/db/schema';
import { getSessionUser } from '@/lib/auth';
import { eq, desc } from 'drizzle-orm';
import crypto from 'crypto';

// GET /api/decisions - Fetch all decision trackers for the logged-in user
export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'unauthorized', message: 'Unauthorized access' }, { status: 401 });
    }

    // Query decisions, pulling title directly from decisions table, and join thoughts for the parent context note
    const list = await db
      .select({
        id: decisions.id,
        thoughtId: decisions.thoughtId,
        title: decisions.title,
        expectedOutcomeDate: decisions.expectedOutcomeDate,
        successMetric: decisions.successMetric,
        status: decisions.status,
        outcomeNotes: decisions.outcomeNotes,
        reviewedAt: decisions.reviewedAt,
        createdAt: decisions.createdAt,
        thoughtContent: thoughts.content,
        thoughtSummary: thoughts.summary,
      })
      .from(decisions)
      .innerJoin(thoughts, eq(decisions.thoughtId, thoughts.id))
      .where(eq(decisions.userId, user.id))
      .orderBy(desc(decisions.createdAt));

    return NextResponse.json({ decisions: list });
  } catch (error: any) {
    console.error('Error fetching decisions:', error);
    return NextResponse.json(
      { error: 'server_error', message: error.message || 'Internal server error while fetching decisions' },
      { status: 500 }
    );
  }
}

// POST /api/decisions - Create a new decision tracker mapped to a parent thought
export async function POST(request: Request) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'unauthorized', message: 'Unauthorized access' }, { status: 401 });
    }

    const { thoughtId, title, expectedOutcomeDate, successMetric } = await request.json();

    if (!thoughtId || thoughtId === 'new' || !title || title.trim() === '' || !expectedOutcomeDate || !successMetric || successMetric.trim() === '') {
      return NextResponse.json(
        { error: 'bad_request', message: 'Missing thoughtId, title, expectedOutcomeDate, or successMetric' },
        { status: 400 }
      );
    }

    // 1. Verify parent thought exists and belongs to the user
    const targetThought = await db.query.thoughts.findFirst({
      where: eq(thoughts.id, thoughtId),
    });

    if (!targetThought || targetThought.userId !== user.id) {
      return NextResponse.json({ error: 'not_found', message: 'Associated thought not found' }, { status: 404 });
    }

    const decisionId = crypto.randomUUID();

    // 2. Create the decision tracker row linked to the parent thought
    await db.insert(decisions).values({
      id: decisionId,
      userId: user.id,
      thoughtId,
      title: title.trim(),
      expectedOutcomeDate: Number(expectedOutcomeDate),
      successMetric: successMetric.trim(),
      status: 'pending',
      createdAt: Date.now(),
    });

    const newDecision = await db.query.decisions.findFirst({
      where: eq(decisions.id, decisionId),
    });

    return NextResponse.json({ success: true, decision: newDecision });
  } catch (error: any) {
    console.error('Error creating decision tracker:', error);
    return NextResponse.json(
      { error: 'server_error', message: error.message || 'Internal server error while creating decision' },
      { status: 500 }
    );
  }
}

