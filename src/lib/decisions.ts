/**
 * src/lib/decisions.ts
 * Centralised AI helper for Phase 3: Decision Intelligence.
 *
 * Exports:
 *   createDecisionFromThought — Groq-powered extraction of successMetric and
 *     expectedOutcomeDate from a thought, then inserts a decisions row.
 *   extractLesson — Groq Pipeline 4 lesson extraction after a retrospective
 *     review, then inserts a lessons row linked back to the decision and entity.
 */

import { db } from '@/db';
import { decisions, thoughts, entities, lessons, decisionProgressLogs } from '@/db/schema';
import { ai } from '@/lib/groq';
import { eq, and, asc } from 'drizzle-orm';
import crypto from 'crypto';

// ─── Utility ────────────────────────────────────────────────────────────────

/** Returns a Unix timestamp (ms) N days from now. */
function daysFromNow(days: number): number {
  return Date.now() + days * 24 * 60 * 60 * 1000;
}

// ─── Auto Decision Capture ────────────────────────────────────────────────────

interface DecisionExtract {
  successMetric: string;
  reviewDays: number; // How many days until the user should review the outcome
}

/**
 * createDecisionFromThought
 *
 * Called in the background by POST /api/thoughts when the AI detects a
 * high-confidence decision (isDecision === true && decisionConfidence >= 0.75).
 *
 * Uses Groq to extract a measurable success metric and a review timeline,
 * then inserts a pending decision row linked to the thought.
 */
export async function createDecisionFromThought(
  thoughtId: string,
  userId: string
): Promise<void> {
  // Guard: skip if this thought already has a decision tracker
  const existing = await db.query.decisions.findFirst({
    where: eq(decisions.thoughtId, thoughtId),
  });
  if (existing) return;

  // Fetch the thought content
  const thought = await db.query.thoughts.findFirst({
    where: and(eq(thoughts.id, thoughtId), eq(thoughts.userId, userId)),
  });
  if (!thought) return;

  let extract: DecisionExtract;

  if (!ai) {
    // Offline Demo Mode: sensible defaults
    extract = {
      successMetric: 'Evaluate whether the decision led to the intended result.',
      reviewDays: 30,
    };
  } else {
    try {
      const response = await ai.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content: `You are extracting a decision tracker configuration from a user's thought.

Your task is to identify:
1. A concise, measurable SUCCESS METRIC — a single sentence describing what "success" looks like for this decision.
2. A REVIEW TIMELINE — how many days from now the user should check back and log the outcome (pick 7, 14, 30, 60, or 90 days based on the decision scope).

Respond ONLY with this JSON structure:
{
  "successMetric": "A single concise sentence describing what success looks like for this decision",
  "reviewDays": 30
}`,
          },
          {
            role: 'user',
            content: `Decision thought: "${thought.content}"`,
          },
        ],
      });

      const raw = response.choices[0]?.message?.content;
      if (!raw) throw new Error('Empty response from Groq decision extraction');
      extract = JSON.parse(raw) as DecisionExtract;
    } catch (err: any) {
      console.error('[createDecisionFromThought] Groq extraction failed:', err.message || err);
      // Fallback so we don't silently skip the decision
      extract = {
        successMetric: 'Evaluate whether the decision led to the intended result.',
        reviewDays: 30,
      };
    }
  }

  const decisionId = crypto.randomUUID();

  await db.insert(decisions).values({
    id: decisionId,
    userId,
    thoughtId,
    title: thought.summary,
    successMetric: extract.successMetric,
    expectedOutcomeDate: daysFromNow(extract.reviewDays),
    status: 'pending',
    createdAt: Date.now(),
  });

  console.log(`[Decision Capture] Auto-created decision tracker ${decisionId} from thought ${thoughtId}`);
}

// ─── Lesson Extraction & Final Synthesis ────────────────────────────────────────

interface LessonExtract {
  isSuccessful: boolean;
  lesson: string;
  synthesis: string;
  associatedEntityId: string | null;
}

/**
 * extractLesson
 *
 * Called by POST /api/decisions/[id]/review after the user logs a retrospective outcome.
 * Uses Groq to read the decision details, progress logs timeline, and retrospective notes,
 * generating a final outcome synthesis and extracting distilled lessons.
 */
export async function extractLesson(
  decisionId: string,
  decisionTitle: string,
  successMetric: string,
  outcomeNotes: string,
  reviewStatus: 'success' | 'failed' | 'trash',
  userId: string
): Promise<void> {
  let extract: LessonExtract;

  // 1. Fetch chronological progress updates logged during the decision lifecycle
  const allLogs = await db.query.decisionProgressLogs.findMany({
    where: eq(decisionProgressLogs.decisionId, decisionId),
    orderBy: asc(decisionProgressLogs.createdAt),
  });

  const progressLogsText = allLogs.length > 0
    ? allLogs.map((log, idx) => `[Update ${idx + 1} - ${new Date(log.createdAt).toLocaleDateString()}]: "${log.note}"`).join('\n')
    : 'No intermediate progress notes were logged.';

  if (!ai) {
    // Offline Demo Mode fallback
    extract = {
      isSuccessful: reviewStatus === 'success',
      lesson: reviewStatus === 'success'
        ? 'You demonstrated that committing to clear goals with defined metrics leads to better outcomes.'
        : 'You learned that revisiting your assumptions earlier could have changed the outcome of this decision.',
      synthesis: `The decision was completed with a status of "${reviewStatus}". Outcomes logged: "${outcomeNotes}".`,
      associatedEntityId: null,
    };
  } else {
    try {
      // Fetch user entities for resolving entity connections
      const userEntities = await db.query.entities.findMany({
        where: eq(entities.userId, userId),
        columns: { id: true, name: true, type: true },
      });

      const entitySummary = userEntities
        .map((e) => `${e.id} | ${e.name} (${e.type})`)
        .join('\n');

      const response = await ai.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content: `You are evaluating the final outcome of a decision logged by the user.
Compare the decision's original success metric and progress updates against the final retrospective outcome notes.

Your task is to analyze:
1. Whether the decision was successful, failed, or was trashed/abandoned.
2. Generate a "synthesis": A paragraph explaining what the decision was, how it evolved and progressed chronologically, how it was closed, and whether it achieved the planned outcome.
3. If not trashed, extract a "lesson": a reusable rule of thumb written in the second person (e.g. 'You should always validate your assumptions before committing to...'). If trashed, leave the lesson key empty.
4. Resolve the most relevant linked entity.

Respond ONLY in this JSON format:
{
  "isSuccessful": boolean,
  "synthesis": "Comprehensive narrative explaining the decision lifecycle, how it progressed, and its final resolution details",
  "lesson": "Distilled wisdom or rule of thumb (or empty string if decision was trashed)",
  "associatedEntityId": "uuid of the matching entity, or null if none"
}`,
          },
          {
            role: 'user',
            content: `Decision Title: "${decisionTitle}"
Expected Success Metric: "${successMetric}"
Status Outcome: "${reviewStatus}"
Closing Retrospective Notes: "${outcomeNotes}"

Intermediate Progress updates timeline:
${progressLogsText}

User's Knowledge Graph Entities (id | name | type):
${entitySummary || 'None yet'}`,
          },
        ],
      });

      const raw = response.choices[0]?.message?.content;
      if (!raw) throw new Error('Empty response from Groq lesson extraction');
      extract = JSON.parse(raw) as LessonExtract;
    } catch (err: any) {
      console.error('[extractLesson] Groq extraction failed:', err.message || err);
      extract = {
        isSuccessful: reviewStatus === 'success',
        lesson: reviewStatus === 'trash' ? '' : `You reflected on this resolved decision and documented the outcome.`,
        synthesis: `Decision was closed with outcome "${reviewStatus}". Notes: "${outcomeNotes}".`,
        associatedEntityId: null,
      };
    }
  }

  // 2. Save the final synthesis summary to the decision record
  await db
    .update(decisions)
    .set({ finalSynthesis: extract.synthesis })
    .where(eq(decisions.id, decisionId));

  // 3. Insert into the lessons table ONLY if the decision was successfully resolved (not trashed)
  if (reviewStatus !== 'trash' && extract.lesson && extract.lesson.trim() !== '') {
    let validEntityId: string | null = extract.associatedEntityId ?? null;
    if (validEntityId) {
      const entityExists = await db.query.entities.findFirst({
        where: and(eq(entities.id, validEntityId), eq(entities.userId, userId)),
      });
      if (!entityExists) validEntityId = null;
    }

    const lessonId = crypto.randomUUID();
    await db.insert(lessons).values({
      id: lessonId,
      userId,
      decisionId,
      entityId: validEntityId,
      lesson: extract.lesson.trim(),
      isSuccessful: extract.isSuccessful ? 1 : 0,
      createdAt: Date.now(),
    });

    console.log(`[Lesson Extraction] Extracted lesson ${lessonId} from decision ${decisionId}`);
  } else {
    console.log(`[Decision Closed] Saved final synthesis for closed decision ${decisionId} (status: ${reviewStatus})`);
  }
}
