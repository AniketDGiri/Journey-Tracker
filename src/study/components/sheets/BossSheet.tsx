import { useEffect, useState } from 'react';
import { Crown, Flag, Hourglass, Lock } from 'lucide-react';
import { useStore } from '../../store/AppStore';
import { useUI } from '../../store/ui';
import { BOSSES, bossOutcome, bossReward, bossScore, bossStatuses } from '../../engine/bosses';
import { recordBossAttempt } from '../../engine/actions';
import { grantedFor } from '../../engine/progression';
import { Badge, Bar, Button, Checkbox, Field, Modal } from '../ui';
import { DomainTag } from '../bits';

type Phase = 'brief' | 'battle' | 'assess' | 'result';

export function BossSheet({ bossId }: { bossId: string }) {
  const { state, act, derived } = useStore();
  const { close } = useUI();
  const boss = BOSSES.find((b) => b.id === bossId);
  const status = bossStatuses(state, derived.stats).find((b) => b.boss.id === bossId);
  const [phase, setPhase] = useState<Phase>('brief');
  const [startedAt, setStartedAt] = useState<number>();
  const [elapsed, setElapsed] = useState(0);
  const [usedTimer, setUsedTimer] = useState(false);
  const [checks, setChecks] = useState<Record<string, boolean>>({});
  const [notes, setNotes] = useState('');
  const [result, setResult] = useState<{ score: number; reward: number }>();

  useEffect(() => {
    if (phase !== 'battle' || !startedAt) return;
    const t = window.setInterval(() => setElapsed(Date.now() - startedAt), 1000);
    return () => window.clearInterval(t);
  }, [phase, startedAt]);

  if (!boss || !status) return null;
  const limitMs = boss.timeLimitMin * 60_000;
  const remaining = limitMs - elapsed;
  const best = grantedFor(state, 'boss', boss.id);

  const toAssess = () => {
    setPhase('assess');
    if (usedTimer) setChecks((c) => ({ ...c, time: elapsed <= limitMs }));
  };

  const submit = () => {
    let out: { score: number; reward: number } | undefined;
    const fb = act(
      (s, ctx) => {
        const r = recordBossAttempt(s, { bossId: boss.id, checks, minutes: usedTimer ? Math.round(elapsed / 60000) : undefined, notes }, ctx);
        out = { score: r.attempt.score, reward: r.reward };
        return r.state;
      },
      { silent: true },
    );
    if (fb && out) {
      setResult(out);
      setPhase('result');
    }
  };

  const mm = (ms: number) => {
    const s = Math.max(0, Math.floor(Math.abs(ms) / 1000));
    return `${ms < 0 ? '+' : ''}${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  };

  const score = bossScore(boss, checks);

  return (
    <Modal open onClose={close} title={boss.name} wide>
      {phase === 'brief' && (
        <div className="flex flex-col gap-5">
          <div className="flex flex-wrap items-center gap-2">
            <DomainTag domain={boss.domain} />
            <Badge>
              <Hourglass size={11} aria-hidden="true" /> {boss.timeLimitMin} min
            </Badge>
            {state.settings.gamification && <Badge tone="violet">Up to {boss.reward} XP</Badge>}
            {status.defeated && <Badge tone="arc">Defeated · best {status.bestScore}</Badge>}
          </div>
          <p className="text-base leading-relaxed text-ink">{boss.challenge}</p>
          <div>
            <p className="st-label mb-2">You will be assessed on</p>
            <ul className="flex flex-col gap-1.5 text-sm text-ink-soft">
              {boss.criteria.map((c) => (
                <li key={c.key} className="flex justify-between gap-4 border-b border-line/60 pb-1.5">
                  <span>{c.label}</span>
                  <span className="num text-ink-muted">{c.weight}</span>
                </li>
              ))}
            </ul>
          </div>
          <p className="text-xs text-ink-muted">
            Score ≥ 80 is a victory (full reward × score). 50–79 is a partial clear (half). Retries only pay the improvement over your best.
            {best > 0 && ` You have earned ${best} XP from this boss so far.`}
          </p>
          {!status.unlocked ? (
            <div className="flex flex-col gap-2 rounded-lg border border-dashed border-line p-4">
              <p className="flex items-center gap-2 text-sm text-ink-soft">
                <Lock size={14} aria-hidden="true" /> Locked — build the prerequisites first.
              </p>
              <ul className="text-xs text-ink-muted">
                {boss.requires.map((r) => (
                  <li key={r.topicId}>
                    {derived.stats.get(r.topicId)?.topic.name}: <span className="num">{derived.stats.get(r.topicId)?.mastery ?? 0}</span> / {r.mastery}% mastery
                  </li>
                ))}
              </ul>
              <Bar value={status.progress} label="Unlock progress" />
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              <Button
                variant="primary"
                onClick={() => {
                  setStartedAt(Date.now());
                  setElapsed(0);
                  setUsedTimer(true);
                  setPhase('battle');
                }}
              >
                <Crown size={14} aria-hidden="true" /> Begin timed battle
              </Button>
              <Button variant="secondary" onClick={() => setPhase('assess')}>
                I already attempted it — assess
              </Button>
            </div>
          )}
        </div>
      )}

      {phase === 'battle' && (
        <div className="flex flex-col items-center gap-5 py-6 text-center">
          <p className="st-label">Time remaining</p>
          <p className={`num text-5xl font-semibold ${remaining < 0 ? 'text-rose' : remaining < 5 * 60_000 ? 'text-ember-soft' : 'text-ink'}`} role="timer" aria-live="off">
            {mm(remaining)}
          </p>
          <Bar value={Math.min(1, elapsed / limitMs)} tone={remaining < 0 ? 'ember' : 'violet'} className="max-w-sm" label="Time used" />
          <p className="max-w-md text-sm text-ink-muted">{boss.challenge}</p>
          <Button variant="primary" onClick={toAssess}>
            <Flag size={14} aria-hidden="true" /> Finish & assess
          </Button>
        </div>
      )}

      {phase === 'assess' && (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-ink-soft">Be strict with yourself — the score only means something if it’s honest.</p>
          <div className="flex flex-col">
            {boss.criteria.map((c) => (
              <Checkbox
                key={c.key}
                checked={!!checks[c.key]}
                onChange={(v) => setChecks((x) => ({ ...x, [c.key]: v }))}
                label={
                  <span className="flex w-full justify-between gap-4">
                    <span>{c.label}</span>
                    <span className="num text-ink-muted">{c.weight}</span>
                  </span>
                }
              />
            ))}
          </div>
          <Field label="Reflection" htmlFor="boss-notes">
            <textarea id="boss-notes" className="st-input min-h-[80px]" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="What slowed you down? What would you do differently?" />
          </Field>
          <div className="flex items-center justify-between gap-3 border-t border-line pt-4">
            <p className="text-sm">
              Score <span className="num font-semibold">{score}</span>
              {state.settings.gamification && <span className="text-ink-muted"> · reward {bossReward(boss, score)} XP</span>}
            </p>
            <Button variant="primary" onClick={submit}>
              Record result
            </Button>
          </div>
        </div>
      )}

      {phase === 'result' && result && (
        <div className="flex flex-col items-center gap-3 py-6 text-center">
          <Crown size={32} className={bossOutcome(result.score) === 'victory' ? 'text-violet-soft' : 'text-ink-muted'} aria-hidden="true" />
          <p className="text-xl font-semibold">{bossOutcome(result.score) === 'victory' ? 'Victory' : bossOutcome(result.score) === 'partial' ? 'Partial clear' : 'Retreat — and regroup'}</p>
          <p className="num text-sm text-ink-soft">Score {result.score} / 100</p>
          {state.settings.gamification && <p className="num text-sm text-violet-soft">{result.reward > 0 ? `+${result.reward} XP` : 'No new XP (rewards only pay improvements)'}</p>}
          <p className="max-w-sm text-xs text-ink-muted">
            {bossOutcome(result.score) === 'victory' ? 'Real mastery, demonstrated under pressure.' : 'Every attempt shows exactly what to practise next. Try again when ready.'}
          </p>
          <Button variant="primary" onClick={close}>
            Done
          </Button>
        </div>
      )}
    </Modal>
  );
}
