# Google Sheet mirror

Journey Tracker in a Google Sheet, both ways:

- **App → sheet:** a full copy of your data. It updates on its own about 20 seconds after each change, from any device.
- **Sheet → app:** you can log from the sheet too. The app picks your entries up about once a minute while it's open, and applies them with its normal rules, so XP, quests, streaks, backlog and revisions all update as if you'd done it in the app.

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

**Already using the sheet mirror?** Two-way sync needs the new script. In Apps Script, select everything, paste the new [JourneyMirror.gs](JourneyMirror.gs) over it, and put your secret key back in. Then choose **Deploy → Manage deployments**, click the pencil, set **Version: New version**, and click **Deploy**. The URL stays the same. Google may ask you to allow access again.

**About "Anyone":** it only means the link works without a Google sign-in, so the app can reach it. The script accepts updates only with your secret key, and it never sends your data back to anyone.

## Logging from the sheet

Green headers mark what you can write in.

| Where | What it does |
| --- | --- |
| **Items** › **Log now** | Pick a result for an item: Attempted, Unsolved, Done with hints, Done on my own, or a revision (recalled, partly, forgot). |
| **Revisions due** › **Revise now** | Log a revision: Recalled, Partly or Forgot. |
| **Personal tasks** › **Done** | Tick to complete a task, untick to reopen it. |
| **✎ Study log** | One row per thing you worked on: date (empty = today), item, result, and optional minutes and confidence. |
| **✎ Study time** | Time studied: date, domain (or an item), minutes, and what you did. |
| **✎ New task** | Add a personal task: section, priority, effort, category and due date. |
| **✎ Time slot** | Fill a slot of your day: date, slot, what you did, and whether it was urgent or important. |
| **✎ Weight** | Date and kg. |

**How it flows:**

- The **Status** column on each ✎ tab, and the **Sync log** tab for dropdowns and checkboxes, shows what happened to each entry: *Waiting for the app…*, then ✓ when it's applied, or ✗ with the reason (for example "That date is in the future"). Fix a ✗ row and it's tried again.
- A row you've edited in the last 20 seconds waits, so the app never picks up a half-typed row.
- The app has to be open somewhere (any tab, any device) to apply entries. They wait in the sheet until it is.
- Each entry is applied once, even with the app open on two devices.
- To log the same thing again, add a new row. Editing a ✓ row doesn't apply it a second time.
- The read-only tabs are rewritten from the app. Typing anywhere other than the green columns has no effect; it's replaced on the next update.

## What's in the sheet

| Tab | What it shows |
| --- | --- |
| Summary | Level, rank, XP, streaks, today's focus, revisions due, open backlog, Life level |
| ✎ Study log, Study time, New task, Time slot, Weight | Where you log from the sheet (see above) |
| Sync log | What happened to each change made with the Log now, Revise now and Done columns |
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

Every update rewrites the copied tabs completely. Only the green columns and the ✎ tabs are yours to write in; anything typed elsewhere is lost on the next update. Add your own tabs for charts, pivot tables or formulas that point at them; those are never touched.

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
- **Entries stay on "Waiting for the app…":** open the app (on any device) and wait a minute. Settings → Google Sheet mirror shows when it last checked the sheet, and any error.
- **Turning it off:** press **Turn off** in Settings. The sheet keeps what it already has.
