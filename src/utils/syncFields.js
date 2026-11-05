/**
 * Field-level sync for the Personal and Time document. `synced` is each field as
 * this tab last loaded or saved it; a field whose value is no longer that object
 * has been edited here. Fields are replaced whole, so a tab that only touched
 * `personalTasks` must never write `timeLog` (a stale copy of it would wipe days
 * logged on another device), and a field it hasn't touched should follow the
 * other device instead of staying stale.
 */

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b)

/** The fields edited in this tab since the last sync. */
export const changedFields = (fields, data, synced) => fields.filter((f) => data[f] !== synced[f])

/**
 * Folds what another tab or device saved into this tab. Fields edited here keep
 * their local value (they are written on the next save); the rest take the remote
 * value. Returns null when nothing needs to change.
 */
export function adoptRemote(fields, data, synced, remote) {
  const nextData = { ...data }
  const nextSynced = { ...synced }
  let changed = false
  for (const f of fields) {
    if (data[f] !== synced[f] || same(remote[f], synced[f])) continue
    nextData[f] = remote[f]
    nextSynced[f] = remote[f]
    changed = true
  }
  return changed ? { data: nextData, synced: nextSynced } : null
}
