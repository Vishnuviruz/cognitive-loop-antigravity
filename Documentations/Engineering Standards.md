# Engineering Standards
**Version:** 1.0.0  
**Status:** Frozen  

This document outlines the coding standards, testing configurations, migration policies, and observability guidelines for **Cognitive Loop**.

---

## 1. Coding Conventions

*   **Runtime**: Node.js v20+, TypeScript v5+.
*   **React Conventions**: React 19 Client components must use `'use client'` at the very top. Leverage standard React Hooks (`useState`, `useEffect`, `useMemo`) for local layout states.
*   **Next.js Routings**: API endpoints must be structured as server-side Next.js route handlers (`route.ts`).
*   **Database Interactions**: Use Drizzle ORM query builders for standard operations. Direct SQL strings are discouraged unless writing custom SQLite FTS virtual table triggers.

---

## 2. Testing Strategy

### Unit Testing
*   **Framework**: Vitest / Jest.
*   **Targets**:
    *   *Cosine Similarity*: Verify that the similarity function handles floating-point math, differing vector lengths (returns 0), and zero-magnitude vectors correctly.
    *   *Reranking Math*: Validate that the mathematical rerank formula sorts correctly and matches expected weight combinations.

### Integration Testing
*   **Targets**:
    *   *API Ingestion Endpoint (`/api/thoughts`)*: Test with mock request payloads containing customization lists to verify schema validation.
    *   *Session Auth Middleware*: Verify that unauthenticated requests are rejected with 401s and redirect headers are appended correctly.

---

## 3. Database Migrations

*   **Tools**: Drizzle-Kit.
*   **Rules**:
    1.  Never manually edit local `sqlite.db` schemas or remote Turso production tables.
    2.  Write schemas in `src/db/schema.ts` $\rightarrow$ run `npm run db:generate` $\rightarrow$ inspect generated SQL migrations in `drizzle/`.
    3.  Apply using `npm run db:push` in local development.
    4.  Production migrations are executed via the CI/CD pipeline on build before server deployment.

---

## 4. Observability & Logging

### Level Conventions
*   `console.log`: Used for tracing high-level pipeline entries (e.g., "Initiating Fast Path for thought x").
*   `console.error`: Used for database failures, transaction rollbacks, or LLM network timeouts. Always output the stack trace: `console.error('Task ingestion failed:', error)`.

### Observability Metrics
We track:
*   **Fast Path Ingestion Latency**: Milliseconds elapsed between request start and JSON response dispatch (target: < 1.2s).
*   **Reranking Performance**: Milliseconds elapsed for sorting and similarity calculations (target: < 15ms).
*   **Token Consumption**: Track input/output tokens on LLM responses to monitor operational cost efficiency.
