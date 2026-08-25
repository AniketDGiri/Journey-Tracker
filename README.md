# Journey Tracker

A personal discipline tracker for your HLD → LLD → DSA interview-prep journey, plus a
second tab for daily/weekly office & personal tasks.

Everything is a single React app — **no backend, no database, no login**. All your
data (tasks, check-offs, phase dates) is saved in your browser's local storage, so it
stays private to your device/browser.

## Features

**Study Plan tab**
- HLD / LLD / DSA phases with editable start/end dates (HLD defaults to today → Nov 15, 2026)
- Countdown to your HLD deadline, shown front and center
- Daily / weekly / monthly task checklists per phase
- A streak counter (consecutive days you completed all daily study tasks)
- A GitHub-style heatmap of the last 14 weeks of daily completion, to visualize discipline

**Life Tasks tab**
- Office / personal task checklists, daily and weekly
- One-click "📅 Add to Google Calendar" button on every task — it opens Google Calendar
  with the event pre-filled (recurring daily or weekly) so you just hit Save. No Google
  login or API keys needed, and Google Calendar's own notifications take care of reminders.

**Both tabs**
- Export/Import backup (JSON) — use this to move your data between devices or back it up,
  since it never leaves your browser otherwise.

## Run it locally

```bash
npm install
npm run dev
```

## Deploy to Netlify (so you can access it from anywhere)

### Option A — drag & drop (fastest, no git needed)

1. Build it: `npm run build` (creates a `dist/` folder)
2. Go to https://app.netlify.com/drop
3. Drag the `dist` folder onto the page
4. Netlify gives you a live URL immediately (you can rename it in Site settings)

### Option B — connect to Git (auto-redeploys on every push)

1. Push this project to a GitHub/GitLab/Bitbucket repo
2. In Netlify: **Add new site → Import an existing project** → pick the repo
3. Build settings are already set via `netlify.toml`:
   - Build command: `npm run build`
   - Publish directory: `dist`
4. Deploy — future pushes to the repo redeploy automatically

Either way, once deployed you can open the Netlify URL from your phone, laptop,
anywhere — it's just a website. Since it's a single-page app, `netlify.toml` includes
the redirect rule needed so refreshing the page doesn't 404.

## A note on your data

Because there's no backend, your tasks live in that browser's local storage only.
If you deploy to Netlify and open it on your phone, that's a **separate** local
storage from your laptop. Use **Export backup** on one device and **Import backup**
on the other to keep them in sync, or just pick one device as your source of truth.

If down the road you want real cross-device sync, that would need adding a small
database + backend (e.g. Supabase or a Node/Express API) — happy to add that later
if this local-storage version starts to feel limiting.
