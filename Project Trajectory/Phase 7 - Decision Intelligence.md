# Phase 7: Decision Intelligence

This release documents the implementation of the Decision Intelligence module, adding structured commitment logging, outcome reviews, automatic decision analysis, and lesson extraction workflows.

---

## 🚀 Key Implementations

### 1. Database Schema Extensions
*   Added `lessons` table to store reusable procedural rules-of-thumb extracted from retrospective reviews.
*   Added `title` column to `decisions` table to store custom user decision contexts.
*   Migrated and synced both local SQLite database (`sqlite.db`) and remote Turso Cloud databases.

### 2. Auto-Capture & Decision Ledger API
*   Enabled Groq pipeline to automatically detect decisions (confidence $\ge 0.75$) during new thought analysis.
*   Wired `GET` and `POST` routes `/api/decisions` supporting manual links to existing thoughts and custom decision titles.
*   Created `/api/lessons` to return completed outcomes alongside original notes context and PKG entity associations.

### 3. Front-End User Experience Overhaul
*   **Decisions Dashboard**: Created the Decision Ledger tab switcher (Ledger vs. Lessons Vault) with stats analytics grid and retroactive journal drawers.
*   **Thought Details Drawer**: Integrated the "Current decisions for this thought" section displaying status metrics and a redirect link to the Ledger.
*   **Quick Add Widget**: Made the "Track Decision" form always available as a card option with date presets and click-to-open calendar events.
