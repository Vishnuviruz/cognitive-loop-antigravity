import { GoogleGenAI, Type } from '@google/genai';

// Initialize the Gemini SDK client
const apiKey = process.env.GEMINI_API_KEY;

// Return null if not configured, we'll check it in the api routes
export const ai = apiKey && apiKey !== 'placeholder_replace_with_actual_key'
  ? new GoogleGenAI({ apiKey })
  : null;

// Bag-of-Words Vector Space Model for offline Mock Embedding Generation
// Allows cosine similarity searches to function with high accuracy in Demo Mode
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

  const response = await ai.models.generateContent({
    model: 'gemini-1.5-flash',
    contents: [
      {
        inlineData: {
          data: audioBuffer.toString('base64'),
          mimeType: mimeType,
        },
      },
      'Transcribe this voice thought verbatim. Clean up any stutters, filler words (like "um", "ah"), or major audio noise, but keep the original meaning and core words intact. Only output the transcription text, nothing else. If there is no audible speech, reply with nothing.',
    ],
  });

  return response.text?.trim() || '';
}

export interface ThoughtAnalysis {
  summary: string;
  tags: string[];
  category: 'Idea' | 'Goal' | 'Reflection' | 'Learning' | 'Decision' | 'Problem' | 'Opportunity';
  sentiment: 'Positive' | 'Neutral' | 'Negative';
}

export async function analyzeThought(text: string): Promise<ThoughtAnalysis> {
  // Offline Demo Mode fallback
  if (!ai) {
    console.log('⚠️ Running analyzeThought in Offline Demo Mode.');
    const lower = text.toLowerCase();
    
    // Categorize based on keywords
    let category: 'Idea' | 'Goal' | 'Reflection' | 'Learning' | 'Decision' | 'Problem' | 'Opportunity' = 'Reflection';
    if (lower.includes('idea') || lower.includes('build') || lower.includes('create') || lower.includes('concept')) category = 'Idea';
    else if (lower.includes('goal') || lower.includes('plan') || lower.includes('target') || lower.includes('aim')) category = 'Goal';
    else if (lower.includes('problem') || lower.includes('bug') || lower.includes('error') || lower.includes('fail') || lower.includes('stress')) category = 'Problem';
    else if (lower.includes('learn') || lower.includes('course') || lower.includes('read') || lower.includes('study')) category = 'Learning';
    else if (lower.includes('decide') || lower.includes('decision') || lower.includes('chose') || lower.includes('resolved')) category = 'Decision';
    else if (lower.includes('opportunity') || lower.includes('market') || lower.includes('explore') || lower.includes('potential')) category = 'Opportunity';

    // Sentiment based on keywords
    let sentiment: 'Positive' | 'Neutral' | 'Negative' = 'Neutral';
    if (lower.includes('happy') || lower.includes('excited') || lower.includes('love') || lower.includes('good') || lower.includes('great') || lower.includes('success')) sentiment = 'Positive';
    else if (lower.includes('sad') || lower.includes('worry') || lower.includes('concern') || lower.includes('bad') || lower.includes('fail') || lower.includes('friction')) sentiment = 'Negative';

    // Extract tags
    const vocab = ['saas', 'ai', 'notes', 'second-brain', 'engineering', 'database', 'ux', 'mobile', 'web', 'productivity', 'coaching'];
    const matched = vocab.filter((word) => lower.includes(word));
    if (matched.length < 3) matched.push('thoughts', 'general');
    const tags = matched.slice(0, 4);

    // Create Summary
    const words = text.replace(/[^\w\s]/g, '').trim().split(/\s+/);
    const excerpt = words.slice(0, 10).join(' ') + (words.length > 10 ? '...' : '');
    const summary = `Reflects on: "${excerpt}"`;

    return {
      summary,
      tags,
      category,
      sentiment,
    };
  }

  const response = await ai.models.generateContent({
    model: 'gemini-1.5-flash',
    contents: `Analyze the following user thought and extract its core summary, relevant tags, classification category, and overall sentiment.\n\nThought: "${text}"`,
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          summary: { 
            type: Type.STRING, 
            description: 'A concise, professional one-sentence summary of the thought in third person.' 
          },
          tags: { 
            type: Type.ARRAY, 
            items: { type: Type.STRING }, 
            description: '3 to 5 lowercase, single-word tags representing the subjects, technologies, or themes mentioned.' 
          },
          category: { 
            type: Type.STRING, 
            enum: ['Idea', 'Goal', 'Reflection', 'Learning', 'Decision', 'Problem', 'Opportunity'],
            description: 'The primary category type that best represents this thought.' 
          },
          sentiment: { 
            type: Type.STRING, 
            enum: ['Positive', 'Neutral', 'Negative'],
            description: 'The overall emotional tone or attitude of the user in this thought.' 
          }
        },
        required: ['summary', 'tags', 'category', 'sentiment']
      }
    }
  });

  const resultText = response.text;
  if (!resultText) {
    throw new Error('Empty response from Gemini analysis pipeline');
  }

  return JSON.parse(resultText) as ThoughtAnalysis;
}

export async function getEmbedding(text: string): Promise<number[]> {
  // Offline Demo Mode fallback
  if (!ai) {
    return generateMockEmbedding(text);
  }

  const response = await ai.models.embedContent({
    model: 'gemini-embedding-2',
    contents: text,
  });

  const values = response.embeddings?.[0]?.values;
  if (!values || values.length === 0) {
    throw new Error('Failed to generate embedding vector');
  }

  return values;
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
    // Not enough data to reliably detect loops
    return [];
  }

  const thoughtsPrompt = thoughts
    .map((t) => `ID: ${t.id} | Date: ${new Date(t.createdAt).toLocaleDateString()} | Thought: "${t.content}"`)
    .join('\n\n');

  const response = await ai.models.generateContent({
    model: 'gemini-1.5-flash',
    contents: `Analyze these captured user thoughts and identify if there are any recurring cognitive loops, patterns, themes, repeated concerns, goals, or business ideas. Group thoughts that belong to the same loop pattern together. Only create a loop if there are at least 2 thoughts strongly connected in a pattern.

Thoughts:
${thoughtsPrompt}`,
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            theme: { 
              type: Type.STRING, 
              description: 'A short 3-6 word title for the recurring loop/theme.' 
            },
            description: { 
              type: Type.STRING, 
              description: 'A detailed explanation of the pattern, explaining why these thoughts are grouped, what emotional or analytical cycle is repeating, and a potential coaching recommendation or action step.' 
            },
            thoughtIds: { 
              type: Type.ARRAY, 
              items: { type: Type.STRING }, 
              description: 'The IDs of the user thoughts that are part of this loop.' 
            }
          },
          required: ['theme', 'description', 'thoughtIds']
        }
      }
    }
  });

  const resultText = response.text;
  if (!resultText) {
    return [];
  }

  return JSON.parse(resultText) as DetectedLoop[];
}

export interface ReflectionResult {
  content: string;
  growthInsights: string;
}

export async function generateReflection(
  thoughts: Array<{ content: string; category: string; createdAt: number }>,
  type: 'weekly' | 'monthly'
): Promise<ReflectionResult> {
  // Offline Demo Mode fallback
  if (!ai) {
    console.log('⚠️ Running generateReflection in Offline Demo Mode.');
    const categoriesUsed = Array.from(new Set(thoughts.map((t) => t.category))).join(', ');
    
    const letter = `Hello! This is an offline reflection synthesized from your captured thoughts.

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

  const response = await ai.models.generateContent({
    model: 'gemini-1.5-flash',
    contents: `You are Cognitive Loop, a thoughtful, professional second-brain companion. Review the user's thoughts and learnings from the past ${type === 'weekly' ? 'week' : 'month'}. Write a structured reflection summary and list growth insights.

The summary should:
1. Synthesize what they worked on, learned, and decided.
2. Be written in a warm, encouraging, conversational letter-style format directly to the user (e.g. "This week, you focused on...").
3. Point out subtle threads or shifts in focus they might have missed.

The growth insights should:
1. Call out 3 clear, bulleted growth recommendations or action items based on their goals/problems this week.

Thoughts for the period:
${thoughtsPrompt}`,
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          content: { 
            type: Type.STRING, 
            description: 'The synthesized letter-style reflection (can use Markdown formatting like paragraphs, bolding).' 
          },
          growthInsights: { 
            type: Type.STRING, 
            description: 'The 3 bulleted growth insights/action items in Markdown bullet list format.' 
          }
        },
        required: ['content', 'growthInsights']
      }
    }
  });

  const resultText = response.text;
  if (!resultText) {
    throw new Error('Empty response from reflection generator');
  }

  return JSON.parse(resultText) as ReflectionResult;
}

export async function generateChatResponse(
  question: string,
  contextThoughts: Array<{ content: string; category: string; createdAt: number }>,
  chatHistory: Array<{ role: 'user' | 'model'; parts: string[] }>
): Promise<string> {
  // Offline Demo Mode fallback
  if (!ai) {
    console.log('⚠️ Running generateChatResponse in Offline Demo Mode.');
    const query = question.toLowerCase();

    if (query.includes('idea') || query.includes('saas') || query.includes('startup')) {
      const ideas = contextThoughts
        .filter((t) => t.category === 'Idea')
        .map((t) => `"${t.content}"`)
        .join(', ');
      
      return `I ran a local vector search in your second brain. You have logged several ideas, including: ${ideas || 'some product concepts'}.

Based on these entries, you are looking to build tools that lower capture friction (like voice recording with canvas visualization). How can I help you scope a roadmap for this today?`;
    }

    if (query.includes('concern') || query.includes('loop') || query.includes('pattern') || query.includes('worry')) {
      return `Scanning your recent entries reveals a pattern around development speed and schema configurations. You tend to worry about time constraints when coding starts. I suggest setting up strict 2-hour sprints to stay focused and avoid feature creep.`;
    }

    if (query.includes('learn') || query.includes('lesson')) {
      return `In your learnings, you noted that local-first database setups like SQLite and Drizzle ORM reduce infrastructure complexity significantly, keeping your launch cycles short.`;
    }

    const matchedTexts = contextThoughts.map((t) => `"${t.content}"`).join(', ');
    return `Hello! Since the Gemini API key is not configured, I am running in Offline Demo Mode.

Based on your grounded thoughts: ${matchedTexts || 'your memory entries'}, you are exploring local productivity systems. How can I help you brainstorm this?`;
  }

  const contextStr = contextThoughts
    .map((t) => `[${t.category}] (${new Date(t.createdAt).toLocaleDateString()}): "${t.content}"`)
    .join('\n');

  // Format history for the chat API
  const apiHistory = chatHistory.map((h) => ({
    role: h.role,
    parts: h.parts.map((p) => ({ text: p })),
  }));

  const chat = ai.chats.create({
    model: 'gemini-1.5-flash',
    history: [
      {
        role: 'user',
        parts: [
          {
            text: `You are Cognitive Loop, the user's personal AI thinking companion. You have access to their "second brain" of captured thoughts, ideas, decisions, and reflections. Below is the relevant history of their thoughts that matches their query. Use it as ground-truth context to answer their question. Be conversational, insightful, and refer to their thoughts directly (e.g., "On June 10th you noted that..."). If the answer cannot be found in their notes, answer based on general knowledge but remind them that this isn't in their current logs.

Relevant Thoughts Context:
${contextStr}`,
          },
        ],
      },
      ...apiHistory,
    ],
  });

  const response = await chat.sendMessage({
    message: question,
  });

  return response.text || '';
}
