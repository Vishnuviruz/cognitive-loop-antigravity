import { NextResponse } from 'next/server';
import { db } from '@/db';
import { entityRelationships, entities } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { getSessionUser } from '@/lib/auth';
import { aliasedTable } from 'drizzle-orm';

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'unauthorized', message: 'Unauthorized access' }, { status: 401 });
    }

    const source = aliasedTable(entities, 'source_entities');
    const target = aliasedTable(entities, 'target_entities');

    const relations = await db
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
      .where(eq(entityRelationships.userId, user.id));

    const formatted = relations.map(r => ({
      id: r.id,
      relationshipType: r.relationshipType,
      confidence: r.confidence,
      reason: r.reason,
      supportingEvidence: JSON.parse(r.supportingEvidence) as string[],
      contradictingEvidence: JSON.parse(r.contradictingEvidence) as string[],
      sourceEntity: r.sourceEntity,
      targetEntity: r.targetEntity,
    }));

    return NextResponse.json({ success: true, relationships: formatted });
  } catch (error: any) {
    console.error('Error fetching entity relationships:', error);
    return NextResponse.json(
      { error: 'server_error', message: error.message || 'Internal server error while fetching relationships' },
      { status: 500 }
    );
  }
}
