import { NextResponse } from 'next/server';
import { db } from '@/db';
import { thoughts, relationships, decisions, actionItems } from '@/db/schema';
import { getSessionUser } from '@/lib/auth';
import { eq, and, like, desc, or, ne } from 'drizzle-orm';
import { analyzeThought, getEmbedding, transcribeAudio } from '@/lib/groq';
import crypto from 'crypto';
import { processThoughtPKG } from '@/lib/pkg';
import { createDecisionFromThought } from '@/lib/decisions';

// Cosine similarity utility
function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length) return 0;
  let dotProduct = 0.0;
  let normA = 0.0;
  let normB = 0.0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

// GET /api/thoughts - Search, filter, and list user's thoughts
export async function GET(request: Request) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'unauthorized', message: 'Unauthorized access' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search')?.trim();
    const category = searchParams.get('category');

    const conditions = [eq(thoughts.userId, user.id)];

    if (search) {
      conditions.push(
        or(
          like(thoughts.content, `%${search}%`),
          like(thoughts.summary, `%${search}%`),
          like(thoughts.tags, `%${search}%`)
        ) as any
      );
    }

    if (category && category !== 'all') {
      conditions.push(eq(thoughts.category, category));
    }

    // Retrieve thoughts
    const userThoughts = await db.query.thoughts.findMany({
      where: and(...conditions),
      orderBy: desc(thoughts.createdAt),
    });

    // Retrieve all decisions to map tracking states
    const userDecisions = await db.query.decisions.findMany({
      where: eq(decisions.userId, user.id),
    });

    // Retrieve all action items to map action lists
    const userActionItems = await db.query.actionItems.findMany({
      where: eq(actionItems.userId, user.id),
    });

    // Retrieve all relationships for this user's thoughts to map connections
    const userRelations = await db
      .select({
        id: relationships.id,
        thoughtId1: relationships.thoughtId1,
        thoughtId2: relationships.thoughtId2,
        score: relationships.score,
      })
      .from(relationships)
      .innerJoin(thoughts, eq(relationships.thoughtId1, thoughts.id))
      .where(eq(thoughts.userId, user.id));

    // Map relations, decisions, and action items to their respective thoughts
    const thoughtsWithRelations = userThoughts.map((t) => {
      // Find all connected thought IDs
      const connections = userRelations
        .filter((r) => r.thoughtId1 === t.id || r.thoughtId2 === t.id)
        .map((r) => {
          const connectedId = r.thoughtId1 === t.id ? r.thoughtId2 : r.thoughtId1;
          const connectedThought = userThoughts.find((ut) => ut.id === connectedId);
          return {
            relationshipId: r.id,
            thoughtId: connectedId,
            summary: connectedThought?.summary || 'Connected Thought',
            category: connectedThought?.category || 'Idea',
            score: r.score,
          };
        });

      const associatedDecisions = userDecisions.filter((d) => d.thoughtId === t.id);
      const decisionRecord = associatedDecisions[0] || null;
      const associatedActions = userActionItems.filter((item) => item.thoughtId === t.id);

      return {
        ...t,
        tags: JSON.parse(t.tags) as string[],
        suggestedTasks: t.suggestedTasks ? (JSON.parse(t.suggestedTasks) as any[]) : [],
        connections,
        decision: decisionRecord,
        decisions: associatedDecisions,
        actionItems: associatedActions,
      };
    });

    return NextResponse.json({ thoughts: thoughtsWithRelations });
  } catch (error) {
    console.error('Error fetching thoughts:', error);
    return NextResponse.json(
      { error: 'server_error', message: 'Internal server error while fetching thoughts' },
      { status: 500 }
    );
  }
}

// POST /api/thoughts - Process text or audio capture and run analysis
export async function POST(request: Request) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'unauthorized', message: 'Unauthorized access' }, { status: 401 });
    }

    let content = '';
    let customCategories: string[] | undefined;
    let customTags: string[] | undefined;
    let customPriorities: string[] | undefined;
    let customStatuses: string[] | undefined;
    const contentType = request.headers.get('content-type') || '';

    if (contentType.includes('application/json')) {
      const body = await request.json();
      content = body.content?.trim();
      customCategories = body.customCategories;
      customTags = body.customTags;
      customPriorities = body.customPriorities;
      customStatuses = body.customStatuses;
    } else if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const textContent = formData.get('content') as string;
      const audioFile = formData.get('audio') as File;

      const catsVal = formData.get('customCategories') as string;
      const tagsVal = formData.get('customTags') as string;
      const priVal = formData.get('customPriorities') as string;
      const statVal = formData.get('customStatuses') as string;
      
      if (catsVal) customCategories = JSON.parse(catsVal);
      if (tagsVal) customTags = JSON.parse(tagsVal);
      if (priVal) customPriorities = JSON.parse(priVal);
      if (statVal) customStatuses = JSON.parse(statVal);

      if (audioFile) {
        // Read file data into Buffer for inline transmission to Groq API
        const arrayBuffer = await audioFile.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        
        console.log(`Transcribing audio file: size=${buffer.length} bytes, type=${audioFile.type}`);
        
        // Use client-side transcript if Groq key is missing
        const isOfflineDemo = !process.env.GROQ_API_KEY || process.env.GROQ_API_KEY === 'placeholder_replace_with_actual_key';
        if (isOfflineDemo && textContent) {
          content = textContent.trim();
        } else {
          content = await transcribeAudio(buffer, audioFile.type);
        }
      } else if (textContent) {
        content = textContent.trim();
      }
    }

    if (!content) {
      return NextResponse.json(
        { error: 'bad_request', message: 'Thought content is required' },
        { status: 400 }
      );
    }

    console.log('Initiating AI analysis pipeline for thought content with custom constraints...');
    // 1. Run AI pipelines in parallel (Analysis & Embeddings)
    const [analysis, embedding] = await Promise.all([
      analyzeThought(content, user.name ?? undefined, customCategories, customTags, customPriorities, customStatuses),
      getEmbedding(content),
    ]);

    const newThoughtId = crypto.randomUUID();

    // 2. Save new thought
    await db.insert(thoughts).values({
      id: newThoughtId,
      userId: user.id,
      content,
      summary: analysis.summary,
      category: analysis.category,
      sentiment: analysis.sentiment,
      tags: JSON.stringify(analysis.tags),
      embedding: JSON.stringify(embedding),
      jarvisInsight: analysis.jarvisInsight,
      suggestedTasks: JSON.stringify(analysis.actionItems || []),
      createdAt: Date.now(),
    });

    // 3. Find relationships using Cosine Similarity against past thoughts
    const previousThoughts = await db.query.thoughts.findMany({
      where: and(eq(thoughts.userId, user.id), ne(thoughts.id, newThoughtId)),
    });

    const SIMILARITY_THRESHOLD = 0.70; // Cut-off score for linking thoughts
    const newConnections = [];

    for (const oldThought of previousThoughts) {
      try {
        const oldEmbedding = JSON.parse(oldThought.embedding) as number[];
        const score = cosineSimilarity(embedding, oldEmbedding);

        if (score >= SIMILARITY_THRESHOLD) {
          const relationId = crypto.randomUUID();
          await db.insert(relationships).values({
            id: relationId,
            thoughtId1: newThoughtId,
            thoughtId2: oldThought.id,
            score,
            createdAt: Date.now(),
          });

          newConnections.push({
            relationshipId: relationId,
            thoughtId: oldThought.id,
            summary: oldThought.summary,
            category: oldThought.category,
            score,
          });
        }
      } catch (err) {
        console.error(`Failed to compute similarity with thought ID ${oldThought.id}:`, err);
      }
    }

    // Trigger Slow Path PKG extraction & relationship mappings in background
    processThoughtPKG(newThoughtId, user.id).catch((err) => {
      console.error('[PKG Ingestion Hook] Background extraction error:', err);
    });

    // Trigger Slow Path decision auto-capture if AI is highly confident
    if (analysis.isDecision && analysis.decisionConfidence >= 0.75) {
      createDecisionFromThought(newThoughtId, user.id).catch((err) => {
        console.error('[Decision Hook] Auto-capture error:', err);
      });
    }

    return NextResponse.json({
      success: true,
      thought: {
        id: newThoughtId,
        content,
        summary: analysis.summary,
        category: analysis.category,
        sentiment: analysis.sentiment,
        tags: analysis.tags,
        jarvisInsight: analysis.jarvisInsight,
        suggestedTasks: analysis.actionItems || [],
        actionItems: [],
        connections: newConnections,
        createdAt: Date.now(),
        isDecision: analysis.isDecision ?? false,
        decisionConfidence: analysis.decisionConfidence ?? 0,
      },
    });
  } catch (error: any) {
    console.error('Error processing thought entry:', error);
    return NextResponse.json(
      { error: 'server_error', message: error.message || 'Internal server error while processing thought' },
      { status: 500 }
    );
  }
}
