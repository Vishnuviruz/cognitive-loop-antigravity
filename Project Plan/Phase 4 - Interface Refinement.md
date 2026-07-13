# Phase 4: Interface Refinement

This phase concentrates on decluttering the core interface and optimizing the cognitive loop workflow by reorganizing the menu layout and moving background reflections to async notifications.

---

## 🎯 Objectives
1. **Reorder Core Navigation Menu**: Align core menu routes to follow a logical progression: Timeline & Capture $\rightarrow$ Connections Graph $\rightarrow$ Decision Ledger $\rightarrow$ Action Center $\rightarrow$ Customize Settings.
2. **Remove Cognitive Reflections Module**: Remove reflections from the main sidebar. Reflections (weekly/monthly summaries) will run in the background (as cron tasks) and notify the user via notification triggers instead of holding a heavy interactive tab.

---

## 🏗️ Architectural Plan
*   `src/components/Sidebar.tsx`: Remove "Companion" and "Reflections" links, and reorder routes.
*   `src/app/dashboard/layout.tsx`: Re-verify routing states and default redirects to `/dashboard` matching the new structure.

---

## 🧪 Verification Plan
*   **Menu Alignment**: Confirm navigation routes follow the exact sequence.
*   **Redirects**: Test clicking all links and verifying URLs.
