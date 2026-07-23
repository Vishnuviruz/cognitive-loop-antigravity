# Phase 6.1: Interface & Mode Extensions

This specification details the user-interface modifications, light/dark styling mode support, and card-based contextual AI conversation workflows.

## 🗺️ Progression Targets

### 1. Sidebar Refinements
- **Module Names**: Update navigation item names in `Sidebar.tsx` to:
  * `Add thoughts` (href: `/dashboard`)
  * `AI insights` (href: `/dashboard/reflections`)
  * `Plan Tasks` (href: `/dashboard/decisions`)
  * `Do Actions` (href: `/dashboard/actions`)
  * `Settings` (href: `/dashboard/settings`)
- **Module Hiding**: Hide `Connections & Ideas` module from the navigation sidebar.

### 2. Theme Toggle Switcher
- **Themes**: Implement a togglable class-based Light and Dark theme mode.
- **Root styles**: Customize root CSS variables inside `globals.css` to map background colors, foreground elements, card layouts, and inputs seamlessly.
- **Controls**: Mount a theme-switching toggler icon at the bottom of the sidebar.

### 3. Contextual Chat Prompts
- **Thought Card Action**: Add a message chat icon to every thought card in the timeline ledger.
- **Event dispatching**: Dispatching browser events to `FloatingCompanion.tsx`.
- **Initialization**: Automatically instantiate a new chat session grounded with the thought's content.
