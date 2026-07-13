# Phase 6: World Knowledge Fusion (Status: 📅 Planned)

This document outlines the detailed implementation plan for **Phase 6: World Knowledge Fusion**, supplementing private memory with outside context.

---

## 🎯 What Will Be Done

### 1. Local Foundation Priority Routing
*   **What**: Enforce that the AI search companion always prioritizes the user's private mind maps over external data.
*   **How**: When a prompt is entered, the server runs a semantic lookup inside their thoughts. If matched, it uses that context. If a user asks a question about external details (e.g. "What is the latest version of Next.js?"), the system triggers the external search pipeline.

### 2. External Query & Web Search Enrichment
*   **What**: Enrich internal thought notes with relevant developer documentation or web articles.
*   **How**: Integrate search engine APIs (e.g., Google Search, Brave Search) within the chat/analysis backend. The LLM extracts queries (e.g. "Check Next.js documentation for Route Handlers"), fetches web results, converts them to Markdown, and synthesizes it.

### 3. Contextual Documentation Overlay UI
*   **What**: Display external references cleanly next to thoughts or chat answers.
*   **How**: Design an overlay sidebar widget showing retrieved documentation articles, references, and external links, ensuring the user's timeline remains clean.
