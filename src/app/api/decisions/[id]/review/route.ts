import { NextResponse } from 'next/server';
import { db } from '@/db';
import { decisions, thoughts } from '@/db/schema';
import { getSessionUser } from '@/lib/auth';
import { eq } from 'drizzle-orm';
import { extractLesson } from '@/lib/decisions';

// POST /api/decisions/[id]/review - Record the retrospective outcome of a decision
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'unauthorized', message: 'Unauthorized access' }, { status: 401 });
    }

    const { id } = await params;
    const { status, outcomeNotes } = await request.json();

    if (!status || !['success', 'failed', 'trash'].includes(status)) {
      return NextResponse.json(
        { error: 'bad_request', message: 'Invalid status. Must be "success", "failed", or "trash"' },
        { status: 400 }
      );
    }

    const cleanNotes = outcomeNotes?.trim() || '';

    // Verify tracker exists and belongs to the user
    const decisionRecord = await db.query.decisions.findFirst({
      where: eq(decisions.id, id),
    });

    if (!decisionRecord || decisionRecord.userId !== user.id) {
      return NextResponse.json({ error: 'not_found', message: 'Decision tracker not found' }, { status: 404 });
    }

    // Fetch the source thought to get the decision title (thought summary)
    const sourceThought = await db.query.thoughts.findFirst({
      where: eq(thoughts.id, decisionRecord.thoughtId),
    });

    // Update decision outcome
    await db
      .update(decisions)
      .set({
        status,
        outcomeNotes: cleanNotes,
        reviewedAt: Date.now(),
      })
      .where(eq(decisions.id, id));

    const updatedDecision = await db.query.decisions.findFirst({
      where: eq(decisions.id, id),
    });

    // Trigger Slow Path Groq lesson extraction in the background
    const decisionTitle = sourceThought?.summary ?? 'A committed decision';
    extractLesson(
      id,
      decisionTitle,
      decisionRecord.successMetric,
      cleanNotes,
      status as 'success' | 'failed' | 'trash',
      user.id
    ).catch((err) => {
      console.error('[Lesson Extraction] Background error:', err);
    });

    return NextResponse.json({ success: true, decision: updatedDecision });
  } catch (error: any) {
    console.error('Error logging decision review:', error);
    return NextResponse.json(
      { error: 'server_error', message: error.message || 'Internal server error while logging review' },
      { status: 500 }
    );
  }
}

