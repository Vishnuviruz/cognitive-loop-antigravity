'use client';

// Client-side local storage manager for customisations

export interface PriorityOption {
  level: string;
  color: string;
  custom?: boolean;
}

export interface StatusOption {
  name: string;
  desc: string;
  custom?: boolean;
}

const DEFAULT_CATEGORIES = ['Work', 'Personal', 'Fitness', 'Finance', 'Ideas', 'Others'];
const DEFAULT_TAGS = ['productivity', 'saas', 'design', 'development', 'organization', 'features'];
const DEFAULT_PRIORITIES: PriorityOption[] = [
  { level: 'High', color: 'text-red-400 bg-red-500/10 border-red-500/20' },
  { level: 'Medium', color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' },
  { level: 'Low', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' }
];
const DEFAULT_STATUSES: StatusOption[] = [
  { name: 'Pending', desc: 'Task is waiting to be started' },
  { name: 'In Progress', desc: 'Currently being actively worked on' },
  { name: 'Completed', desc: 'Successfully accomplished' },
  { name: 'Dismissed', desc: 'Archived or no longer relevant' }
];

export function getCustomCategories(): string[] {
  if (typeof window === 'undefined') return DEFAULT_CATEGORIES;
  const stored = localStorage.getItem('custom_categories');
  return stored ? JSON.parse(stored) : DEFAULT_CATEGORIES;
}

export function saveCustomCategories(categories: string[]) {
  if (typeof window !== 'undefined') {
    localStorage.setItem('custom_categories', JSON.stringify(categories));
    window.dispatchEvent(new Event('customSettingsUpdated'));
  }
}

export function getCustomTags(): string[] {
  if (typeof window === 'undefined') return DEFAULT_TAGS;
  const stored = localStorage.getItem('custom_tags');
  return stored ? JSON.parse(stored) : DEFAULT_TAGS;
}

export function saveCustomTags(tags: string[]) {
  if (typeof window !== 'undefined') {
    localStorage.setItem('custom_tags', JSON.stringify(tags));
    window.dispatchEvent(new Event('customSettingsUpdated'));
  }
}

export function getCustomPriorities(): PriorityOption[] {
  if (typeof window === 'undefined') return DEFAULT_PRIORITIES;
  const stored = localStorage.getItem('custom_priorities');
  return stored ? JSON.parse(stored) : DEFAULT_PRIORITIES;
}

export function saveCustomPriorities(priorities: PriorityOption[]) {
  if (typeof window !== 'undefined') {
    localStorage.setItem('custom_priorities', JSON.stringify(priorities));
    window.dispatchEvent(new Event('customSettingsUpdated'));
  }
}

export function getCustomStatuses(): StatusOption[] {
  if (typeof window === 'undefined') return DEFAULT_STATUSES;
  const stored = localStorage.getItem('custom_statuses');
  return stored ? JSON.parse(stored) : DEFAULT_STATUSES;
}

export function saveCustomStatuses(statuses: StatusOption[]) {
  if (typeof window !== 'undefined') {
    localStorage.setItem('custom_statuses', JSON.stringify(statuses));
    window.dispatchEvent(new Event('customSettingsUpdated'));
  }
}
