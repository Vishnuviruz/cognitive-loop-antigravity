import OpenAI, { toFile } from 'openai';
import { searchDuckDuckGo } from './search';

// Initialize the Groq SDK client using OpenAI compatible interface
const apiKey = process.env.GROQ_API_KEY;

export const ai = apiKey && apiKey !== 'placeholder_replace_with_actual_key'
  ? new OpenAI({
      apiKey,
      baseURL: 'https://api.groq.com/openai/v1',
    })
  : null;

// Bag-of-Words Vector Space Model for offline Mock Embedding Generation
// Allows cosine similarity searches to function with high accuracy locally without third-party APIs
function generateMockEmbedding(text: string): number[] {
  const size = 768;
  const vector = new Array(size).fill(0);
  
  // Clean text and extract lowercase alphanumeric words
  const words = text.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(Boolean);
  
  if (words.length === 0) {
    // Return a random low-amplitude vector if no words are found
    return new Array(size).fill(0).map(() => Math.random() * 0.05);
  }

  for (const word of words) {
    // Generate a simple hash value for each word
    let hash = 0;
    for (let i = 0; i < word.length; i++) {
      hash = word.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    // Set 3 pseudo-random indices to 1.0 based on the word hash
    for (let j = 0; j < 3; j++) {
      const idx = Math.abs((hash + j * 997) % size);
      vector[idx] += 1.0;
    }
  }

  // Normalize the vector (L2 normalization)
  let sumSquares = 0;
  for (let i = 0; i < size; i++) {
    sumSquares += vector[i] * vector[i];
  }
  const norm = Math.sqrt(sumSquares);
  
  if (norm > 0) {
    for (let i = 0; i < size; i++) {
      vector[i] = vector[i] / norm;
    }
  }
  
  return vector;
}

export async function transcribeAudio(audioBuffer: Buffer, mimeType: string): Promise<string> {
  // Offline Demo Mode fallback
  if (!ai) {
    console.log('⚠️ Running transcribeAudio in Offline Demo Mode.');
    const demoTranscripts = [
      'This is a recorded voice thought about designing a premium web app for founders. I think voice note capture is the key feature to build.',
      'Thinking about how the cognitive loop detection fits in. If I log stress levels three times, the system should flag a concern loop and offer action items.',
      'Exploring some technical stack adjustments. SQLite with Drizzle ORM works beautifully because it runs 100% locally and requires zero server configuration.',
      'We need to make sure the vector embedding search maps thoughts correctly. A local cosine similarity engine in Node.js works surprisingly well.'
    ];
    return demoTranscripts[Math.floor(Math.random() * demoTranscripts.length)];
  }

  try {
    // Convert Buffer to File using OpenAI SDK helper
    const file = await toFile(audioBuffer, 'recording.webm', { type: mimeType });
    
    const response = await ai.audio.transcriptions.create({
      file,
      model: 'whisper-large-v3',
      prompt: 'Transcribe this voice thought verbatim. Clean up stutters, filler words ("um", "ah"), or noise, but keep core meaning intact.',
    });

    return response.text || '';
  } catch (err: any) {
    console.error('Error during Groq audio transcription:', err.message || err);
    throw err;
  }
}

export interface ActionItemExtract {
  title: string;
  description: string;
  priority: string;
}

export interface ThoughtAnalysis {
  summary: string;
  tags: string[];
  category: string;
  sentiment: 'Positive' | 'Neutral' | 'Negative';
  jarvisInsight: string;
  actionItems: ActionItemExtract[];
}

export async function analyzeThought(
  text: string, 
  userName?: string,
  customCategories?: string[],
  customTags?: string[],
  customPriorities?: string[],
  customStatuses?: string[]
): Promise<ThoughtAnalysis> {
  const name = userName && userName !== 'Demo Explorer' ? userName : 'Vishnu';

  const categoriesList = customCategories && customCategories.length > 0 
    ? customCategories 
    : ['Idea', 'Goal', 'Reflection', 'Learning', 'Decision', 'Problem', 'Opportunity'];
    
  const tagsList = customTags && customTags.length > 0 
    ? customTags 
    : ['saas', 'ai', 'notes', 'second-brain', 'engineering', 'database', 'ux', 'mobile', 'web', 'productivity', 'coaching'];

  const prioritiesList = customPriorities && customPriorities.length > 0
    ? customPriorities.map(p => p.toLowerCase())
    : ['high', 'medium', 'low'];

  // Offline Demo Mode fallback
  if (!ai) {
    console.log('⚠️ Running analyzeThought in Offline Demo Mode.');
    const lower = text.toLowerCase();
    
    // Categorize based on keywords
    let category = categoriesList[0];
    for (const cat of categoriesList) {
      if (lower.includes(cat.toLowerCase())) {
        category = cat;
        break;
      }
    }

    // Sentiment based on keywords
    let sentiment: 'Positive' | 'Neutral' | 'Negative' = 'Neutral';
    if (lower.includes('happy') || lower.includes('excited') || lower.includes('love') || lower.includes('good') || lower.includes('great') || lower.includes('success')) sentiment = 'Positive';
    else if (lower.includes('sad') || lower.includes('worry') || lower.includes('concern') || lower.includes('bad') || lower.includes('fail') || lower.includes('friction')) sentiment = 'Negative';

    // Extract tags
    const matched = tagsList.filter((word) => lower.includes(word.toLowerCase()));
    if (matched.length === 0) {
      matched.push(tagsList[0] || 'general');
    }
    const tags = matched.slice(0, 4);

    // Create Summary
    const words = text.replace(/[^\w\s]/g, '').trim().split(/\s+/);
    const excerpt = words.slice(0, 10).join(' ') + (words.length > 10 ? '...' : '');
    const summary = `You reflected on: "${excerpt}"`;

    // Create Jarvis Insight
    const jarvisInsight = `I have logged this in your local memory index, ${name}. Once you connect me to the live Groq API, I will run real-time web research to provide strategic recommendations.`;

    // Extract demo action items based on category
    const actionItems: ActionItemExtract[] = [];
    const pVal = prioritiesList.includes('high') ? 'high' : prioritiesList[0] || 'medium';
    
    if (category.toLowerCase() === 'idea') {
      actionItems.push({ title: 'Validate this idea with market research', description: 'Research competitors and target audience for this concept.', priority: pVal });
    } else if (category.toLowerCase() === 'goal') {
      actionItems.push({ title: 'Break this goal into milestones', description: 'Define measurable checkpoints to track progress.', priority: pVal });
    } else {
      actionItems.push({ title: 'Review thought implications', description: 'Detail action steps matching this workspace log.', priority: pVal });
    }

    return {
      summary,
      tags,
      category,
      sentiment,
      jarvisInsight,
      actionItems,
    };
  }

  try {
    const response = await ai.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: `You are JARVIS / F.R.I.D.A.Y., the advanced and deeply loyal AI personal assistant. Analyze the user thought and extract its core summary, relevant tags, classification category, overall sentiment, generate a proactive JARVIS Insight, and extract concrete action items.
           
Address the user directly by their first name: "${name}". Do NOT use generic honorifics like "Sir".

CRITICAL CONSTRAINTS:
1. Category: You MUST select the thought category from the following user-configured list ONLY: ${JSON.stringify(categoriesList)}. Do not select any category outside this list.
2. Tags: You MUST select tags from the following user-configured list ONLY: ${JSON.stringify(tagsList)}. Select between 1 to 5 tags from this list that represent the thought. If none fit perfectly, return an empty tags array [].
3. Action Item Priority: For any extracted action items, you MUST select the priority level from the following user-configured list ONLY: ${JSON.stringify(prioritiesList)}.

You must respond with a JSON object matching this structure:
{
  "summary": "Concise summary of the thought written in the second person, addressing the user directly (e.g. \\"You outlined a plan to build...\\" or \\"You expressed a decision to...\\"). Never use third person like \\"the user\\".",
  "tags": ["extracted tags from the configured tags list only"],
  "category": "One category from the configured categories list only",
  "sentiment": "One of: 'Positive', 'Neutral', 'Negative'",
  "jarvisInsight": "A proactive recommendation, design question, technical standard, or business insight related to this thought. You must act as a world-class multi-disciplinary expert (e.g. software architect, venture capitalist, neuroscientist) depending on the thought topic. Address the user directly by their first name (\\"${name}\\") and never use honorifics like \\"Sir\\".",
  "actionItems": [
    {
      "title": "Short, actionable task title (e.g. 'Research competitor pricing models')",
      "description": "Detailed description of what needs to be done and why.",
      "priority": "One priority level from the configured priorities list only"
    }
  ]
}

For actionItems: Extract 0 to 3 concrete, actionable tasks from the thought. If the thought is purely reflective with no clear next steps, return an empty array []. Focus on tasks that would move the needle — research, prototyping, outreach, validation, etc.`,
        },
        {
          role: 'user',
          content: `Thought to analyze:\n"${text}"`,
        },
      ],
    });

    const resultText = response.choices[0]?.message?.content;
    if (!resultText) {
      throw new Error('Empty response from Groq thought analysis pipeline');
    }

    return JSON.parse(resultText) as ThoughtAnalysis;
  } catch (err: any) {
    console.error('Error in analyzeThought Groq call:', err.message || err);
    throw err;
  }
}

export async function getEmbedding(text: string): Promise<number[]> {
  // Always use local mock embeddings for efficiency and keyless compatibility
  return generateMockEmbedding(text);
}

export interface DetectedLoop {
  theme: string;
  description: string;
  thoughtIds: string[];
}

export async function detectLoops(
  thoughts: Array<{ id: string; content: string; createdAt: number }>
): Promise<DetectedLoop[]> {
  // Offline Demo Mode fallback
  if (!ai) {
    console.log('⚠️ Running detectLoops in Offline Demo Mode.');
    if (thoughts.length < 3) return [];

    const loops: DetectedLoop[] = [];

    // Check for SaaS / ideation thoughts
    const ideationThoughts = thoughts.filter((t) => {
      const c = t.content.toLowerCase();
      return c.includes('saas') || c.includes('idea') || c.includes('product') || c.includes('build');
    });
    if (ideationThoughts.length >= 2) {
      loops.push({
        theme: 'SaaS Ideation Loop',
        description: 'You are repeatedly brainstorming product and SaaS concepts. This cycle shows high entrepreneurial energy but risks staying purely in ideation. Recommendation: Choose one simple concept, scope a 1-day MVP, and validate it immediately.',
        thoughtIds: ideationThoughts.map((t) => t.id),
      });
    }

    // Check for stress / time thoughts
    const stressThoughts = thoughts.filter((t) => {
      const c = t.content.toLowerCase();
      return c.includes('time') || c.includes('work') || c.includes('stress') || c.includes('problem') || c.includes('friction');
    });
    if (stressThoughts.length >= 2) {
      loops.push({
        theme: 'Operational Overwhelm Cycle',
        description: 'You have logged concerns about tasks, schedules, or technical bottlenecks several times. This repeats when you face developmental blocks. Action: Take a 15-minute screen break, list your top 3 issues, and time-block them.',
        thoughtIds: stressThoughts.map((t) => t.id),
      });
    }

    // Default loops if nothing matched
    if (loops.length === 0) {
      loops.push({
        theme: 'Self-Improvement Cycles',
        description: 'You are logging multiple reflections regarding your personal growth and learnings. This indicates high self-awareness. Keep writing these entries to lock down your lessons.',
        thoughtIds: thoughts.slice(0, 3).map((t) => t.id),
      });
    }

    return loops;
  }

  if (thoughts.length < 3) {
    return [];
  }

  const thoughtsPrompt = thoughts
    .map((t) => `ID: ${t.id} | Date: ${new Date(t.createdAt).toLocaleDateString()} | Thought: "${t.content}"`)
    .join('\n\n');

  try {
    const response = await ai.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: `Analyze these captured user thoughts and identify if there are any recurring cognitive loops, patterns, themes, repeated concerns, goals, or business ideas. Group thoughts that belong to the same loop pattern together. Only create a loop if there are at least 2 thoughts strongly connected in a pattern.
          
You must respond with a JSON object that has a single property "loops" containing an array of loops matching this structure:
{
  "loops": [
    {
      "theme": "A short 3-6 word title for the recurring loop/theme.",
      "description": "A detailed explanation of the pattern, explaining why these thoughts are grouped, what emotional or analytical cycle is repeating, and a potential coaching recommendation or action step.",
      "thoughtIds": ["array of thought ID strings that are part of this loop"]
    }
  ]
}`,
        },
        {
          role: 'user',
          content: `Thoughts:\n${thoughtsPrompt}`,
        },
      ],
    });

    const resultText = response.choices[0]?.message?.content;
    if (!resultText) {
      return [];
    }

    const parsed = JSON.parse(resultText);
    return (parsed.loops || []) as DetectedLoop[];
  } catch (err: any) {
    console.error('Error during Groq detectLoops call:', err.message || err);
    return [];
  }
}

export interface ReflectionResult {
  content: string;
  growthInsights: string;
}

export async function generateReflection(
  thoughts: Array<{ content: string; category: string; createdAt: number }>,
  type: 'weekly' | 'monthly',
  userName?: string
): Promise<ReflectionResult> {
  const name = userName && userName !== 'Demo Explorer' ? userName : 'Vishnu';
  
  // Offline Demo Mode fallback
  if (!ai) {
    console.log('⚠️ Running generateReflection in Offline Demo Mode.');
    const categoriesUsed = Array.from(new Set(thoughts.map((t) => t.category))).join(', ');
    
    const letter = `Hello ${name}! This is an offline reflection synthesized from your captured thoughts.

Looking back at your entries, you've engaged with several themes, specifically focusing on ${categoriesUsed || 'Reflections'}. 

You logged thoughts expressing active development targets. There is a strong undercurrent of creativity, coupled with a focus on structural efficiency. I notice you are resolving questions regarding database schemas and local state—a sign that you are moving toward concrete project execution. Keep capturing these insights!`;

    const growthInsights = `- 1. Time-box your planning phases to stay in execution mode.\n- 2. Map out a simple user-validation workflow for your SaaS ideas.\n- 3. Log a daily summary note to track emotional trends.`;

    return {
      content: letter,
      growthInsights,
    };
  }

  const thoughtsPrompt = thoughts
    .map((t) => `[${t.category}] (${new Date(t.createdAt).toLocaleDateString()}): "${t.content}"`)
    .join('\n');

  try {
    const response = await ai.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: `You are JARVIS / F.R.I.D.A.Y., the highly advanced, witty, and loyal AI personal assistant from the Iron Man universe. Your core duty is to help ${name} review, organize, and synthesize their "second brain" of captured thoughts, ideas, decisions, and reflections from the past ${type === 'weekly' ? 'week' : 'month'}.

Write a personalized, highly intelligent, and engaging reflection letter directly to ${name}.

You must respond with a JSON object matching this structure:
{
  "content": "The synthesized letter-style reflection (can use Markdown formatting like paragraphs, bolding). Address them directly by their first name: \\"${name}\\". Do NOT use generic honorifics like \\"Sir\\". Write in a warm, witty, loyal, and proactive conversational tone (e.g., \\"I noticed this week you've been putting in considerable hours on X. It is rather fascinating how you combined this with Y...\\"). Point out subtle connections, recurring themes, or shifts in focus they might have missed. Integrate your broad multi-disciplinary knowledge.",
  "growthInsights": "3 clear, highly practical, and bulleted growth recommendations or action items directly tailored to their current goals or challenges in Markdown bullet list format."
}`,
        },
        {
          role: 'user',
          content: `Thoughts for the period:\n${thoughtsPrompt}`,
        },
      ],
    });

    const resultText = response.choices[0]?.message?.content;
    if (!resultText) {
      throw new Error('Empty response from reflection generator');
    }

    return JSON.parse(resultText) as ReflectionResult;
  } catch (err: any) {
    console.error('Error during Groq generateReflection call:', err.message || err);
    throw err;
  }
}

export async function generateChatResponse(
  question: string,
  contextThoughts: Array<{ content: string; category: string; createdAt: number }>,
  chatHistory: Array<{ role: 'user' | 'model'; parts: string[] }>,
  userName?: string
): Promise<string> {
  const name = userName && userName !== 'Demo Explorer' ? userName : 'Vishnu';

  // Offline Demo Mode fallback
  if (!ai) {
    console.log('⚠️ Running generateChatResponse in Offline Demo Mode.');
    const query = question.toLowerCase();

    if (query.includes('idea') || query.includes('saas') || query.includes('startup')) {
      const ideas = contextThoughts
        .filter((t) => t.category === 'Idea')
        .map((t) => `"${t.content}"`)
        .join(', ');
      
      return `I ran a local vector search in your second brain, ${name}. You have logged several ideas, including: ${ideas || 'some product concepts'}.

Based on these entries, you are looking to build tools that lower capture friction (like voice recording with canvas visualization). How can I help you scope a roadmap for this today?`;
    }

    if (query.includes('concern') || query.includes('loop') || query.includes('pattern') || query.includes('worry')) {
      return `Scanning your recent entries reveals a pattern around development speed and schema configurations, ${name}. You tend to worry about time constraints when coding starts. I suggest setting up strict 2-hour sprints to stay focused and avoid feature creep.`;
    }

    if (query.includes('learn') || query.includes('lesson')) {
      return `In your learnings, ${name}, you noted that local-first database setups like SQLite and Drizzle ORM reduce infrastructure complexity significantly, keeping your launch cycles short.`;
    }

    const matchedTexts = contextThoughts.map((t) => `"${t.content}"`).join(', ');
    return `Hello ${name}! Since the Groq API key is not configured, I am running in Offline Demo Mode.

Based on your grounded thoughts: ${matchedTexts || 'your memory entries'}, you are exploring local productivity systems. How can I help you brainstorm this?`;
  }

  try {
    // 1. Live Web Search Grounding using DuckDuckGo
    const searchResults = await searchDuckDuckGo(question);
    const searchContext = searchResults.length > 0 
      ? searchResults.map((s, idx) => `[Search Result ${idx + 1}]: ${s}`).join('\n') 
      : 'No recent web search results found.';

    const contextStr = contextThoughts
      .map((t) => `[${t.category}] (${new Date(t.createdAt).toLocaleDateString()}): "${t.content}"`)
      .join('\n');

    // 2. Format history for standard OpenAI API
    const apiMessages: any[] = [
      {
        role: 'system',
        content: `You are JARVIS / F.R.I.D.A.Y., the advanced, deeply loyal, and witty AI personal assistant from the Iron Man universe. You have access to ${name}'s "second brain" of captured thoughts, ideas, decisions, and reflections.

Your job is to act as their personal assistant and companion. Talk to ${name} directly. 
- Address them directly by their first name: "${name}". Do NOT use generic honorifics like "Sir", "Mr.", or "Ma'am".
- Use a conversational, intelligent, witty, and highly helpful tone.
- Do NOT refer to them in the third person. Speak in the first person ("I") and refer to them in the second person ("you").
- Proactively analyze their past thoughts, make connections, and propose creative ideas. For example, if they have logged an issue about finance and an idea about an app, connect them: "Hey ${name}, you actually talked about creating a product and also shared an issue about finance. Why don't you create a finance app that solves that particular issue?"
- Refer to dates or specific details of their thoughts when answering (e.g., "Looking back at your note from yesterday...", "You mentioned...").
- Keep responses engaging but clear and structured when needed.
- Combine their private memory logs with live knowledge from the web (provided below). Adapt your persona dynamically (e.g., Software Architect, Venture Capitalist, Neuroscientist, Growth Strategist) depending on the topic they ask about.

Relevant Thoughts Context:
${contextStr}

Live Web Search Grounding Context:
${searchContext}`,
      }
    ];

    // Map conversation history
    chatHistory.forEach((h) => {
      apiMessages.push({
        role: h.role === 'model' ? 'assistant' : 'user',
        content: h.parts.join('\n'),
      });
    });

    // Append the current user query
    apiMessages.push({
      role: 'user',
      content: question,
    });

    const response = await ai.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: apiMessages,
    });

    return response.choices[0]?.message?.content || '';
  } catch (err: any) {
    console.error('Error in generateChatResponse Groq call:', err.message || err);
    throw err;
  }
}

export async function generateTaskReflection(
  title: string,
  description: string | null,
  priority: string,
  category: string,
  userName?: string
): Promise<string> {
  const name = userName && userName !== 'Demo Explorer' ? userName : 'Vishnu';
  
  if (!ai) {
    return `Hey ${name}, I have logged this "${priority}" priority "${category}" task. Let me know when you need help executing it.`;
  }
  
  try {
    const response = await ai.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'system',
          content: `You are JARVIS, an advanced and loyal AI assistant. The user just manually created a task with the following details:
Title: ${title}
Description: ${description || 'None provided'}
Priority: ${priority}
Category: ${category}

Write a short, engaging, single-sentence response addressing the user directly as "${name}". 
Acknowledge the task and provide a helpful, intelligent tip or proactive reflection.
Do not use honorifics like "Sir" or "Madam". Keep it under 25 words.`
        }
      ]
    });
    
    return response.choices[0]?.message?.content?.trim() || `Task logged successfully, ${name}.`;
  } catch (err) {
    console.error('Error generating task reflection:', err);
    return `Hey ${name}, task has been successfully captured.`;
  }
}
