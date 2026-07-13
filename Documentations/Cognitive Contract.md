# The Cognitive Contract
**Version:** 1.1.0  
**Status:** Frozen  

This contract defines the fundamental terminology, behavioral parameters, and conceptual constraints of the **Cognitive Loop** platform. Every database schema, API design, AI prompt, background job, and UI layout must strictly adhere to these definitions to prevent conceptual drift.

---

## 1. The Cognition Hierarchy

To define the responsibility of each subsystem, we formally establish the hierarchy of cognition:

*   **Information**: Raw, unstructured observations and events.
    *   *System Mapping*: Episodic Memory (`thoughts`, voice notes, meetings).
    *   *Core Question*: "What happened?"
*   **Knowledge**: Connected information that creates context.
    *   *System Mapping*: Semantic Memory (Entities and Relationships in the PKG).
    *   *Core Question*: "What is related?"
*   **Understanding**: Recognition of underlying patterns, intentions, and structures.
    *   *System Mapping*: Decision Intelligence (`decisions` and `decision_outcomes`).
    *   *Core Question*: "Why did this happen, and what does it mean?"
*   **Wisdom**: The ability to execute better future decisions by learning from previous outcomes.
    *   *System Mapping*: Procedural Memory (`lessons` and `behavioral_patterns`).
    *   *Core Question*: "How should I act next time based on what I've learned?"

---

## 2. The Core Cognitive Loop Cycle

The primary behavioral cycle of the platform is an explicit loop. Every component or feature must strengthen one or more stages of this cycle:

$$\text{Experience} \rightarrow \text{Capture} \rightarrow \text{Understanding} \rightarrow \text{Connection} \rightarrow \text{Decision} \rightarrow \text{Action} \rightarrow \text{Outcome} \rightarrow \text{Reflection} \rightarrow \text{Learning} \rightarrow \text{Behavior Adaptation} \rightarrow \text{Future Experience}$$

The loop is closed when a learning directly produces a **positive behavioral adaptation** in a future experience.

---

## 3. Core Domain Language

### Thought
An immutable episodic record of a user's experience. Once written or transcribed, its raw content and timestamp can never be modified. Serves as the primary evidence source.

### Entity
A normalized, mutable concept representing a project, technology, person, goal, company, or concept. Separated from thoughts so that the knowledge base remains clean and searchable.

### Relationship
A semantic link between two Entities, determined by AI reasoning and backed by historical evidence. Every relationship must be explainable.

### Decision
A commitment to a specific choice, action, or policy, associated with a success metric and an expected outcome date.

### Outcome
The factual, verified result of a Decision, captured at or after its expected outcome date and compared directly against its success metric.

### Lesson
A synthesized takeaway extracted by comparing a Decision's metrics against its actual Outcome, linked back to relevant Entities to improve future choices.

### Cognitive Pattern
An observed behavioral tendency or bias (e.g., tech stack analysis paralysis, late-night ideation spikes) extracted by background analysis of user behavior.

---

## 4. Fundamental Cognitive Principles

### A. Sovereign Explainability
Every AI-generated relationship, decision alert, or insight must be fully explainable. The system must always be able to answer:
1.  What evidence (Thoughts) produced this?
2.  Why was this recommendation generated?
3.  Which memories influenced this answer?
4.  What confidence score supports this conclusion?

### B. User-Owned Personalization
Every personalization layer—including the PKG, Decision History, Behavior Patterns, and the Cognitive Profile—is owned entirely by the user. This data is strictly private and must never be used to train global, multi-tenant AI models.

### C. Evolving Memory Lifecycle
Memory does not accumulate indefinitely; it evolves. The memory lifecycle is defined as:
$$\text{Capture} \rightarrow \text{Understanding} \rightarrow \text{Connection} \rightarrow \text{Strengthening} \rightarrow \text{Consolidation} \rightarrow \text{Compression} \rightarrow \text{Archiving} \rightarrow \text{Reactivation}$$
The goal of Memory Consolidation is increasing cognitive clarity, not database storage optimization. Original thoughts remain preserved as immutable historical evidence, while active retrieval focuses on the synthesized understanding.

### D. Narrative-First UX
The Personal Knowledge Graph is an internal reasoning model, not the primary user interface. Users interact with narrative experiences (Decision Journeys, Idea Evolution, Learning Timelines, Belief Changes, Memory Trails) rather than complex graphs.
