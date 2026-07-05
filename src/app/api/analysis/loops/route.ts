import { NextResponse } from 'next/server';
import { db } from '@/db';
import { thoughts, loops } from '@/db/schema';
import { getSessionUser } from '@/lib/auth';
import { eq, desc } from 'drizzle-orm';
import { detectLoops } from '@/lib/groq';
import crypto from 'crypto';

// GET /api/analysis/loops - Retrieve detected loops from database
export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'unauthorized', message: 'Unauthorized access' }, { status: 401 });
    }

    let storedLoops = await db.query.loops.findMany({
      where: eq(loops.userId, user.id),
      orderBy: desc(loops.createdAt),
    });

    // If no loops are stored yet, try to auto-calculate once if user has thoughts
    if (storedLoops.length === 0) {
      const userThoughts = await db.query.thoughts.findMany({
        where: eq(thoughts.userId, user.id),
        orderBy: desc(thoughts.createdAt),
        limit: 50,
      });

      if (userThoughts.length >= 3) {
        console.log(`Auto-triggering loop detection for user: ${user.email}`);
        const detected = await detectLoops(
          userThoughts.map((t) => ({ id: t.id, content: t.content, createdAt: t.createdAt }))
        );

        if (detected.length > 0) {
          const insertData = detected.map((l) => ({
            id: crypto.randomUUID(),
            userId: user.id,
            theme: l.theme,
            description: l.description,
            thoughtIds: JSON.stringify(l.thoughtIds),
            createdAt: Date.now(),
          }));

          await db.insert(loops).values(insertData);
        } else {
          // Store a system marker loop to cache the "no loops detected" state and avoid hitting rate limits
          await db.insert(loops).values({
            id: crypto.randomUUID(),
            userId: user.id,
            theme: '__system_no_loops__',
            description: 'No loops detected yet',
            thoughtIds: JSON.stringify([]),
            createdAt: Date.now(),
          });
        }
        
        // Refetch stored loops (either actual ones or the marker)
        storedLoops = await db.query.loops.findMany({
          where: eq(loops.userId, user.id),
          orderBy: desc(loops.createdAt),
        });
      }
    }

    const formattedLoops = storedLoops
      .filter((l) => l.theme !== '__system_no_loops__')
      .map((l) => ({
        ...l,
        thoughtIds: JSON.parse(l.thoughtIds) as string[],
      }));

    return NextResponse.json({ loops: formattedLoops });
  } catch (error) {
    console.error('Error fetching loops:', error);
    return NextResponse.json(
      { error: 'server_error', message: 'Internal server error while fetching loops' },
      { status: 500 }
    );
  }
}

// POST /api/analysis/loops - Force recalculate cognitive loops using Groq
export async function POST() {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'unauthorized', message: 'Unauthorized access' }, { status: 401 });
    }

    const userThoughts = await db.query.thoughts.findMany({
      where: eq(thoughts.userId, user.id),
      orderBy: desc(thoughts.createdAt),
      limit: 60, // Last 60 thoughts to analyze loops
    });

    if (userThoughts.length < 3) {
      return NextResponse.json({
        loops: [],
        message: 'Add at least 3 thoughts to detect cognitive loops and repeating patterns.',
      });
    }

    console.log(`Calculating cognitive loops for user: ${user.email}`);
    const detected = await detectLoops(
      userThoughts.map((t) => ({ id: t.id, content: t.content, createdAt: t.createdAt }))
    );

    // Wipe previous loops for this user to store fresh ones
    await db.delete(loops).where(eq(loops.userId, user.id));

    if (detected.length > 0) {
      const insertData = detected.map((l) => ({
        id: crypto.randomUUID(),
        userId: user.id,
        theme: l.theme,
        description: l.description,
        thoughtIds: JSON.stringify(l.thoughtIds),
        createdAt: Date.now(),
      }));

      await db.insert(loops).values(insertData);
    } else {
      // Store a system marker loop to cache the "no loops detected" state and avoid hitting rate limits
      await db.insert(loops).values({
        id: crypto.randomUUID(),
        userId: user.id,
        theme: '__system_no_loops__',
        description: 'No loops detected yet',
        thoughtIds: JSON.stringify([]),
        createdAt: Date.now(),
      });
    }

    const updatedLoops = await db.query.loops.findMany({
      where: eq(loops.userId, user.id),
      orderBy: desc(loops.createdAt),
    });

    const formattedLoops = updatedLoops
      .filter((l) => l.theme !== '__system_no_loops__')
      .map((l) => ({
        ...l,
        thoughtIds: JSON.parse(l.thoughtIds) as string[],
      }));

    return NextResponse.json({ loops: formattedLoops });
  } catch (error: any) {
    console.error('Error recalculating loops:', error);
    return NextResponse.json(
      { error: 'server_error', message: error.message || 'Internal server error while calculating loops' },
      { status: 500 }
    );
  }
}
