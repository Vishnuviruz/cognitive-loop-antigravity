import { NextResponse } from 'next/server';
import { db } from '@/db';
import { thoughts, chatMessages } from '@/db/schema';
import { getSessionUser } from '@/lib/auth';
import { eq } from 'drizzle-orm';
import { getEmbedding, generateChatResponse } from '@/lib/groq';
import crypto from 'crypto';

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

export async function POST(request: Request) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'unauthorized', message: 'Unauthorized access' }, { status: 401 });
    }

    const { message, history = [] } = await request.json();

    if (!message || message.trim() === '') {
      return NextResponse.json({ error: 'bad_request', message: 'Message is required' }, { status: 400 });
    }

    console.log(`Processing chat query for user ${user.email}: "${message}"`);

    // 1. Save the user's message to the database
    await db.insert(chatMessages).values({
      id: crypto.randomUUID(),
      userId: user.id,
      role: 'user',
      content: message.trim(),
      contextUsed: null,
      createdAt: Date.now(),
    });

    // 2. Generate embedding for user's question to perform local semantic search (RAG)
    const questionEmbedding = await getEmbedding(message);

    // 3. Fetch all user thoughts to find relevant context
    const allThoughts = await db.query.thoughts.findMany({
      where: eq(thoughts.userId, user.id),
    });

    const matches: Array<{ thought: typeof thoughts.$inferSelect; score: number }> = [];
    const CONTEXT_SIMILARITY_THRESHOLD = 0.50; // Moderate threshold to capture relevant context

    for (const t of allThoughts) {
      try {
        const oldEmbedding = JSON.parse(t.embedding) as number[];
        const score = cosineSimilarity(questionEmbedding, oldEmbedding);

        if (score >= CONTEXT_SIMILARITY_THRESHOLD) {
          matches.push({ thought: t, score });
        }
      } catch (err) {
        console.error('Error parsing embedding for search:', t.id, err);
      }
    }

    // Sort matches descending by similarity score, and take top 10 thoughts
    matches.sort((a, b) => b.score - a.score);
    const topMatches = matches.slice(0, 10);
    const contextThoughts = topMatches.map((m) => m.thought);

    console.log(`RAG context search found ${contextThoughts.length} matching thoughts.`);

    // 4. Generate response using Groq loaded with relevant thoughts as grounding context
    const chatHistoryPayload = history.map((item: any) => ({
      role: item.role === 'user' ? ('user' as const) : ('model' as const),
      parts: Array.isArray(item.parts) ? item.parts : [item.parts || ''],
    }));

    const responseText = await generateChatResponse(message, contextThoughts, chatHistoryPayload, user.name ?? undefined);

    // 5. Build context used payload
    const contextUsed = topMatches.map((m) => ({
      id: m.thought.id,
      summary: m.thought.summary,
      category: m.thought.category,
      score: m.score,
      createdAt: m.thought.createdAt,
    }));

    // 6. Save the model's response to the database
    await db.insert(chatMessages).values({
      id: crypto.randomUUID(),
      userId: user.id,
      role: 'model',
      content: responseText,
      contextUsed: JSON.stringify(contextUsed),
      createdAt: Date.now(),
    });

    return NextResponse.json({
      text: responseText,
      contextUsed,
    });
  } catch (error: any) {
    console.error('Companion Chat error:', error);
    return NextResponse.json(
      { error: 'server_error', message: error.message || 'Internal server error while processing chat' },
      { status: 500 }
    );
  }
}
