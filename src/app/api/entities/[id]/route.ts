import { NextResponse } from 'next/server';
import { db } from '@/db';
import { entities, entityRelationships, thoughts } from '@/db/schema';
import { eq, and, or } from 'drizzle-orm';
import { getSessionUser } from '@/lib/auth';
import { aliasedTable } from 'drizzle-orm';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'unauthorized', message: 'Unauthorized access' }, { status: 401 });
    }

    const { id } = await params;

    // 1. Fetch Entity details
    const entity = await db.query.entities.findFirst({
      where: and(eq(entities.id, id), eq(entities.userId, user.id)),
    });

    if (!entity) {
      return NextResponse.json({ error: 'not_found', message: 'Entity not found' }, { status: 404 });
    }

    // 2. Fetch Entity Relationships (Source or Target)
    const source = aliasedTable(entities, 'source_entities');
    const target = aliasedTable(entities, 'target_entities');

    const rels = await db
      .select({
        id: entityRelationships.id,
        relationshipType: entityRelationships.relationshipType,
        confidence: entityRelationships.confidence,
        reason: entityRelationships.reason,
        supportingEvidence: entityRelationships.supportingEvidence,
        contradictingEvidence: entityRelationships.contradictingEvidence,
        sourceEntity: {
          id: source.id,
          name: source.name,
          type: source.type,
        },
        targetEntity: {
          id: target.id,
          name: target.name,
          type: target.type,
        },
      })
      .from(entityRelationships)
      .innerJoin(source, eq(entityRelationships.sourceEntityId, source.id))
      .innerJoin(target, eq(entityRelationships.targetEntityId, target.id))
      .where(
        and(
          eq(entityRelationships.userId, user.id),
          or(
            eq(entityRelationships.sourceEntityId, id),
            eq(entityRelationships.targetEntityId, id)
          )
        )
      );

    const formattedRels = rels.map(r => ({
      id: r.id,
      relationshipType: r.relationshipType,
      confidence: r.confidence,
      reason: r.reason,
      supportingEvidence: JSON.parse(r.supportingEvidence) as string[],
      contradictingEvidence: JSON.parse(r.contradictingEvidence) as string[],
      sourceEntity: r.sourceEntity,
      targetEntity: r.targetEntity,
    }));

    // 3. Find thoughts serving as evidence
    const allThoughts = await db.query.thoughts.findMany({
      where: eq(thoughts.userId, user.id),
    });

    const aliases = JSON.parse(entity.aliases) as string[];
    const searchTerms = Array.from(new Set([entity.name.toLowerCase(), ...aliases.map(a => a.toLowerCase())]));

    const evidenceThoughts = allThoughts.filter(t => {
      const contentLower = t.content.toLowerCase();
      const summaryLower = t.summary.toLowerCase();
      const tagsList = JSON.parse(t.tags) as string[];
      
      const contentMatch = searchTerms.some(term => contentLower.includes(term) || summaryLower.includes(term));
      const tagsMatch = tagsList.some(tag => searchTerms.some(term => tag.toLowerCase().includes(term) || term.includes(tag.toLowerCase())));
      
      return contentMatch || tagsMatch;
    }).map(t => ({
      id: t.id,
      content: t.content,
      summary: t.summary,
      category: t.category,
      sentiment: t.sentiment,
      tags: JSON.parse(t.tags) as string[],
      createdAt: t.createdAt,
    }));

    return NextResponse.json({
      success: true,
      entity: {
        id: entity.id,
        name: entity.name,
        type: entity.type,
        description: entity.description,
        aliases,
        activation: entity.activation || 1.0,
        createdAt: entity.createdAt,
        updatedAt: entity.updatedAt,
      },
      relationships: formattedRels,
      thoughts: evidenceThoughts,
    });
  } catch (error: any) {
    console.error('Error fetching entity details:', error);
    return NextResponse.json(
      { error: 'server_error', message: error.message || 'Internal server error while fetching entity details' },
      { status: 500 }
    );
  }
}
