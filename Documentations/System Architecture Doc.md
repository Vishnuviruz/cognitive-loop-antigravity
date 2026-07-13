# System Architecture Document (SAD)
**Version:** 1.0.0  
**Status:** Frozen  

This document details the deployment topology, processing pipelines, scaling strategies, and security model of the **Cognitive Loop** platform.

---

## 1. Deployment Topology

The platform leverages a distributed edge-computing model to minimize latency while maintaining transactional data consistency.

```
       [ Client Browser ]
               │
               ▼  HTTPS requests / Session cookie auth
       [ Vercel Edge Network ]
               │
      Next.js Serverless App
        ├── Fast Path API Routes (Vercel Serverless Functions)
        └── UI Page Renderers
               │
       ┌───────┴───────┬────────────────────────┐
       ▼               ▼                        ▼
  [ Turso DB ]    [ AI APIs ]            [ Background Jobs ]
  LibSQL Edge     - Gemini (Embeds)      Trigger.dev OR Inngest
  replica cloud   - Groq (LLM Chat/      (Durable, asynchronous
                  Transcription)          Serverless Worker)
```

---

## 2. Ingestion Pipelines

Processing is split into a **Fast Path** (synchronous response to keep the UI snappy) and a **Slow Path** (asynchronous batch worker).

### The Fast Path (Synchronous Ingestion)
1.  **Transport**: Next.js route handler `POST /api/thoughts`.
2.  **Transcription**: If input is audio, Whispers transcribes it.
3.  **Embed**: The server calls Gemini's `text-embedding-004` to create a 768-dim float vector.
4.  **Local Rerank**: The database fetches the user's top 50 thoughts. The server runs the mathematical reranker locally.
5.  **LLM Relationship Reasoner**: The server sends the new thought + top 10–15 candidate summaries to Groq `llama-3.3-70b-versatile`.
6.  **Store**: The database saves the new thought and immediately identified relationships.
7.  **Response**: The server returns the thought and relationships to the client.

### The Slow Path (Asynchronous Ingestion & Graph Maintenance)
Once the Fast Path returns, the server schedules a background job (via Trigger.dev or Inngest worker) to execute heavy cognitive tasks:

1.  **Entity Extraction**: Parses the raw thought text to isolate nouns representing Technologies, People, Projects, or Goals.
2.  **Personal Entity Resolution**: Normalizes the entities against the user's existing Entity table (e.g., merging "NextJS" $\rightarrow$ "Next.js").
3.  **Decision Ingestion Check**: Evaluates if the thought represents a Decision. If confidence is medium, schedules a confirmation alert.
4.  **Consolidation Check**: Evaluates if this thought clusters with existing thoughts. If a cluster crosses the consolidation threshold, runs the synthesis job.

---

## 3. Scaling Strategies

As a user's memory database scales from 100 thoughts to 10,000+ thoughts, we must prevent performance degradation.

### In-Memory Mathematical Reranking
We avoid querying LLMs on all 10,000 thoughts. By using local cosine similarity calculations across cached float arrays in Node.js, we can compare 10,000 vectors in less than **5 milliseconds**. The ranking filter ensures we only pass 10–15 thoughts to the LLM context.

### Database Indexing
*   Composite indices on `thoughts(userId, createdAt)` to optimize chronological retrievals.
*   Foreign key indexing on `entity_relationships(sourceEntityId, targetEntityId)` to ensure fast traversals during Narrative View renders.

### Vector Compression (Memory Consolidation)
By periodically compressing 50 individual thoughts into a single high-density Synthesis Node, we reduce the total number of active vectors in the search space. This prevents vector search noise and saves context window space in RAG chat runs.

---

## 4. Security & Privacy Model

For a second brain storing deeply personal thoughts, data privacy is paramount.

### Tenant Isolation
We enforce strict tenant isolation at the Drizzle query level. Every single database query must include the `userId` filter retrieved from the validated session cookie:
```typescript
const userThoughts = await db.query.thoughts.findMany({
  where: and(
    eq(thoughts.userId, user.id),
    ...additionalConditions
  )
});
```

### AI Processing Isolation
*   We pass user first names to the model prompts, never last names, emails, or personal identifiers.
*   We use standard developer endpoints for Gemini and Groq, which explicitly govern that data is not used for training foundation models.
*   The architecture supports modular embedding classes: if a user demands zero cloud transmission, the system can switch to local, self-hosted open-weight embedding models.
