import { NextResponse } from 'next/server';
import { db } from '@/db';
import { entities } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
import { getSessionUser } from '@/lib/auth';

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'unauthorized', message: 'Unauthorized access' }, { status: 401 });
    }

    const userEntities = await db.query.entities.findMany({
      where: eq(entities.userId, user.id),
      orderBy: [desc(entities.activation)],
    });

    const formatted = userEntities.map(e => ({
      id: e.id,
      name: e.name,
      type: e.type,
      description: e.description,
      aliases: JSON.parse(e.aliases) as string[],
      activation: e.activation || 1.0,
      createdAt: e.createdAt,
      updatedAt: e.updatedAt,
    }));

    return NextResponse.json({ success: true, entities: formatted });
  } catch (error: any) {
    console.error('Error fetching entities list:', error);
    return NextResponse.json(
      { error: 'server_error', message: error.message || 'Internal server error while fetching entities' },
      { status: 500 }
    );
  }
}
