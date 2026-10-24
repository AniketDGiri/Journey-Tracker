# Ascend — Engineering Preparation Tracker

A minimalist, gamified tracker for DSA, System Design (HLD) and Low-Level Design (LLD)
interview prep, plus two workspaces for life outside it — **Personal** (to-do list,
board, projects) and **Time** (an Eisenhower time log). Everything syncs to your Google account.

XP only comes from real outcomes: solves, rubric-backed designs, spaced recalls, completed
sessions and boss assessments.

## Study

| Page | What it does |
|---|---|
| Dashboard | Level and rank, streak and shields, the single recommended next action, revision summary, quests, skill-tree overview, activity heatmap |
| DSA / System Design / Low-Level Design | One workspace per domain: a tiered skill tree with unlock rules, the item list, and that domain's revision queue |
| Revision | Overdue, due-today and weak items; focus mode walks them one card at a time |
| Quests | Daily quests, weekly challenges, topic missions and boss battles |
| Analytics | Mastery and activity over time |
| Settings | Every progression value, the revision ladder, and study-data export/import |

Shortcuts: **N** log progress · **R** revision focus mode.

- **Outcome XP** per item: Easy 10 · Medium 25 · Hard 50 (×0.5 with hints); HLD/LLD work is scaled by a
  9-point rubric. Each source is paid once — toggling statuses can't farm XP.
- **Revision ladder** `1 → 3 → 7 → 14 → 30 → 60` days. Recalled → next step, Partial → half interval,
  Forgot → back to step 1.
- **Streaks** never break on planned rest days; every 7 active days earns a shield (max 2) that covers a
  missed day.

### Where the code lives

`src/study/` is the study app (TypeScript + Tailwind):

```
src/study/
  domain/       types, default curriculum, defaults, sample data
  engine/       pure business logic: actions, revision, mastery, progression, quests, bosses, streak, recommend
  store/        React store, hash routing, schema migration, storage adapters (Firestore in production)
  components/   shell, UI kit, skill tree, heatmap, sheets (log, item, session, focus, boss, topic)
  views/        Dashboard, Workspace, Revision, Quests, Analytics, Settings
  StudyApp.tsx  the signed-in app: wires the shell, the study views and the Personal/Time pages
```

Personal and Time are plain JavaScript (`src/components/Personal`, `src/store/AppStore.jsx`).

## The Personal workspace

**Personal** is a separate to-do list for life outside the study plan. It has a grouped
**List** view and a drag-and-drop **Board**, with sections (To do / In progress / Done,
plus any you add), priority, effort, category and a date with an optional time range.

Personal tasks are completely independent of the study scoring — they earn no XP and
never touch your streak.

### Google Calendar

Any personal task with a date shows a **📅 add ↗** link that opens Google Calendar with the
event prefilled — press Save and it's in. A date alone becomes an all-day event; a date plus
start and end times becomes a timed one. Nothing to configure and no API access needed.

## Time tracker

**Time** is a day-by-day time log: one row per slot from your start hour to
your end hour (4:00 AM to 11:00 PM in 30-minute slots by default, all adjustable). Write what
you did in each slot and mark it Urgent and/or Important.

The side panel scores the day live as an Eisenhower matrix, shows the urgent/important split,
and asks the only question that really matters at the end of a day — whether you were happy
with how it went.

Only slots with something written in them count. Empty slots are untracked time, not
"neither urgent nor important".

## Personal dashboard

**Personal → Dashboard** aggregates the time log over 7, 30 or 90 days: days and hours
tracked, the share of important and urgent work, your Eisenhower split, hours per day, your
biggest time sinks by name, and the to-do list broken down by section and category.

It also compares the share of *important-but-not-urgent* time on days you rated good against
days you rated bad — the one number worth trying to move.

## Run it locally

```bash
npm install
npm run dev
```

`npx tsc -p tsconfig.json` type-checks the study code (Vite strips types without checking them).

## Your data

Sign in with Google; everything is stored privately under your account in Firestore and
syncs across devices:

- `users/{uid}/appData/ascend` — study progress
- `users/{uid}/appData/main` — Personal and Time

Study data has its own export/import in **Settings → Data**. On the Personal and Time pages,
**Export** / **Import** in the header back up those two.
