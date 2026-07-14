import { NextResponse } from 'next/server';
import { db } from '@/db';
import { lessons, decisions, thoughts, entities, decisionProgressLogs } from '@/db/schema';
import { getSessionUser } from '@/lib/auth';
import { eq, desc, asc } from 'drizzle-orm';

// GET /api/lessons - Fetch all extracted lessons for the logged-in user
export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'unauthorized', message: 'Unauthorized access' }, { status: 401 });
    }

    // Fetch lessons with their associated decision and entity context
    const rawLessons = await db
      .select({
        id: lessons.id,
        lesson: lessons.lesson,
        isSuccessful: lessons.isSuccessful,
        createdAt: lessons.createdAt,
        decisionId: lessons.decisionId,
        entityId: lessons.entityId,
        decisionTitle: decisions.title,
        outcomeNotes: decisions.outcomeNotes,
        finalSynthesis: decisions.finalSynthesis,
        successMetric: decisions.successMetric,
        decisionStatus: decisions.status,
        thoughtSummary: thoughts.summary,
        entityName: entities.name,
        entityType: entities.type,
      })
      .from(lessons)
      .leftJoin(decisions, eq(lessons.decisionId, decisions.id))
      .leftJoin(thoughts, eq(decisions.thoughtId, thoughts.id))
      .leftJoin(entities, eq(lessons.entityId, entities.id))
      .where(eq(lessons.userId, user.id))
      .orderBy(desc(lessons.createdAt));

    // Fetch related progress logs for all decisions linked to lessons
    const userLessons = await Promise.all(
      rawLessons.map(async (l) => {
        let logs: any[] = [];
        if (l.decisionId) {
          logs = await db.query.decisionProgressLogs.findMany({
            where: eq(decisionProgressLogs.decisionId, l.decisionId),
            orderBy: asc(decisionProgressLogs.createdAt),
          });
        }
        return {
          ...l,
          logs,
        };
      })
    );

    return NextResponse.json({ lessons: userLessons });
  } catch (error: any) {
    console.error('Error fetching lessons:', error);
    return NextResponse.json(
      { error: 'server_error', message: error.message || 'Internal server error while fetching lessons' },
      { status: 500 }
    );
  }
}
