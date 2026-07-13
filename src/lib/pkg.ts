import { db } from '@/db';
import { thoughts, entities, entityRelationships, relationships } from '@/db/schema';
import { eq, and, ne } from 'drizzle-orm';
import crypto from 'crypto';
import { ai as geminiClient } from '@/lib/gemini';
import { ai as groqClient } from '@/lib/groq';
import { Type } from '@google/genai';

interface ExtractedEntity {
  name: string;
  type: 'Project' | 'Technology' | 'Person' | 'Goal' | 'Concept';
  description: string;
  aliases: string[];
  resolvedEntityId?: string | null;
}

interface EvaluatedRelationship {
  sourceEntityName: string;
  targetEntityName: string;
  relationshipType: 'Supports' | 'Contradicts' | 'Continues' | 'Implements' | 'Inspired By' | 'Depends On' | 'Blocks' | 'Solves' | 'Questions' | 'References';
  confidence: number;
  reason: string;
}

// Background processor to execute Slow Path PKG extraction & resolution
export async function processThoughtPKG(thoughtId: string, userId: string): Promise<void> {
  console.log(`[PKG Engine] Initiating Slow Path processing for Thought ID: ${thoughtId}`);

  try {
    // 1. Fetch current thought
    const currentThought = await db.query.thoughts.findFirst({
      where: and(eq(thoughts.id, thoughtId), eq(thoughts.userId, userId)),
    });

    if (!currentThought) {
      console.error(`[PKG Engine] Error: Thought ${thoughtId} not found or unauthorized`);
      return;
    }

    // 2. Fetch all existing entities of this user
    const userEntities = await db.query.entities.findMany({
      where: eq(entities.userId, userId),
    });

    let extracted: ExtractedEntity[] = [];

    // 3. Perform Entity Extraction & Normalization
    if (groqClient) {
      try {
        const existingList = userEntities.map((e) => ({
          id: e.id,
          name: e.name,
          type: e.type,
          aliases: JSON.parse(e.aliases) as string[],
        }));

        const response = await groqClient.chat.completions.create({
          model: 'llama-3.3-70b-versatile',
          response_format: { type: 'json_object' },
          messages: [
            {
              role: 'system',
              content: `You are JARVIS, an advanced personal assistant. Analyze the raw thought and extract all key entities mentioned.
Entities represent nouns of interest: Projects, Technologies, People, Goals, or Concepts.

For each entity, compare it against the list of existing entities. If the extracted entity matches an existing entity but is spelled differently or is a synonym, resolve it by mapping it to the existing entity ID.

Respond with a JSON object matching this structure:
{
  "extractedEntities": [
    {
      "name": "Normalized Name",
      "type": "Project" | "Technology" | "Person" | "Goal" | "Concept",
      "description": "brief description of its role or context in this thought",
      "aliases": ["list of alternative names or spelling variations"],
      "resolvedEntityId": "uuid if matched in Existing Entities list, otherwise null"
    }
  ]
}`
            },
            {
              role: 'user',
              content: `Thought content: "${currentThought.content}"

Existing user entities:
${JSON.stringify(existingList)}`
            }
          ]
        });

        const resultText = response.choices[0]?.message?.content;
        if (resultText) {
          const parsed = JSON.parse(resultText);
          extracted = parsed.extractedEntities || [];
        }
      } catch (err) {
        console.error('[PKG Engine] Error during Groq entity extraction call:', err);
      }
    }

    // 4. Offline Demo Mode Fallback for Entity Extraction
    if (extracted.length === 0) {
      console.log('[PKG Engine] Running Entity Extraction in Offline/Fallback Demo Mode.');
      const lower = currentThought.content.toLowerCase();
      
      const techKeywords = [
        { name: 'Next.js', type: 'Technology' as const, keywords: ['nextjs', 'next.js', 'next js', 'next-js'], desc: 'Next.js React Framework' },
        { name: 'Turso', type: 'Technology' as const, keywords: ['turso', 'libsql'], desc: 'Edge SQLite database provider' },
        { name: 'Drizzle ORM', type: 'Technology' as const, keywords: ['drizzle', 'orm'], desc: 'TypeScript-first ORM mapping library' },
        { name: 'TailwindCSS', type: 'Technology' as const, keywords: ['tailwind', 'css'], desc: 'Utility-first styling system' },
        { name: 'Whisper', type: 'Technology' as const, keywords: ['whisper', 'audio transcription'], desc: 'OpenAI Whisper audio transcription model' },
        { name: 'LLaMA', type: 'Technology' as const, keywords: ['llama', 'groq'], desc: 'Meta open weights LLM model series' }
      ];

      for (const item of techKeywords) {
        if (item.keywords.some((kw) => lower.includes(kw))) {
          // Check if user already has this entity
          const matched = userEntities.find((e) => {
            const aliasesList = JSON.parse(e.aliases) as string[];
            return e.name.toLowerCase() === item.name.toLowerCase() || aliasesList.some(al => al.toLowerCase() === item.name.toLowerCase());
          });

          extracted.push({
            name: item.name,
            type: item.type,
            description: item.desc,
            aliases: item.keywords,
            resolvedEntityId: matched ? matched.id : null,
          });
        }
      }

      // Default concept if no tech matches
      if (extracted.length === 0) {
        extracted.push({
          name: 'Cognitive Loop',
          type: 'Project',
          description: 'Personal Cognitive Intelligence Platform system',
          aliases: ['cognitive loop', 'second brain', 'pkg'],
          resolvedEntityId: userEntities.find(e => e.name === 'Cognitive Loop')?.id || null,
        });
      }
    }

    // 5. Insert/Update Resolved Entities
    const savedEntities: Array<{ id: string; name: string }> = [];

    for (const ent of extracted) {
      try {
        if (ent.resolvedEntityId) {
          // Entity exists - update activation andAliases list
          const existing = userEntities.find((e) => e.id === ent.resolvedEntityId);
          if (existing) {
            const currentAliases = JSON.parse(existing.aliases) as string[];
            const updatedAliases = Array.from(new Set([...currentAliases, ...ent.aliases]));
            
            await db.update(entities)
              .set({
                activation: Math.min((existing.activation || 1.0) + 0.2, 2.0), // increment activation
                aliases: JSON.stringify(updatedAliases),
                updatedAt: Date.now(),
              })
              .where(eq(entities.id, existing.id));

            savedEntities.push({ id: existing.id, name: existing.name });
            console.log(`[PKG Engine] Updated activation score for existing Entity: ${existing.name}`);
          }
        } else {
          // Create new Entity
          const newEntityId = crypto.randomUUID();
          await db.insert(entities).values({
            id: newEntityId,
            userId,
            name: ent.name,
            type: ent.type,
            description: ent.description,
            aliases: JSON.stringify(ent.aliases),
            activation: 1.0,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          });

          savedEntities.push({ id: newEntityId, name: ent.name });
          console.log(`[PKG Engine] Created new Entity node in PKG: ${ent.name}`);
        }
      } catch (err) {
        console.error(`[PKG Engine] Error saving entity ${ent.name}:`, err);
      }
    }

    // 6. Relationship Extraction & Mapping
    // Find all thoughts mapped via cosine similarity to current thought
    const similarRelations = await db.query.relationships.findMany({
      where: eq(relationships.thoughtId1, thoughtId),
    });

    const similarThoughtIds = similarRelations.map((r) => r.thoughtId2);
    let candidateThoughts: Array<typeof currentThought> = [];
    
    if (similarThoughtIds.length > 0) {
      const similarThoughts = await db.query.thoughts.findMany({
        where: and(ne(thoughts.id, thoughtId), eq(thoughts.userId, userId)),
      });
      candidateThoughts = similarThoughts.filter((t) => similarThoughtIds.includes(t.id));
    }

    // Determine if we can extract relationships:
    // Either the current thought has at least 2 entities (intra-thought connections),
    // OR we have at least 1 new entity and 1 candidate past thought to connect with.
    const canExtract = savedEntities.length >= 2 || (savedEntities.length >= 1 && candidateThoughts.length >= 1);

    if (!canExtract) {
      console.log('[PKG Engine] Insufficient context for relationship mapping. Skipping.');
      return;
    }

    let relationshipsList: EvaluatedRelationship[] = [];

    // Analyze relationships using LLM
    if (groqClient) {
      try {
        const response = await groqClient.chat.completions.create({
          model: 'llama-3.3-70b-versatile',
          response_format: { type: 'json_object' },
          messages: [
            {
              role: 'system',
              content: `You are JARVIS, an advanced personal assistant. Analyze the new thought and similar past thoughts to identify explainable relationships between the entities.
You must use only this relationshipType taxonomy:
['Supports', 'Contradicts', 'Continues', 'Implements', 'Inspired By', 'Depends On', 'Blocks', 'Solves', 'Questions', 'References']

Respond with a JSON object matching this structure:
{
  "relationships": [
    {
      "sourceEntityName": "Name of source entity (must match one of the extracted entities)",
      "targetEntityName": "Name of target entity (must match one of the extracted entities or existing entities)",
      "relationshipType": "taxonomy type",
      "confidence": float (0.0 to 1.0),
      "reason": "Clear explanation of how these entities relate based on thoughts context."
    }
  ]
}`
            },
            {
              role: 'user',
              content: `New Thought content: "${currentThought.content}"
Extracted Entities: ${JSON.stringify(savedEntities.map(e => e.name))}

Connected Past Thoughts:
${candidateThoughts.map(ct => `- "${ct.content}"`).join('\n')}`
            }
          ]
        });

        const resultText = response.choices[0]?.message?.content;
        if (resultText) {
          const parsed = JSON.parse(resultText);
          relationshipsList = parsed.relationships || [];
        }
      } catch (err) {
        console.error('[PKG Engine] Error during Groq relationship call:', err);
      }
    }

    // 7. Fallback Offline Relationship Mapping
    if (relationshipsList.length === 0) {
      console.log('[PKG Engine] Running Relationship Evaluation in Offline Fallback Mode.');
      // Create a default link if we have at least 2 entities
      if (savedEntities.length >= 2) {
        relationshipsList.push({
          sourceEntityName: savedEntities[0].name,
          targetEntityName: savedEntities[1].name,
          relationshipType: 'Depends On',
          confidence: 0.85,
          reason: 'Dynamic relationship inferred during offline capture evaluation.',
        });
      }
    }

    // 8. Save Relationships to DB
    for (const rel of relationshipsList) {
      try {
        // Resolve Entity IDs by name match
        const sourceEnt = savedEntities.find(s => s.name.toLowerCase() === rel.sourceEntityName.toLowerCase()) || 
                          userEntities.find(e => e.name.toLowerCase() === rel.sourceEntityName.toLowerCase() || (JSON.parse(e.aliases) as string[]).some(a => a.toLowerCase() === rel.sourceEntityName.toLowerCase()));

        const targetEnt = savedEntities.find(t => t.name.toLowerCase() === rel.targetEntityName.toLowerCase()) ||
                          userEntities.find(e => e.name.toLowerCase() === rel.targetEntityName.toLowerCase() || (JSON.parse(e.aliases) as string[]).some(a => a.toLowerCase() === rel.targetEntityName.toLowerCase()));

        if (sourceEnt && targetEnt && sourceEnt.id !== targetEnt.id) {
          // Check if relation already exists between these entities
          const existingRel = await db.query.entityRelationships.findFirst({
            where: and(
              eq(entityRelationships.userId, userId),
              eq(entityRelationships.sourceEntityId, sourceEnt.id),
              eq(entityRelationships.targetEntityId, targetEnt.id)
            )
          });

          if (existingRel) {
            // Append thought to evidence list
            const currentEvidence = JSON.parse(existingRel.supportingEvidence) as string[];
            const updatedEvidence = Array.from(new Set([...currentEvidence, thoughtId]));

            await db.update(entityRelationships)
              .set({
                confidence: Math.max(existingRel.confidence, rel.confidence),
                supportingEvidence: JSON.stringify(updatedEvidence),
                reason: rel.reason,
                updatedAt: Date.now(),
              })
              .where(eq(entityRelationships.id, existingRel.id));

            console.log(`[PKG Engine] Updated existing relationship: ${sourceEnt.name} -> ${targetEnt.name}`);
          } else {
            // Create new relationship
            await db.insert(entityRelationships).values({
              id: crypto.randomUUID(),
              userId,
              sourceEntityId: sourceEnt.id,
              targetEntityId: targetEnt.id,
              relationshipType: rel.relationshipType,
              confidence: rel.confidence,
              reason: rel.reason,
              supportingEvidence: JSON.stringify([thoughtId]),
              contradictingEvidence: JSON.stringify([]),
              createdAt: Date.now(),
              updatedAt: Date.now(),
            });

            console.log(`[PKG Engine] Mapped new relationship: ${sourceEnt.name} -[${rel.relationshipType}]-> ${targetEnt.name}`);
          }
        }
      } catch (err) {
        console.error('[PKG Engine] Error saving entity relationship:', err);
      }
    }

  } catch (err) {
    console.error('[PKG Engine] Unhandled error during PKG pipeline:', err);
  }
}
