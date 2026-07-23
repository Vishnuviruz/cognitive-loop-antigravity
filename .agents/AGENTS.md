# Workspace Custom Rules

These rules govern the development lifecycle and trajectory management of this codebase. They must be followed at all times.

---

## 1. Development Architecture Reference

- When starting any planned phase development (after user approval), always refer to:
  - The `Project Plan/` directory (for conceptual specifications).
  - The `Documentations/` directory (to ensure alignment with guidelines, database constraints, design standards, and system architecture).

## 2. Trajectory Tracking

- After successful completion of any planned phase, **stop and prompt the user** with:
  > "Can I add this Phase [X] completion and stack it in Project Trajectory?"
- Do not modify `Project Trajectory/` or create new release milestone files within it until the user has explicitly approved the addition in the chat.

## 3. Github and Code management

- After successful completion of any code changes, features, bug fixes, **stop and prompt the user** with:
  > "Can I add, commmit and push the code to the repository?"
- Do not commit, push the code until the user has explicitly approved or provide consent in the chat.
