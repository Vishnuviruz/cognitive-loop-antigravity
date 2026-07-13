# Phase 2: Personal Knowledge Graph (Status: ✅ Complete)

This document outlines the detailed implementation plan for **Phase 2: Personal Knowledge Graph (PKG)**, transforming independent thoughts into an explainable network of concepts.

---

## 🎯 What Will Be Done

### 1. Asynchronous Entity Extraction (Slow Path)
*   **What**: Extract structured entities (Projects, Technologies, People, Goals, Concepts) from thoughts without blocking the client.
*   **How**: Set up background workers (using Trigger.dev or Inngest hooks) that trigger post-ingestion. The worker passes the raw thought to Gemini-1.5-Flash to extract nouns of interest according to a strict JSON schema.

### 2. Entity Normalization & Resolution
*   **What**: Resolve duplicate concepts to maintain a clean vocabulary (e.g. mapping "NextJS", "nextjs", and "Next.js" to a single Entity ID).
*   **How**: The background job queries the database for existing user entities. Gemini compares extracted nouns against existing aliases, resolving spelling differences and assigning the matching UUID or creating a new record.

### 3. Explainable Relationships Mapping
*   **What**: Create reasoning-backed semantic links (e.g. `Supports`, `Contradicts`, `Continues`) between entities.
*   **How**: During thought comparison, Groq evaluates connections between the current thought and matched candidates. It outputs a confidence score and a brief explainable reason. We insert these into `entity_relationships` with arrays mapping back to the thought IDs serving as audit evidence.

### 4. Narrative Traversals & Idea Evolution UI
*   **What**: Display connections through structured narratives instead of displaying raw node-link graph maps.
*   **How**:
    *   **Idea Evolution View**: A dashboard panel showcasing how the user's thoughts on a specific entity evolved over time, grouping by chronological timestamps and highlights contradictions.
    *   **Connections Canvas**: An interactive navigation screen showcasing target concepts, active memory activation ratings, and clickable references leading to supporting thoughts.
