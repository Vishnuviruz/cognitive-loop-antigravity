# Phase 5: Meta-Cognition (Status: 📅 Planned)

This document outlines the detailed implementation plan for **Phase 5: Meta-Cognition**, monitoring user reasoning and highlighting biases.

---

## 🎯 What Will Be Done

### 1. Private Cognitive Profile Synthesis
*   **What**: Maintain a private profile summarizing the user's active goals, rules of thumb, behavioral traits, and recurring traps.
*   **How**: Run an offline worker that analyzes the user's logs (thoughts, decision outcomes, lessons). It updates a secure `CognitiveProfile` markdown document containing their current mental priorities and patterns.

### 2. RAG Thinking Companion (Coaching Chat)
*   **What**: Provide a personalized RAG chat coach that acts as a sounding board.
*   **How**: Upgrade the `/dashboard/chat` window to pull the user's private Cognitive Profile and relevant past thoughts. The LLM acts as a coach (e.g. "Vishnu, you previously logged a lesson to avoid choosing complex databases for simple MVPs...").

### 3. Automated Bias Detection Alerts
*   **What**: Scan incoming thoughts to identify logical fallacies or biases.
*   **How**: During capture analysis, Groq parses thoughts against common bias triggers (e.g., Sunk Cost Fallacy, Confirmation Bias, planning fallacy). If a bias is detected, it logs it in `behavioral_patterns` and appends a Jarvis critique alert to the thought card.
