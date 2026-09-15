import { useMemo } from 'react'
import { useAppStore } from '../../store/AppStore'

export const STUDY_CATEGORY_LIST = 'study-categories'

/**
 * Every category used anywhere on the study side. Derived rather than kept as a
 * separate list, so typing one on a task makes it available to the Study Log and
 * the Revision Tracker immediately, with no way for the two to drift apart.
 */
export function useStudyCategories() {
  const { tasks, sessions, revisions } = useAppStore()
  return useMemo(() => {
    const seen = new Set()
    for (const list of [tasks, sessions, revisions]) {
      for (const x of list) {
        const c = x.category?.trim()
        if (c) seen.add(c)
      }
    }
    return [...seen].sort((a, b) => a.localeCompare(b))
  }, [tasks, sessions, revisions])
}

/** Render once per tab; category inputs reference it by id. */
export function StudyCategoryDatalist() {
  const categories = useStudyCategories()
  return (
    <datalist id={STUDY_CATEGORY_LIST}>
      {categories.map((c) => <option key={c} value={c} />)}
    </datalist>
  )
}
