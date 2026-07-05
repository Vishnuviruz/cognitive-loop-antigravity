import { NextResponse } from 'next/server';
import { db } from '@/db';
import { thoughts, reflections } from '@/db/schema';
import { getSessionUser } from '@/lib/auth';
import { eq, desc, gte, and } from 'drizzle-orm';
import { generateReflection } from '@/lib/groq';
import crypto from 'crypto';

// GET /api/analysis/reflections - Fetch stored reflections
export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'unauthorized', message: 'Unauthorized access' }, { status: 401 });
    }

    const list = await db.query.reflections.findMany({
      where: eq(reflections.userId, user.id),
      orderBy: desc(reflections.createdAt),
    });

    return NextResponse.json({ reflections: list });
  } catch (error) {
    console.error('Error fetching reflections:', error);
    return NextResponse.json(
      { error: 'server_error', message: 'Internal server error while fetching reflections' },
      { status: 500 }
    );
  }
}

// POST /api/analysis/reflections - Trigger generation of a weekly/monthly reflection
export async function POST(request: Request) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'unauthorized', message: 'Unauthorized access' }, { status: 401 });
    }

    const body = await request.json();
    const type = body.type || 'weekly'; // 'weekly' | 'monthly'

    if (type !== 'weekly' && type !== 'monthly') {
      return NextResponse.json(
        { error: 'bad_request', message: 'Reflection type must be "weekly" or "monthly"' },
        { status: 400 }
      );
    }

    const timeLimit = type === 'weekly' 
      ? Date.now() - 7 * 24 * 60 * 60 * 1000 
      : Date.now() - 30 * 24 * 60 * 60 * 1000;

    // Fetch thoughts in the timeframe
    const periodThoughts = await db.query.thoughts.findMany({
      where: and(eq(thoughts.userId, user.id), gte(thoughts.createdAt, timeLimit)),
      orderBy: desc(thoughts.createdAt),
    });

    if (periodThoughts.length < 3) {
      return NextResponse.json(
        { 
          error: 'insufficient_data', 
          message: `Add at least 3 thoughts during this ${type === 'weekly' ? 'week' : 'month'} to generate a reflection. Currently you have ${periodThoughts.length}.` 
        },
        { status: 400 }
      );
    }

    console.log(`Generating ${type} reflection for user: ${user.email}`);
    const result = await generateReflection(
      periodThoughts.map((t) => ({ content: t.content, category: t.category, createdAt: t.createdAt })),
      type,
      user.name ?? undefined
    );

    const newReflectionId = crypto.randomUUID();

    await db.insert(reflections).values({
      id: newReflectionId,
      userId: user.id,
      type,
      content: result.content,
      growthInsights: result.growthInsights,
      createdAt: Date.now(),
    });

    const newReflection = await db.query.reflections.findFirst({
      where: eq(reflections.id, newReflectionId),
    });

    return NextResponse.json({ success: true, reflection: newReflection });
  } catch (error: any) {
    console.error('Error generating reflection:', error);
    return NextResponse.json(
      { error: 'server_error', message: error.message || 'Internal server error while generating reflection' },
      { status: 500 }
    );
  }
}
