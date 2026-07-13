# Phase 4: Memory Lifecycle (Status: 📅 Planned)

This document outlines the detailed implementation plan for **Phase 4: Memory Lifecycle**, optimizing cognitive load through periodic compression.

---

## 🎯 What Will Be Done

### 1. Semantic Thought Clustering
*   **What**: Identify groups of old thoughts that focus on the same concept or project.
*   **How**: Run a weekly background consolidation task. The server retrieves the user's unconsolidated thought vectors, calculates similarity boundaries, and groups them into clusters.

### 2. High-Density Consolidation (Slow Path Synthesis)
*   **What**: Synthesize a cluster of thoughts into a single comprehensive topic summary.
*   **How**: For each identified cluster, the worker:
    1. Collects the raw thought texts in chronological order.
    2. Prompts Gemini-1.5-Flash to output a synthesized overview, list core takeaways, and identify any remaining open questions or contradictions.
    3. Saves the synthesis as a high-density summary in the database.

### 3. Lossless Vector Compression
*   **What**: Prevent search noise and context window bloat during RAG chat runs.
*   **How**:
    *   Set the `isConsolidated = 1` flag on the individual thoughts in the cluster, excluding them from default retrieval search matches.
    *   Maintain the links between the new Synthesis Node and the underlying individual thoughts, allowing the user to drill down to the raw logs if needed.
    *   Index the new Synthesis Node vector in the similarity search pool.
