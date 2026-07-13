# Documentation Roadmap

Welcome to the **Cognitive Loop** technical specifications library. To fully grasp the philosophy, data structures, and engineering architectures of this Personal Cognitive Intelligence Platform, we recommend reading the documents in the following order:

---

## 🗺️ Recommended Reading Order

### 1. [The Cognitive Contract](file:///Users/vishnu/Documents/Cognitive%20loop%20-%20antigravity/Documentations/Cognitive%20Contract.md)
*   **Purpose**: Defines the platform's core vocabulary (Thoughts, Entities, Decisions, Lessons), memory categories (Episodic, Semantic, Procedural), and the Core Loop Cycle.
*   **Why read first**: Establishes the glossary and domain boundaries. All code, database schemas, and AI prompts are designed around these definitions.

### 2. [Cognitive Invariants](file:///Users/vishnu/Documents/Cognitive%20loop%20-%20antigravity/Documentations/Cognitive%20Invariants.md)
*   **Purpose**: Documents the immutable architectural constraints (e.g., thoughts are strictly immutable, user choices always override AI, explanations must be sovereign).
*   **Why read second**: Establishes the "laws" of the codebase. No feature or refactor is allowed to bypass these constraints.

### 3. [Product Documentation](file:///Users/vishnu/Documents/Cognitive%20loop%20-%20antigravity/Documentations/Product%20Documentation.md)
*   **Purpose**: Outlines high-level platform modules, visual layouts, and detailed database table schemas.
*   **Why read third**: Bridges the high-level philosophy with actual database tables and feature specifications.

### 4. [Domain Model](file:///Users/vishnu/Documents/Cognitive%20loop%20-%20antigravity/Documentations/Domain%20Model.md)
*   **Purpose**: Maps the database tables, fields, composite indexes, foreign keys, and delete cascade behaviors with a clear Entity-Relationship (ER) diagram.
*   **Why read fourth**: Provides a concrete understanding of how data flows and relates across tables.

### 5. [System Architecture Doc](file:///Users/vishnu/Documents/Cognitive%20loop%20-%20antigravity/Documentations/System%20Architecture%20Doc.md)
*   **Purpose**: Details the Edge/Serverless deployment topology, local vector reranking math, and the split ingestion pipelines (Fast Path vs. Slow Path).
*   **Why read fifth**: Explains how client requests are processed, analyzed, and stored asynchronously.

### 6. [AI Pipeline Spec](file:///Users/vishnu/Documents/Cognitive%20loop%20-%20antigravity/Documentations/AI%20Pipeline%20Spec.md)
*   **Purpose**: Contains the actual system prompts, custom configurations, and strict JSON output schemas fed to Gemini and Groq models.
*   **Why read sixth**: Explains the logic behind AI-driven evaluations, entity resolutions, and decision outcome reviews.

### 7. [Engineering Standards](file:///Users/vishnu/Documents/Cognitive%20loop%20-%20antigravity/Documentations/Engineering%20Standards.md)
*   **Purpose**: Specifies coding conventions, testing assertions, database migration protocols, and observability latency metrics.
*   **Why read last**: Direct code guidelines for developers contributing to the codebase.
