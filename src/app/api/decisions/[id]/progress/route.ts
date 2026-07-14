import { NextResponse } from 'next/server';
import { db } from '@/db';
import { decisions, decisionProgressLogs } from '@/db/schema';
import { getSessionUser } from '@/lib/auth';
import { eq, and, asc } from 'drizzle-orm';
import { ai } from '@/lib/groq';
import crypto from 'crypto';

// POST /api/decisions/[id]/progress - Log progress notes and trigger AI synthesis
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
    const { note } = await request.json();
    if (!note || note.trim() === '') {
      return NextResponse.json({ error: 'bad_request', message: 'Progress note cannot be empty' }, { status: 400 });
    }

    const decisionId = id;

    // 1. Verify decision exists and belongs to the user
    const decision = await db.query.decisions.findFirst({
      where: and(eq(decisions.id, decisionId), eq(decisions.userId, user.id)),
    });

    if (!decision) {
      return NextResponse.json({ error: 'not_found', message: 'Decision tracker not found' }, { status: 404 });
    }

    // 2. Insert progress note
    const progressId = crypto.randomUUID();
    await db.insert(decisionProgressLogs).values({
      id: progressId,
      decisionId,
      note: note.trim(),
      createdAt: Date.now(),
    });

    // 3. Fetch all progress notes in chronological order
    const allLogs = await db.query.decisionProgressLogs.findMany({
      where: eq(decisionProgressLogs.decisionId, decisionId),
      orderBy: asc(decisionProgressLogs.createdAt),
    });

    const progressLogsText = allLogs
      .map((log, idx) => `[Update ${idx + 1} - ${new Date(log.createdAt).toLocaleDateString()}]: "${log.note}"`)
      .join('\n');

    // 4. Generate AI Progress Summary and JARVIS Insight using Groq Client (ai)
    let summaryText = 'Progress recorded.';
    let jarvisInsightText = 'Continue working towards your success criteria.';

    if (ai) {
      try {
        const response = await ai.chat.completions.create({
          model: 'llama-3.3-70b-versatile',
          response_format: { type: 'json_object' },
          messages: [
            {
              role: 'system',
              content: `You are JARVIS, a highly analytical cognitive assistant. 
Your task is to analyze a user's committed decision, their expected success metric, target timeline, and the historical list of progress updates.

You must output a JSON object containing exactly two keys:
1. "summary": A concise 1-2 sentence summary explaining what the decision is and how it has progressed so far.
2. "insight": A highly specific, practical, and proactive "JARVIS Insight". It must give a concrete next-step action or recommendation based on the progress updates, success metric, and target timeline. Avoid generic advice (e.g. do not just say "keep tracking" or "stay focused"). Give actionable specifics.

Respond ONLY in this JSON format:
{
  "summary": "What the decision is and summary of progression",
  "insight": "Highly specific next progress tip, recommendation, or tactic"
}`,
            },
            {
              role: 'user',
              content: `Decision: "${decision.title}"
Expected Success Metric: "${decision.successMetric}"
Target Deadline: ${new Date(decision.expectedOutcomeDate).toLocaleDateString()}
Current Progress updates logged so far:
${progressLogsText}`,
            },
          ],
        });

        const raw = response.choices[0]?.message?.content;
        if (raw) {
          const parsed = JSON.parse(raw);
          summaryText = parsed.summary || summaryText;
          jarvisInsightText = parsed.insight || jarvisInsightText;
        }
      } catch (err: any) {
        console.error('Groq decision progress analysis failed:', err.message || err);
      }
    }

    const insightPayload = {
      summary: summaryText,
      insight: jarvisInsightText,
      updatedAt: Date.now(),
    };

    const insightJson = JSON.stringify(insightPayload);

    // 5. Save the insight back to the decision card
    await db
      .update(decisions)
      .set({ evolutionInsight: insightJson })
      .where(eq(decisions.id, decisionId));

    return NextResponse.json({
      success: true,
      evolutionInsight: insightPayload,
      logs: allLogs,
    });
  } catch (error: any) {
    console.error('Error recording decision progress:', error);
    return NextResponse.json(
      { error: 'server_error', message: error.message || 'Internal server error while saving progress log' },
      { status: 500 }
    );
  }
}
