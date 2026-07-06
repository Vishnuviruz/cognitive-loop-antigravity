import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { ai } from '@/lib/groq';

export async function POST(request: Request) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'unauthorized', message: 'Unauthorized access' }, { status: 401 });
    }

    const { title, description, category, excludeSubTasks } = await request.json();

    if (!title) {
      return NextResponse.json({ error: 'bad_request', message: 'Task title is required' }, { status: 400 });
    }

    // Default fallback breakdown in case Groq is offline/missing
    const isOfflineDemo = !process.env.GROQ_API_KEY || process.env.GROQ_API_KEY === 'placeholder_replace_with_actual_key';
    if (isOfflineDemo || !ai) {
      // Dynamic fallback rotation
      const fallbackSubs = [
        "Define requirements checklist",
        "Create local development branch",
        "Conduct initial testing and peer review",
        "Optimize performance variables",
        "Write integration test assertions",
        "Review database query profiling"
      ];
      const filteredSubs = fallbackSubs.filter(s => !(excludeSubTasks || []).includes(s)).slice(0, 3);
      
      return NextResponse.json({
        summary: `Action plan regarding: "${title}". This task falls under category "${category || 'General'}".`,
        actionPlan: [
          "Understand current technical specifications and constraints.",
          "Identify and map required integrations, libraries, and frameworks.",
          "Perform testing and log results to ensure performance is maintained."
        ],
        references: [
          `Search web for: "Best practices on ${title}"`,
          `Check developer documentation regarding ${category || 'General'} engineering workflows.`
        ],
        subTasks: filteredSubs
      });
    }

    const response = await ai.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: `You are an expert technical advisor and personal efficiency consultant. Analyze the task title, description, and category. Generate:
1. A concise 1-sentence AI Summary of what this task aims to achieve.
2. A list of 3 highly personalized, actionable steps under "actionPlan" describing how to complete this task efficiently.
3. A list of 2 helpful developer references or web query recommendations under "references" (e.g. "Check Next.js documentation for route handlers", or "MDN Web Docs regarding CSS backdrop-filters").
4. A list of 3 recommended concrete checklists or sub-tasks under "subTasks".

CRITICAL CONSTRAINT:
Do NOT suggest any sub-tasks similar to the following list: ${JSON.stringify(excludeSubTasks || [])}. Generate new, alternative sub-tasks instead.

You must respond with a JSON object matching this structure:
{
  "summary": "1-sentence summary",
  "actionPlan": ["step 1", "step 2", "step 3"],
  "references": ["reference 1", "reference 2"],
  "subTasks": ["subtask 1", "subtask 2", "subtask 3"]
}`
        },
        {
          role: 'user',
          content: `Task Details:
Title: "${title}"
Description: "${description || 'No description provided'}"
Category: "${category || 'General'}"`
        }
      ]
    });

    const resultText = response.choices[0]?.message?.content;
    if (!resultText) {
      throw new Error('Empty response from Groq task breakdown pipeline');
    }

    return NextResponse.json(JSON.parse(resultText));
  } catch (error: any) {
    console.error('Error generating task breakdown:', error);
    return NextResponse.json(
      { error: 'server_error', message: error.message || 'Internal server error while generating task breakdown' },
      { status: 500 }
    );
  }
}
