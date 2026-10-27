import { useEffect, useMemo, useRef } from 'react';
import { Flame, Swords } from 'lucide-react';
import { useStore } from '../store/AppStore';
import { useUI } from '../store/ui';
import { lifeSummary, CLEAR_AT, type LifeSummary } from '../engine/life';
import type { PersonalTask } from '../engine/sidequests';
import { cn } from '../lib/cn';
import { Bar, Ring } from './ui';
// Personal tasks live in the original JS store.
import { useAppStore as useLegacyStore } from '../../store/AppStore';

const useLegacy = useLegacyStore as unknown as () => { personalTasks: PersonalTask[]; dataLoaded?: boolean; user?: { uid: string } };

/** The Life System summary, recomputed whenever training, food or side quests change. */
export function useLife(): LifeSummary {
  const { state, today } = useStore();
  const { personalTasks } = useLegacy();
  return useMemo(() => lifeSummary(state, personalTasks, today), [state, personalTasks, today]);
}

/** Compact status bar shown on Personal, Workout and Nutrition. */
export function LifeStrip() {
  const { state } = useStore();
  const { navigate } = useUI();
  const life = useLife();
  if (!state.settings.gamification) return null;
  const q = life.today;
  return (
    <section aria-label="Life System status" className="relative flex flex-wrap items-center gap-x-6 gap-y-3 rounded-xl border border-arc-soft/40 bg-surface px-4 py-3 shadow-glow-arc">
      <span aria-hidden="true" className="absolute -left-px -top-px h-3 w-3 rounded-tl-xl border-l-2 border-t-2 border-arc-soft" />
      <span aria-hidden="true" className="absolute -bottom-px -right-px h-3 w-3 rounded-br-xl border-b-2 border-r-2 border-arc-soft" />
      <div className="flex items-center gap-3">
        <Ring value={life.level.progress} size={44} stroke={3} tone="arc" label={`Life level ${life.level.level}`}>
          <span className="num text-sm font-semibold">{life.level.level}</span>
        </Ring>
        <div>
          <p className="num text-[10px] tracking-[0.18em] text-arc-soft">[ LIFE SYSTEM ]</p>
          <p className="text-sm font-semibold">{life.rank.name}</p>
        </div>
      </div>
      <div className="min-w-[160px] flex-1">
        <div className="flex items-baseline justify-between text-[11px] text-ink-muted">
          <span>Lv {life.level.level + 1} in</span>
          <span className="num">
            {life.level.intoLevel.toLocaleString()} / {life.level.forNext.toLocaleString()} XP
          </span>
        </div>
        <Bar value={life.level.progress} tone="arc" className="mt-1.5" label="Life XP to next level" />
      </div>
      <div className="flex items-center gap-1.5 text-sm" title="Days in a row with the Daily Quest cleared">
        <Flame size={15} className={life.streak ? 'text-ember' : 'text-ink-faint'} aria-hidden="true" />
        <span className="num font-semibold">{life.streak}</span>
        <span className="text-xs text-ink-muted">day streak</span>
      </div>
      <button
        type="button"
        onClick={() => navigate('life')}
        className={cn(
          'flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors',
          q.perfect ? 'border-jade/50 text-jade' : q.cleared ? 'border-arc-soft/50 text-arc-soft' : 'border-line-strong text-ink hover:border-violet/50',
        )}
      >
        <Swords size={14} aria-hidden="true" />
        Daily Quest <span className="num">{q.done}/{q.total}</span>
        {!q.cleared && <span className="text-[11px] text-ink-muted">· clear at {CLEAR_AT}</span>}
      </button>
    </section>
  );
}

const SEEN_KEY = 'ascend.life.seen.v1';

interface Seen {
  uid: string;
  achievements: string[];
  level: number;
  quests: string[];
}

function readSeen(): Seen | null {
  try {
    const raw = window.localStorage.getItem(SEEN_KEY);
    return raw ? (JSON.parse(raw) as Seen) : null;
  } catch {
    return null;
  }
}

function writeSeen(s: Seen) {
  try {
    window.localStorage.setItem(SEEN_KEY, JSON.stringify(s));
  } catch {
    /* storage unavailable: notifications just repeat less reliably */
  }
}

/**
 * Pops a System notification when a Life achievement unlocks, the level rises or
 * today's Daily Quest is cleared. The first run only records what is already
 * earned, so existing progress never floods the screen.
 */
export function LifeWatcher() {
  const { state, status, toast } = useStore();
  const { dataLoaded, user } = useLegacy();
  const life = useLife();
  const ready = status === 'ready' && dataLoaded !== false;
  const last = useRef<string>('');

  useEffect(() => {
    if (!ready) return;
    const uid = user?.uid ?? 'local';
    const earned = life.achievements.filter((a) => a.earned).map((a) => a.def.id);
    const quests = life.recent.filter((q) => q.cleared).map((q) => q.day);
    const key = `${uid}|${earned.join(',')}|${life.level.level}|${quests[0] ?? ''}`;
    if (key === last.current) return;
    last.current = key;

    const seen = readSeen();
    if (!seen || seen.uid !== uid) {
      writeSeen({ uid, achievements: earned, level: life.level.level, quests });
      return;
    }
    if (state.settings.gamification) {
      for (const a of life.achievements) {
        if (a.earned && !seen.achievements.includes(a.def.id)) toast({ tone: 'level', title: `[SYSTEM] Achievement unlocked: ${a.def.name}`, detail: a.def.description });
      }
      if (life.level.level > seen.level) toast({ tone: 'level', title: `[SYSTEM] Level up! Life level ${life.level.level}`, detail: `You are a ${life.rank.name}.` });
      if (life.today.cleared && !seen.quests.includes(life.today.day)) {
        toast({ tone: 'success', title: '[SYSTEM] Daily Quest cleared', detail: life.today.perfect ? 'Every objective complete. Perfect day.' : `${life.today.done}/${life.today.total} objectives. Your streak is safe.` });
      }
    }
    writeSeen({
      uid,
      achievements: [...new Set([...seen.achievements, ...earned])],
      level: Math.max(seen.level, life.level.level),
      quests: [...new Set([...quests, ...seen.quests])].slice(0, 60),
    });
  }, [ready, life, user, state.settings.gamification, toast]);

  return null;
}
