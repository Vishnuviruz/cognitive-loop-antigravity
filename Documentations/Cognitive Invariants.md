# Cognitive Invariants
**Version:** 1.0.0  
**Status:** Frozen  

This document outlines the **Cognitive Invariants** of the Cognitive Loop platform. These are the immutable engineering and philosophical constraints of the codebase. Unlike normal implementation decisions, these invariants must not be changed, bypassed, or compromised by any future updates or features.

---

## The Invariant Laws

### Invariant 1: Episodic Integrity & Immutability
*   **The Law**: A **Thought** (Episodic Memory) represents the user's raw experience. The **AI** is strictly forbidden from modifying or overwriting the user's raw thought content. The **user** retains the sovereign right to edit or delete their thoughts. When a user edits a thought, the system must handle it by re-running the ingestion pipeline (re-computing embeddings, summaries, and relationships) to keep the Knowledge Graph dynamically aligned, without corrupting the historical record.
*   **Rationale**: Episodic memory serves as the foundation of user evidence. While the user can refine their thoughts, the AI must never independently alter what the user has logged.

### Invariant 2: Sovereign Explainability
*   **The Law**: Every **Relationship** and AI-generated insight in the Personal Knowledge Graph (PKG) must possess a clear, explainable audit trail of supporting or contradicting episodic evidence (Thoughts).
*   **Rationale**: Trust is the primary constraint of a second brain. The user must always be able to click on any link or recommendation and see the exact raw thoughts that led the system to that conclusion.

### Invariant 3: Evidence-Driven Evolution
*   **The Law**: Semantic knowledge and relationship confidence must evolve based on concrete **Evidence** (reinforcements or contradictions in thoughts) rather than arbitrary time-based decay.
*   **Rationale**: Concepts do not lose truth value simply because time passes. A startup's core values remain valid even if the user doesn't log them for months. Confidence changes only when new information supports or contradicts them.

### Invariant 4: User Sovereignty
*   **The Law**: User corrections always override AI assumptions. If a user merges two entities, deletes a relationship, or corrects a decision classification, the AI must lock that state and never attempt to auto-revert it.
*   **Rationale**: The user is the master of their own mind. The AI is a helper. Under no circumstances should the system fight the user for semantic control of their graph.

### Invariant 5: Local Foundation First
*   **The Law**: Personal knowledge forms the foundation; world knowledge enriches it—never the other way around. The system must always prioritize RAG lookup against the user's personal context before executing web searches or inserting general knowledge.
*   **Rationale**: Cognitive Loop is a personal reasoning assistant, not a search engine. Bringing in outside world knowledge is only valuable when framed through the exact lens of what the user already knows and wants to achieve.

### Invariant 6: Lossless Consolidation
*   **The Law**: Memory Consolidation must never delete the underlying raw episodic records. It synthesizes understanding, but the original thoughts remain linked as evidence.
*   **Rationale**: We compress thoughts to reduce retrieval noise and context window bloat, but the historical details must remain accessible. The user must always be able to drill down into the raw logs.

### Invariant 7: Clarity Over Volume
*   **The Law**: Every AI response must optimize for increasing the user's clarity, not increasing information density.
*   **Rationale**: The product's value is in filtering noise. Adding walls of AI text, summary statistics, or redundant badges violates this principle. The UI must present only the highest-value insights.

### Invariant 8: Behavioral Success Metric
*   **The Law**: The ultimate metric of system success is positive behavioral change (better decisions made, mistakes avoided). Engagement metrics (time spent in app, notes logged) are secondary.
*   **Rationale**: A successful session is one where a user logs a thought, gets a key insight or decision correction, and closes the app to take action in the real world.
