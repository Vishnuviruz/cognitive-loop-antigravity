# Cognitive Loop — Detailed Product Documentation

This document provides a comprehensive technical overview of the **Cognitive Loop** architecture, codebase flows, AI pipelines, database schemas, and design system.

---

## 1. Product Philosophy & Core Objectives

### The Architectural Goal
Cognitive Loop is a **Personal Cognitive Operating System**. Its objective is not to simply "store information," but to continuously transform raw experiences into personal wisdom:

$$\text{Information (Episodic)} \rightarrow \text{Knowledge (Semantic)} \rightarrow \text{Understanding (Decisions)} \rightarrow \text{Wisdom (Lessons & Behaviors)}$$

The ultimate KPI of the system is **positive behavioral change**—helping users make better decisions over time and avoid repeating past errors.

---

## 2. Core Platform Features & Modules

1.  **Episodic Capture Engine**: Accepts text and voice inputs. Whisper APIs transcribe audio buffer data on submission. Thoughts are stored as immutable episodic evidence logs.
2.  **Personal Knowledge Graph (PKG)**: The internal semantic model. Extracts entities and connects them using custom categories, tags, and fixed relationship taxonomies.
3.  **Explainable Relationships Canvas**: Connects thoughts using cosine similarity search and AI relationship reasoning. Every relationship maintains a complete audit trail (supporting/contradicting evidence).
4.  **Decision Intelligence Ledger**: Tracks the lifecycle of decisions:
    $$\text{Thought} \rightarrow \text{Decision} \rightarrow \text{Execution} \rightarrow \text{Outcome} \rightarrow \text{Reflection} \rightarrow \text{Lesson} \rightarrow \text{Future Recommendation}$$
5.  **Memory Consolidation Engine**: A background service that synthesizes clusters of older thoughts into high-density semantic summaries, reducing context clutter while preserving historical evidence.
6.  **Thinking Companion (Chat)**: A RAG-powered companion that leverages the user's private **Cognitive Profile** to provide personalized coaching and call out cognitive biases (e.g., tech stack analysis paralysis).

---

## 3. Database Schema (Drizzle ORM)

The schema divides memory and decision tracking into dedicated tables:

```typescript
import { sqliteTable, text, integer, real, index } from 'drizzle-orm/sqlite-core';

// 1. Users & Sessions
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

// 2. Episodic Memory (Raw logs - Information)
export const thoughts = sqliteTable('thoughts', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  content: text('content').notNull(),
  summary: text('summary').notNull(),
  category: text('category').notNull(),
  sentiment: text('sentiment').notNull(),
  tags: text('tags').notNull(), // JSON string array
  embedding: text('embedding').notNull(), // JSON float array (768-dim)
  importanceScore: real('importance_score').default(0.5),
  isConsolidated: integer('is_consolidated').default(0), // Boolean 0/1
  createdAt: integer('created_at').notNull(),
});

// 3. Semantic Memory (Knowledge Graph - Knowledge)
export const entities = sqliteTable('entities', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  type: text('type').notNull(), // 'Project' | 'Technology' | 'Person' | 'Goal' | 'Concept'
  description: text('description'),
  aliases: text('aliases'), // JSON string array for normalization
  activation: real('activation').default(1.0),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
});

export const entityRelationships = sqliteTable('entity_relationships', {
  id: text('id').primaryKey(),
  sourceEntityId: text('source_entity_id').notNull().references(() => entities.id, { onDelete: 'cascade' }),
  targetEntityId: text('target_entity_id').notNull().references(() => entities.id, { onDelete: 'cascade' }),
  relationshipType: text('relationship_type').notNull(), // 'supports' | 'contradicts' | 'continues' | 'implements' ...
  confidence: real('confidence').notNull(),
  reason: text('reason').notNull(),
  supportingEvidence: text('supporting_evidence').notNull(), // JSON array of thought IDs
  contradictingEvidence: text('contradicting_evidence').notNull(), // JSON array of thought IDs
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
});

// 4. Decision Intelligence (Understanding)
export const decisions = sqliteTable('decisions', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  thoughtId: text('thought_id').references(() => thoughts.id, { onDelete: 'set null' }),
  expectedOutcomeDate: integer('expected_outcome_date').notNull(),
  successMetric: text('success_metric').notNull(),
  status: text('status').notNull(), // 'pending' | 'executed' | 'resolved'
  createdAt: integer('created_at').notNull(),
});

export const decisionOutcomes = sqliteTable('decision_outcomes', {
  id: text('id').primaryKey(),
  decisionId: text('decision_id').notNull().references(() => decisions.id, { onDelete: 'cascade' }),
  content: text('content').notNull(), // Factual outcome
  isSuccessful: integer('is_successful').notNull(), // 0 or 1
  createdAt: integer('created_at').notNull(),
});

// 5. Procedural Memory (Wisdom)
export const lessons = sqliteTable('lessons', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  decisionId: text('decision_id').references(() => decisions.id, { onDelete: 'set null' }),
  entityId: text('entity_id').references(() => entities.id, { onDelete: 'cascade' }),
  lessonText: text('lesson_text').notNull(),
  createdAt: integer('created_at').notNull(),
});

export const behavioralPatterns = sqliteTable('behavioral_patterns', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  patternId: text('pattern_id').notNull(), // e.g., 'late_night_ideation'
  description: text('description').notNull(),
  confidence: real('confidence').notNull(),
  evidence: text('evidence').notNull(), // JSON array of thought/decision IDs
  updatedAt: integer('updated_at').notNull(),
});
```

---

## 4. UI Design System & Narrative UX

The interface focuses on narrative traversal templates rather than raw graph node-link displays:
*   **The Decision Journey**: Collapsible timeline rendering the goal lifecycle.
*   **Idea Evolution**: Interactive screens displaying old vs. new concepts, highlighting contradictions and refines relationships.
*   **Knowledge Explorer**: Tabbed view displaying entities, active memory activation state, and direct supporting thoughts.

---

## 5. Ingestion Pipeline & AI Prompts

*   **Fast Path**: Triggered on `POST /api/thoughts`. Computes cosine similarity, performs mathematical reranking to select the top 10–15 candidates, and calls Groq LLaMA-3.3-70B to evaluate explainable relationships.
*   **Slow Path**: Background Trigger.dev / Inngest worker. Extracts entities, clusters thoughts for memory consolidation, prompts outcomes for overdue decisions, and builds procedural patterns.

### Prompts Specification
Refer to the **AI Pipeline Specification** for complete system prompt layouts and strict JSON schemas.
