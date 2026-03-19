# Changelog / What's New Feature — Design

## Goal

Show users a modal on login with recent app changes they haven't seen yet. Skip the modal if they're caught up.

## Data Model

**Static changelog file** (`src/lib/changelog.ts`) — a TypeScript array of entries, newest first. Each entry has a sequential ID (`"001"`, `"002"`, ...), date, title, and short description. Developer-maintained, version-controlled.

**User tracking** — add `last_seen_changelog varchar` column to `therapist_settings` table. Stores the highest changelog ID the user has dismissed. Default `null` = hasn't seen any.

## Flow

1. User lands on `/dashboard` after login
2. Dashboard page reads `therapist_settings.last_seen_changelog`
3. Filters changelog entries where `id > last_seen_changelog` (or all if null)
4. If unseen entries exist → render a Dialog modal listing them
5. User clicks "Got it" → server action sets `last_seen_changelog` to latest ID
6. No unseen entries → no modal

## UI

- Dialog modal titled "What's New"
- List of unseen entries: date + title + description
- Single "Got it" button to dismiss
- No sidebar link (YAGNI — can add later if users want to revisit)

## Adding New Changelog Entries

When shipping a feature, add an entry to the top of `CHANGELOG` array in `src/lib/changelog.ts` with the next sequential ID. That's it — no migration, no deploy step.
