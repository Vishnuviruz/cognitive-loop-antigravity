import { sqliteTable, text, integer, real, index } from 'drizzle-orm/sqlite-core';

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  name: text('name'),
  avatarUrl: text('avatar_url'),
  passwordHash: text('password_hash'),
  createdAt: integer('created_at').notNull(),
});

export const sessions = sqliteTable('sessions', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  expiresAt: integer('expires_at').notNull(),
});

export const thoughts = sqliteTable('thoughts', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  content: text('content').notNull(),
  summary: text('summary').notNull(),
  category: text('category').notNull(), // e.g. 'Idea', 'Goal', 'Reflection', 'Learning', 'Decision', 'Problem', 'Opportunity'
  sentiment: text('sentiment').notNull(),
  tags: text('tags').notNull(), // JSON string representing string[]
  embedding: text('embedding').notNull(), // JSON string representing number[]
  jarvisInsight: text('jarvis_insight'),
  suggestedTasks: text('suggested_tasks'), // JSON string representing { title: string, description?: string, priority?: string }[]
  suggestedDecisions: text('suggested_decisions'), // JSON string representing { title: string, successMetric: string }[]
  parentId: text('parent_id'), // Self-referencing FK for threaded thoughts
  groupId: text('group_id'), // FK to thought_groups for organizing into folders
  createdAt: integer('created_at').notNull(),
});

export const relationships = sqliteTable('relationships', {
  id: text('id').primaryKey(),
  thoughtId1: text('thought_id_1').notNull().references(() => thoughts.id, { onDelete: 'cascade' }),
  thoughtId2: text('thought_id_2').notNull().references(() => thoughts.id, { onDelete: 'cascade' }),
  score: real('score').notNull(),
  createdAt: integer('created_at').notNull(),
});

export const loops = sqliteTable('loops', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  theme: text('theme').notNull(),
  description: text('description').notNull(),
  thoughtIds: text('thought_ids').notNull(), // JSON string representing string[] (thought IDs)
  createdAt: integer('created_at').notNull(),
});

export const reflections = sqliteTable('reflections', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  type: text('type').notNull(), // 'weekly' | 'monthly'
  content: text('content').notNull(),
  growthInsights: text('growth_insights').notNull(),
  createdAt: integer('created_at').notNull(),
});

// Tags join table for reflections
export const reflectionTags = sqliteTable('reflection_tags', {
  id: text('id').primaryKey(),
  reflectionId: text('reflection_id').notNull().references(() => reflections.id, { onDelete: 'cascade' }),
  tag: text('tag').notNull(),
});

// Full‑text search virtual table (SQLite FTS5) – will be created via migration script


export const decisions = sqliteTable('decisions', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  thoughtId: text('thought_id').notNull().references(() => thoughts.id, { onDelete: 'cascade' }),
  title: text('title').notNull().default('Decision Commitment'),
  expectedOutcomeDate: integer('expected_outcome_date').notNull(),
  successMetric: text('success_metric').notNull(),
  status: text('status').notNull(), // 'pending', 'success', 'failed', 'trash'
  outcomeNotes: text('outcome_notes'),
  reviewedAt: integer('reviewed_at'),
  evolutionInsight: text('evolution_insight'), // JSON containing AI progress summary + JARVIS Insight
  finalSynthesis: text('final_synthesis'),     // Final outcome synthesis report
  createdAt: integer('created_at').notNull(),
});

// Chronological progress logs tracking decision evolution
export const decisionProgressLogs = sqliteTable('decision_progress_logs', {
  id: text('id').primaryKey(),
  decisionId: text('decision_id').notNull().references(() => decisions.id, { onDelete: 'cascade' }),
  note: text('note').notNull(),
  createdAt: integer('created_at').notNull(),
});

// Indexes for performance
export const decisionsOutcomeIdx = index('decisions_expected_outcome_idx').on(decisions.expectedOutcomeDate);
export const decisionsStatusIdx = index('decisions_status_idx').on(decisions.status);
export const progressLogsDecisionIdx = index('progress_logs_decision_idx').on(decisionProgressLogs.decisionId);

// Persistent chat memory for the Thinking Companion
export const chatMessages = sqliteTable('chat_messages', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  role: text('role').notNull(), // 'user' | 'model'
  content: text('content').notNull(),
  contextUsed: text('context_used'), // JSON string of RAG context items (nullable)
  createdAt: integer('created_at').notNull(),
});

// Thought Groups for organizing thoughts into folders/projects
export const thoughtGroups = sqliteTable('thought_groups', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  description: text('description'),
  color: text('color').notNull(), // Hex color for visual coding
  createdAt: integer('created_at').notNull(),
});

// Action items extracted from thoughts by JARVIS or manually created
export const actionItems = sqliteTable('action_items', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  thoughtId: text('thought_id').references(() => thoughts.id, { onDelete: 'cascade' }), // Nullable for manually created tasks
  title: text('title').notNull(),
  description: text('description'),
  priority: text('priority').notNull(), // 'high', 'medium', 'low'
  status: text('status').notNull(), // 'pending', 'in_progress', 'completed', 'dismissed'
  category: text('category').default('General'), // Category/Tag for tasks (e.g. Work, Personal, health)
  dueDate: integer('due_date'),
  completedAt: integer('completed_at'),
  createdAt: integer('created_at').notNull(),
});

// Personal Knowledge Graph (PKG) Entities table
export const entities = sqliteTable('entities', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  type: text('type').notNull(), // 'Project' | 'Technology' | 'Person' | 'Goal' | 'Concept'
  description: text('description'),
  aliases: text('aliases').notNull(), // JSON string representing string[]
  activation: real('activation').default(1.0), // Active memory score
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
});

// PKG Entity Relationships table
export const entityRelationships = sqliteTable('entity_relationships', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  sourceEntityId: text('source_entity_id').notNull().references(() => entities.id, { onDelete: 'cascade' }),
  targetEntityId: text('target_entity_id').notNull().references(() => entities.id, { onDelete: 'cascade' }),
  relationshipType: text('relationship_type').notNull(), // 'Supports' | 'Contradicts' | 'Continues' | 'Implements' | 'Inspired By' | 'Depends On' | 'Blocks' | 'Solves' | 'Questions' | 'References'
  confidence: real('confidence').notNull(),
  reason: text('reason').notNull(),
  supportingEvidence: text('supporting_evidence').notNull(), // JSON string array of thought IDs
  contradictingEvidence: text('contradicting_evidence').notNull(), // JSON string array of thought IDs
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
});

// PKG Indexes for lookup performance
export const entitiesUserIdx = index('entities_user_idx').on(entities.userId);
export const entitiesNameIdx = index('entities_name_idx').on(entities.userId, entities.name);
export const entityRelSourceIdx = index('entity_rel_source_idx').on(entityRelationships.sourceEntityId);
export const entityRelTargetIdx = index('entity_rel_target_idx').on(entityRelationships.targetEntityId);

// Lessons — reusable procedural wisdom extracted from decision retrospectives
export const lessons = sqliteTable('lessons', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  decisionId: text('decision_id').references(() => decisions.id, { onDelete: 'set null' }),
  entityId: text('entity_id').references(() => entities.id, { onDelete: 'cascade' }),
  lesson: text('lesson').notNull(),          // Written in the second person ("You should always...")
  isSuccessful: integer('is_successful').notNull(), // 1 = came from success outcome, 0 = failure/neutral
  createdAt: integer('created_at').notNull(),
});

// Index for fetching a user's lessons efficiently
export const lessonsUserIdx = index('lessons_user_idx').on(lessons.userId);
