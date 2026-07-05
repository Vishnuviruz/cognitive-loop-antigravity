import { NextResponse } from 'next/server';
import { db } from '@/db';
import { thoughts, relationships } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { getSessionUser } from '@/lib/auth';
import { ai } from '@/lib/groq';

export async function POST(request: Request) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'unauthorized', message: 'Unauthorized access' }, { status: 401 });
    }

    const body = await request.json();
    const { parentId, childId } = body;

    if (!parentId) {
      return NextResponse.json({ error: 'bad_request', message: 'parentId is required' }, { status: 400 });
    }

    // 1. Fetch parent thought
    const parentThought = await db.query.thoughts.findFirst({
      where: and(eq(thoughts.id, parentId), eq(thoughts.userId, user.id)),
    });

    if (!parentThought) {
      return NextResponse.json({ error: 'not_found', message: 'Parent thought not found' }, { status: 404 });
    }

    // Fetch all user thoughts and relationships to rebuild connections mapping
    const thoughtsList = await db.query.thoughts.findMany({
      where: eq(thoughts.userId, user.id),
    });

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

    const connections = userRelations
      .filter((r) => r.thoughtId1 === parentThought.id || r.thoughtId2 === parentThought.id)
      .map((r) => {
        const connectedId = r.thoughtId1 === parentThought.id ? r.thoughtId2 : r.thoughtId1;
        const connectedThought = thoughtsList.find((ut) => ut.id === connectedId);
        return {
          relationshipId: r.id,
          thoughtId: connectedId,
          summary: connectedThought?.summary || 'Connected Thought',
          category: connectedThought?.category || 'Idea',
          content: connectedThought?.content || '',
          score: r.score,
        };
      })
      .filter((c) => c.content !== '');

    // 2. State B: Selected Child Detailed Connection Analysis
    if (childId) {
      const childThought = thoughtsList.find(t => t.id === childId);
      if (!childThought) {
        return NextResponse.json({ error: 'not_found', message: 'Child thought not found' }, { status: 404 });
      }

      if (!ai) {
        // Fallback for keyless offline mode
        return NextResponse.json({
          connection: "A validation anchor representing first-hand personal friction.",
          how: `It serves as the first user story for your SaaS. You are solving your own budget management issues, creating an immediate test audience of one.`,
          why: "SaaS products find success by solving high-pain problems. Struggling with cash flow validates the demand for automated tracking.",
          outcome: "You develop a financial tracker that resolves your own cash flow issues while serving as the validation prototype for the SaaS.",
          actionPlan: "Draft a task to list your exact transactional sources and describe how they should be parsed."
        });
      }

      const response = await ai.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content: `You are JARVIS, an advanced, highly loyal, and intelligent AI personal assistant. Your job is to analyze the relationship between a parent thought and a child thought.
Analyze their contents and write a deeply specific, custom, and highly valuable connection analysis. Avoid generic or robotic summaries. Address the user directly in the second person ("you", "your").
You must respond with a JSON object matching this structure:
{
  "connection": "What is the core connection? (A short, specific phrase or sentence, e.g. 'A validation anchor representing first-hand personal friction' or 'An opportunity to consolidate fragmented tools').",
  "how": "Explain exactly HOW these thoughts connect. (Be specific to their text, detail how one translates into or supports the other).",
  "why": "Explain WHY this connection is valuable or exists. (Discuss the strategic alignment, the target user pain, or code validation advantages).",
  "outcome": "Explain what is the potential outcome of combining these thoughts. (E.g. A scalable SaaS business or a cost-saving tracker MVP).",
  "actionPlan": "Provide a clear, concrete, and highly actionable next step or strategy (e.g. 'Draft wireframes for GPay and IndMoney dashboard consolidation')."
}`
          },
          {
            role: 'user',
            content: `Parent Thought [Category: ${parentThought.category}]:
Summary: "${parentThought.summary}"
Description: "${parentThought.content}"

Child Thought [Category: ${childThought.category}]:
Summary: "${childThought.summary}"
Description: "${childThought.content}"`
          }
        ]
      });

      const resultText = response.choices[0]?.message?.content;
      if (!resultText) {
        throw new Error('Empty response from Groq connection analysis pipeline');
      }

      return NextResponse.json(JSON.parse(resultText));
    }

    // 3. State A: Consolidated Connection Summary for all children
    if (!ai) {
      // Fallback for keyless offline mode
      return NextResponse.json({
        header: "You want to create a SaaS product and you address there are issues in managing finance, wealth creation, and tracking tools.",
        detail: "Why can't we build a product that provides a solution for this? Like an all-in-one app to track, plan, analyze, create, and get personalized advice for finance and wealth management."
      });
    }

    const childrenPrompt = connections.map((c, idx: number) => {
      return `Child ${idx + 1} [Category: ${c.category}]:\nSummary: "${c.summary}"\nDescription: "${c.content}"`;
    }).join('\n\n');

    const response = await ai.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: `You are JARVIS, an advanced, highly loyal, and intelligent AI personal assistant. Your job is to analyze a parent focus thought and the list of all its connected child thoughts, and synthesize a consolidated connection overview.
Analyze their contents and write a deeply specific, custom, and highly valuable connection synthesis. Do NOT repeat or restate the raw summaries back verbatim; instead, connect the dots dynamically and pitch a unified concept, solution, or insight.
Address the user directly in the second person ("you", "your").
You must respond with a JSON object matching this structure:
{
  "header": "A short 1-2 sentence header explaining the overall connection opportunity or relation. Be extremely specific to the inputs (e.g. 'You want to build a SaaS product, and you have identified personal and market challenges in finance.').",
  "detail": "A detailed paragraph offering deep, strategic, and highly valuable advice on how all these thoughts connect to form a bigger picture. Focus on actionability, synergy, and next steps."
}`
        },
        {
          role: 'user',
          content: `Parent Thought [Category: ${parentThought.category}]:
Summary: "${parentThought.summary}"
Description: "${parentThought.content}"

Connected Child Thoughts:
${childrenPrompt}`
        }
      ]
    });

    const resultText = response.choices[0]?.message?.content;
    if (!resultText) {
      throw new Error('Empty response from Groq consolidated connection synthesis pipeline');
    }

    return NextResponse.json(JSON.parse(resultText));

  } catch (error: any) {
    console.error('Error in /api/relationships/synthesis:', error);
    return NextResponse.json(
      { error: 'server_error', message: 'Internal server error while generating connection synthesis' },
      { status: 500 }
    );
  }
}
