import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';

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
  parentId: text('parent_id'), // Self-referencing FK for threaded thoughts
  groupId: text('group_id'), // FK to thought_groups for organizing into folders
  createdAt: integer('created_at').notNull(),
});

export const thoughtConnections = sqliteTable('thought_connections', {
  id: text('id').primaryKey(),
  sourceId: text('source_id').notNull().references(() => thoughts.id, { onDelete: 'cascade' }),
  targetId: text('target_id').notNull().references(() => thoughts.id, { onDelete: 'cascade' }),
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
  expectedOutcomeDate: integer('expected_outcome_date').notNull(),
  successMetric: text('success_metric').notNull(),
  status: text('status').notNull(), // 'pending', 'success', 'failed', 'neutral'
  outcomeNotes: text('outcome_notes'),
  reviewedAt: integer('reviewed_at'),
  createdAt: integer('created_at').notNull(),
});

// Indexes for performance
export const decisionsOutcomeIdx = index('decisions_expected_outcome_idx').on(decisions.expectedOutcomeDate);
export const decisionsStatusIdx = index('decisions_status_idx').on(decisions.status);

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

// Action items extracted from thoughts by JARVIS
export const actionItems = sqliteTable('action_items', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  thoughtId: text('thought_id').notNull().references(() => thoughts.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  description: text('description'),
  priority: text('priority').notNull(), // 'high', 'medium', 'low'
  status: text('status').notNull(), // 'pending', 'in_progress', 'completed', 'dismissed'
  dueDate: integer('due_date'),
  completedAt: integer('completed_at'),
  createdAt: integer('created_at').notNull(),
});
