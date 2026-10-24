import { useRef, useState } from 'react';
import { Download, Upload } from 'lucide-react';
import type { Settings as S, XpRules } from '../domain/types';
import { DEFAULT_SETTINGS } from '../domain/defaults';
import { useStore } from '../store/AppStore';
import { updateSettings, validateIntervals } from '../engine/actions';
import { migrate, toExport } from '../store/schema';
import { Button, Field, Panel, Segmented, Toggle } from '../components/ui';
import { cn } from '../lib/cn';

const XP_FIELDS: [keyof XpRules, string][] = [
  ['solveEasy', 'Easy problem'],
  ['solveMedium', 'Medium problem'],
  ['solveHard', 'Hard problem'],
  ['conceptLearned', 'Concept learned'],
  ['designComplete', 'HLD design (full rubric)'],
  ['lldImplemented', 'LLD build (full rubric)'],
  ['reviewSuccess', 'Recall: success'],
  ['reviewPartial', 'Recall: partial'],
  ['reviewFail', 'Recall: forgot'],
  ['sessionComplete', 'Session completed'],
  ['dailyQuest', 'Daily quest'],
  ['weeklyChallenge', 'Weekly challenge'],
  ['mission', 'Mission (prove topic)'],
  ['achievement', 'Achievement'],
];

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function Settings() {
  const { state, act, replace, startSample, startFresh, toast } = useStore();
  const s = state.settings;
  const [intervals, setIntervals] = useState(s.intervals.join(', '));
  const [confirm, setConfirm] = useState<null | 'fresh' | 'sample'>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const set = (patch: Partial<S>, msg = 'Settings saved') => act((st) => updateSettings(st, patch), { success: msg });

  const parsedIntervals = intervals.split(/[,\s→]+/).filter(Boolean).map(Number);
  const intervalErr = validateIntervals(parsedIntervals);

  const exportData = () => {
    const blob = new Blob([JSON.stringify(toExport(state), null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ascend-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ tone: 'success', title: 'Backup downloaded' });
  };

  const importData = async (file: File) => {
    try {
      const data = migrate(JSON.parse(await file.text()));
      if (!window.confirm(`Replace current data with “${file.name}”? (${data.items.length} items, ${data.xp.length} XP events)`)) return;
      replace(data, 'Backup imported');
    } catch (e) {
      toast({ tone: 'error', title: 'Import failed', detail: e instanceof Error ? e.message : 'Invalid file' });
    } finally {
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const num = (v: string, fallback: number) => {
    const n = Number(v);
    return Number.isFinite(n) && n >= 0 ? n : fallback;
  };

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Panel title="Profile & experience">
        <div className="flex flex-col gap-5">
          <Field label="Display name" htmlFor="set-name">
            <input id="set-name" className="st-input" defaultValue={s.playerName} onBlur={(e) => e.target.value !== s.playerName && set({ playerName: e.target.value.trim().slice(0, 40) })} placeholder="Optional" />
          </Field>
          <Field label="Journey target date" htmlFor="set-target" hint="The dashboard counts down to this day.">
            <input
              id="set-target"
              type="date"
              className="st-input num w-48"
              value={s.targetDate}
              onChange={(e) => e.target.value && set({ targetDate: e.target.value }, 'Target date updated')}
            />
          </Field>
          <Toggle
            checked={s.gamification}
            onChange={(v) => set({ gamification: v }, v ? 'Gamification on' : 'Gamification off — tracking and revision still work')}
            label="Gamification layer"
            description="XP, ranks, quests, bosses and achievements. Turn off for a pure tracker; nothing is lost."
          />
          <Field label="Motion">
            <Segmented
              label="Motion"
              size="sm"
              value={s.reducedMotion}
              onChange={(v) => set({ reducedMotion: v })}
              options={[
                { value: 'system', label: 'Follow system' },
                { value: 'on', label: 'Reduce motion' },
                { value: 'off', label: 'Full motion' },
              ]}
            />
          </Field>
        </div>
      </Panel>

      <Panel title="Daily targets">
        <div className="grid grid-cols-2 gap-4">
          {(
            [
              ['dsaPerDay', 'DSA problems / day'],
              ['hldPerDay', 'HLD items / day'],
              ['lldPerDay', 'LLD items / day'],
              ['reviewsPerDay', 'Max revisions quest'],
            ] as const
          ).map(([k, label]) => (
            <Field key={k} label={label} htmlFor={`t-${k}`}>
              <input
                id={`t-${k}`}
                className="st-input num"
                type="number"
                min={0}
                max={20}
                defaultValue={s.targets[k]}
                onBlur={(e) => {
                  const v = Math.min(20, Math.round(num(e.target.value, s.targets[k])));
                  if (v !== s.targets[k]) set({ targets: { ...s.targets, [k]: v } });
                }}
              />
            </Field>
          ))}
          <Field label="Study time goal / day (hours)" htmlFor="t-minutes">
            <input
              id="t-minutes"
              className="st-input num"
              type="number"
              min={0.25}
              max={16}
              step={0.25}
              defaultValue={s.targets.minutesPerDay / 60}
              onBlur={(e) => {
                const v = Math.round(Math.min(16, Math.max(0.25, num(e.target.value, s.targets.minutesPerDay / 60))) * 60);
                if (v !== s.targets.minutesPerDay) set({ targets: { ...s.targets, minutesPerDay: v } }, 'Study time goal updated');
              }}
            />
          </Field>
        </div>
        <div className="mt-5">
          <p className="mb-2 text-xs font-medium text-ink-soft">Planned rest days</p>
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Planned rest days">
            {DAYS.map((d, i) => {
              const on = s.restDays.includes(i);
              return (
                <button
                  key={d}
                  type="button"
                  aria-pressed={on}
                  onClick={() => set({ restDays: on ? s.restDays.filter((x) => x !== i) : [...s.restDays, i].sort() })}
                  className={cn('h-8 w-11 rounded-md border text-xs', on ? 'border-arc/50 bg-arc/15 text-arc-soft' : 'border-line-strong text-ink-muted hover:text-ink')}
                >
                  {d}
                </button>
              );
            })}
          </div>
          <p className="mt-2 text-[11px] text-ink-muted">Rest days never break your streak. Shields (1 per 7 active days, max 2) cover unplanned misses.</p>
        </div>
      </Panel>

      <Panel title="Revision schedule">
        <Field label="Intervals in days" htmlFor="set-int" hint="Successful recall climbs one step; partial halves the current step; forgetting returns to the first step.">
          <input id="set-int" className={cn('st-input num', intervalErr && 'border-rose')} value={intervals} onChange={(e) => setIntervals(e.target.value)} aria-invalid={!!intervalErr} />
        </Field>
        {intervalErr && <p className="mt-1.5 text-xs text-rose">{intervalErr}</p>}
        <div className="mt-3 flex gap-2">
          <Button size="sm" variant="primary" disabled={!!intervalErr || parsedIntervals.join() === s.intervals.join()} onClick={() => set({ intervals: parsedIntervals }, 'Revision schedule updated')}>
            Save schedule
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setIntervals(DEFAULT_SETTINGS.intervals.join(', '));
              set({ intervals: DEFAULT_SETTINGS.intervals }, 'Schedule reset');
            }}
          >
            Reset to default
          </Button>
        </div>
        <p className="mt-3 text-[11px] text-ink-muted">Existing due dates are kept; new intervals apply from each item’s next recall.</p>
      </Panel>

      <Panel title="XP rules">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {XP_FIELDS.map(([k, label]) => (
            <Field key={k} label={label} htmlFor={`xp-${k}`}>
              <input
                id={`xp-${k}`}
                type="number"
                min={0}
                max={1000}
                className="st-input num"
                defaultValue={s.xp[k]}
                onBlur={(e) => {
                  const v = Math.min(1000, Math.round(num(e.target.value, s.xp[k])));
                  if (v !== s.xp[k]) set({ xp: { ...s.xp, [k]: v } }, 'XP rule updated');
                }}
              />
            </Field>
          ))}
          <Field label="Hints multiplier" htmlFor="xp-hint" hint="0–1">
            <input
              id="xp-hint"
              type="number"
              step={0.1}
              min={0}
              max={1}
              className="st-input num"
              defaultValue={s.xp.hintMultiplier}
              onBlur={(e) => {
                const v = Math.min(1, num(e.target.value, s.xp.hintMultiplier));
                if (v !== s.xp.hintMultiplier) set({ xp: { ...s.xp, hintMultiplier: v } }, 'XP rule updated');
              }}
            />
          </Field>
          <Field label="Min. session (min)" htmlFor="xp-minses">
            <input
              id="xp-minses"
              type="number"
              min={1}
              max={240}
              className="st-input num"
              defaultValue={s.minSessionMinutes}
              onBlur={(e) => {
                const v = Math.max(1, Math.min(240, Math.round(num(e.target.value, s.minSessionMinutes))));
                if (v !== s.minSessionMinutes) set({ minSessionMinutes: v });
              }}
            />
          </Field>
        </div>
        <p className="mt-3 text-[11px] text-ink-muted">Changes apply to future rewards. Already-earned XP is never removed; raised values top up on the next qualifying update.</p>
      </Panel>

      <Panel title="Data" className="lg:col-span-2">
        <div className="flex flex-col gap-5">
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="secondary" onClick={exportData}>
              <Download size={14} aria-hidden="true" /> Export backup (JSON)
            </Button>
            <Button variant="secondary" onClick={() => fileRef.current?.click()}>
              <Upload size={14} aria-hidden="true" /> Import backup
            </Button>
            <input ref={fileRef} type="file" accept="application/json,.json" className="sr-only" aria-label="Import backup file" onChange={(e) => e.target.files?.[0] && importData(e.target.files[0])} />
            <p className="text-xs text-ink-muted">Data lives in this browser only. Export regularly to keep a copy.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3 border-t border-line pt-5">
            <p className="w-full text-xs text-ink-muted">
              Currently using <strong className="text-ink">{state.mode === 'sample' ? 'sample data' : 'your real data'}</strong>.
            </p>
            {confirm ? (
              <>
                <p className="text-sm text-rose">{confirm === 'fresh' ? 'Erase all progress and start fresh?' : 'Replace current data with sample data?'} Export first if you want a copy.</p>
                <Button variant="ghost" onClick={() => setConfirm(null)}>
                  Cancel
                </Button>
                <Button
                  variant="danger"
                  onClick={() => {
                    if (confirm === 'fresh') startFresh();
                    else startSample();
                    setConfirm(null);
                  }}
                >
                  Confirm
                </Button>
              </>
            ) : (
              <>
                <Button variant={state.mode === 'sample' ? 'primary' : 'danger'} onClick={() => (state.mode === 'sample' ? startFresh() : setConfirm('fresh'))}>
                  {state.mode === 'sample' ? 'Start my real journey' : 'Reset all progress'}
                </Button>
                {state.mode === 'real' && (
                  <Button variant="ghost" onClick={() => setConfirm('sample')}>
                    Explore sample data
                  </Button>
                )}
              </>
            )}
          </div>
        </div>
      </Panel>
    </div>
  );
}
