# Consistency Tracker

A web version of the FAANG Study Consistency Tracker spreadsheet. Same rules, same
maths — but the daily planner, weekly review and monthly rollups recompute themselves
as you log sessions, and everything syncs to your Google account.

The rule of the system: **consistency beats intensity**. A single huge day is capped;
a chain of ordinary days is not.

## How it works

You log study sessions and keep a task list. Everything else is derived.

- **Mon–Fri are required**, Sat/Sun are pure bonus — resting on a weekend never breaks anything.
- A day is **won** by hitting the Minimum Win (1h by default) *or* by ticking your Main Task.
- **XP is never subtracted.** Missing a day costs momentum, not points. A weekday is capped
  at 100 XP so a ten-hour day cannot buy four days off.
- **Recovery tokens** (earned every 10 successful required days, max 2) can protect your
  streak on one missed weekday.
- The recommended daily target **never inflates** to make up lost hours.

## Tabs

| Tab | What it does |
|---|---|
| 🏠 Dashboard | Today's target and win, level and XP, show-up rate, countdown, this week, recovery, momentum, consistency heatmap |
| 📅 Planner | One row per day. You fill in Main Task, Done, Notes and (rarely) Protect — hours, XP, streak, productivity and status compute themselves |
| ✅ Task Bank | Your task list. Give a task a planned date and it becomes that day's plan and feeds the anti-overplanning check |
| ⏱️ Study Log | One row per session, plus a live timer. Start and end times compute the duration (overnight sessions wrap correctly), or just type the hours |
| 📊 Weekly | Week summary, behaviour-based weekly challenge, plan-quality score, and the reflection prompts |
| 🗓️ Monthly | Month rollups and your own monthly goals |
| 🔄 Revision | Spaced repetition — review dates schedule themselves from your confidence score |
| 📈 Progress | Every headline number, plus hours, consistency and cumulative XP per week |
| 🏆 Achievements | 20 achievements that unlock themselves and can never be lost |
| ⚙️ Settings | Every constant the system uses. Nothing is hard-coded anywhere else |

## Where the logic lives

`src/engine/` is a direct port of the spreadsheet's formulas and has no React in it:

- `config.js` — the Settings sheet: targets, XP values, levels, challenge menus
- `days.js` — the Daily Planner: per-day hours, XP, productivity, streak, miss-run, phoenix
- `weeks.js` — the Weekly Review: consistency, plan score, challenges, momentum
- `months.js` — the Monthly Goals rollup
- `revision.js` — the spaced-repetition intervals
- `stats.js` — the Gamification sheet: XP ledger, level, streaks, recovery, messages
- `achievements.js` — the achievement definitions

## The Personal workspace

The header switches between two workspaces: **🎯 System Design** (everything above) and
**🏠 Personal**, a separate to-do list for life outside the study plan. It has a grouped
**List** view and a drag-and-drop **Board**, with sections (To do / In progress / Done,
plus any you add), priority, effort, category and a date with an optional time range.

Personal tasks are completely independent of the study scoring — they earn no XP and
never touch your streak or consistency.

### Google Calendar

Any personal task with a date shows a **📅 add ↗** link that opens Google Calendar with the
event prefilled — press Save and it's in. A date alone becomes an all-day event; a date plus
start and end times becomes a timed one. Nothing to configure and no API access needed.

## Time tracker

**🏠 Personal → ⏳ Time** is a day-by-day time log: one row per slot from your start hour to
your end hour (4:00 AM to 11:00 PM in 30-minute slots by default, all adjustable). Write what
you did in each slot and mark it Urgent and/or Important.

The side panel scores the day live as an Eisenhower matrix, shows the urgent/important split,
and asks the only question that really matters at the end of a day — whether you were happy
with how it went.

Only slots with something written in them count. Empty slots are untracked time, not
"neither urgent nor important".

## Personal dashboard

**🏠 Personal → 📊 Dashboard** aggregates the time log over 7, 30 or 90 days: days and hours
tracked, the share of important and urgent work, your Eisenhower split, hours per day, your
biggest time sinks by name, and the to-do list broken down by section and category.

It also compares the share of *important-but-not-urgent* time on days you rated good against
days you rated bad — the one number worth trying to move.

## Run it locally

```bash
npm install
npm run dev
```

## Your data

Sign in with Google; everything is stored privately under your account in Firestore and
syncs across devices. **Export backup** / **Import backup** in the header give you a JSON
copy you can keep or move.
