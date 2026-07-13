# Phase 3: Decision Intelligence (Status: 📅 Planned)

This document outlines the detailed implementation plan for **Phase 3: Decision Intelligence**, closing the loop on choices, outcomes, and behavioral learnings.

---

## 🎯 What Will Be Done

### 1. Decision Ledger Activation
*   **What**: Capture committed decisions, target dates, and explicit success criteria.
*   **How**: Activate the `/dashboard/decisions` route. When a thought is ingested, if the AI detects a decision block (`isDecision: true`), it alerts the user in the UI, prompting them to configure expected outcome review dates and quantitative success metrics.

### 2. Expected Outcome Reminders
*   **What**: Prompt the user to review decisions when they reach their target outcome date.
*   **How**: Set up a daily CRON background job querying the `decisions` database table for items where `status = 'pending'` and `expectedOutcomeDate <= CURRENT_TIMESTAMP`. If found, triggers dashboard alerts and highlights the thought card in amber.

### 3. Retrospective Logging & Journal
*   **What**: Capture what actually happened when the decision reached its target review date.
*   **How**: Create a retrospective modal asking the user:
    *   *Status*: Success, Failed, or Neutral.
    *   *Outcome Journal*: Factual description of what happened and why.
    We save this into `decision_outcomes`.

### 4. Reusable Lesson Extraction
*   **What**: Convert decision outcomes into procedural wisdom.
*   **How**: Trigger a post-review analysis pipeline:
    1. Pass the decision title, expected success metric, and actual outcome notes to Groq.
    2. Extract a reusable takeaway ("Lesson") written in the second person.
    3. Save this takeaway to the `lessons` table, linking it back to the target PKG Entity to guide future choices on that topic.
