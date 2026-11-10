# Google Sheet mirror

A read-only copy of Journey Tracker in a Google Sheet. It updates on its own about 20 seconds after each change, from any device. The app stays the place where you log things; the sheet is for viewing, filtering, charting and backups.

## Set up (once, about 5 minutes)

1. Create a new Google Sheet ([sheets.new](https://sheets.new)) and name it, for example "Journey Tracker".
2. In the sheet, open **Extensions → Apps Script**. Delete the sample code, paste in all of [JourneyMirror.gs](JourneyMirror.gs) and save.
3. In the app, open **Settings → Google Sheet mirror** and copy the **Secret key**. In the script, replace `PASTE-YOUR-SECRET-KEY-HERE` with it and save again.
4. In Apps Script, choose **Deploy → New deployment**, click the gear icon and pick **Web app**:
   - **Execute as:** Me
   - **Who has access:** Anyone

   Click **Deploy**. Google asks you to allow access: choose your account, then **Advanced → Go to … (unsafe) → Allow**. It shows this because the script is your own and hasn't been reviewed by Google.
5. Copy the **Web app URL** (it ends in `/exec`). In the app, paste it under **Web app URL** and press **Connect**.

The tabs appear within a few seconds. The setting syncs to all your devices, so you only connect once.

**About "Anyone":** it only means the link works without a Google sign-in, so the app can reach it. The script accepts updates only with your secret key, and it never sends your data back to anyone.

## What's in the sheet

| Tab | What it shows |
| --- | --- |
| Summary | Level, rank, XP, streaks, today's focus, revisions due, open backlog, Life level |
| Today's quests | Today's daily quests with progress |
| Daily | One row per day: focus, streak mark, study minutes, solved, learned, revised, XP, whether you fell behind, Life quest result, missed-day reason |
| Activity log | Every logged event, newest first |
| Items | Every problem, concept and design, with status, confidence, time and revision state |
| Revisions due | Overdue, today and the next 7 days |
| Revision history | Every revision you've done, including how late it was |
| Topics | Mastery per topic |
| Study sessions | Every timed session |
| Planner | Day, week and month goals, with done, open or missed |
| Backlog | Open, cleared and written-off backlog |
| XP log | Every XP entry |
| Achievements | Study and Life achievements, with progress |
| Workouts | Every set logged |
| Nutrition, Weight | Daily totals and weigh-ins |
| Personal tasks, Projects, Time log | The Personal and Time workspaces |
| Backups | The raw data, one backup per day for the last 60 days |

Every update rewrites these tabs completely, so **don't type into them**: anything you type is lost on the next update. Add your own tabs for charts, pivot tables or formulas that point at them; those are never touched.

## Restoring from a backup

1. In the sheet, open the **Journey Tracker** menu (it appears after reloading the sheet) and choose **Save a backup file to Google Drive…**.
2. Pick the day. The file `journey-backup-YYYY-MM-DD.json` appears in your Google Drive. Download it.
3. In the app:
   - For study data, use **Settings → Data → Import backup**.
   - For Personal and Time, use the import button in the header on the Personal or Time page.

## If something goes wrong

The app shows the reason under **Settings → Google Sheet mirror**.

- **"Wrong secret key"** or **"Set SECRET…"**: the key in the script doesn't match the app. After any change to the script, deploy it again: **Deploy → Manage deployments → Edit (pencil) → Version: New version → Deploy**. The URL stays the same.
- **"…opened a Google sign-in page"**: **Who has access** must be **Anyone**.
- **"Could not reach the Google Sheet"**: check the URL ends in `/exec`, and that you're online.
- **Turning it off:** press **Turn off** in Settings. The sheet keeps what it already has.
