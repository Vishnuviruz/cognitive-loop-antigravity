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
import { decisions, thoughts, entities, lessons } from '@/db/schema';
import { ai } from '@/lib/groq';
import { eq, and } from 'drizzle-orm';
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

// ─── Lesson Extraction ────────────────────────────────────────────────────────

interface LessonExtract {
  isSuccessful: boolean;
  lesson: string;
  associatedEntityId: string | null;
}

/**
 * extractLesson
 *
 * Called in the background by POST /api/decisions/[id]/review after the user
 * logs a retrospective outcome.
 *
 * Follows AI Pipeline Spec §4 (Decision Resolution & Lesson Extraction):
 * Calls Groq with the decision title, successMetric, and outcome notes,
 * then inserts a lessons row.
 */
export async function extractLesson(
  decisionId: string,
  thoughtSummary: string,
  successMetric: string,
  outcomeNotes: string,
  reviewStatus: 'success' | 'failed' | 'neutral',
  userId: string
): Promise<void> {
  let extract: LessonExtract;

  if (!ai) {
    // Offline Demo Mode: generate a basic lesson
    extract = {
      isSuccessful: reviewStatus === 'success',
      lesson:
        reviewStatus === 'success'
          ? 'You demonstrated that committing to clear goals with defined metrics leads to better outcomes.'
          : 'You learned that revisiting your assumptions earlier could have changed the outcome of this decision.',
      associatedEntityId: null,
    };
  } else {
    try {
      // Fetch user entities for associatedEntityId resolution
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
            content: `You are evaluating the outcome of a decision logged by the user.

Compare the decision's original success metric against the logged outcome notes. Determine if the decision was successful, and extract the core lesson learned as a reusable rule of thumb.

Decision:
- Title: "${thoughtSummary}"
- Success Metric: "${successMetric}"

Outcome Notes:
"${outcomeNotes}"

User's Knowledge Graph Entities (id | name | type):
${entitySummary || 'None yet'}

Response Schema:
{
  "isSuccessful": boolean,
  "lesson": "a reusable lesson or rule of thumb for future decisions, written in the second person (e.g. 'You should always validate your assumptions before committing to...')",
  "associatedEntityId": "uuid of the entity most impacted by this decision, or null if none match"
}`,
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
        lesson: `You reflected on this ${reviewStatus === 'success' ? 'successful' : 'challenging'} decision and documented the outcome.`,
        associatedEntityId: null,
      };
    }
  }

  // Validate associatedEntityId if provided
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
    lesson: extract.lesson,
    isSuccessful: extract.isSuccessful ? 1 : 0,
    createdAt: Date.now(),
  });

  console.log(`[Lesson Extraction] Extracted lesson ${lessonId} from decision ${decisionId}`);
}
