import type { DayKey } from './types';

export type QuoteTheme = 'discipline' | 'finish' | 'payoff' | 'life';

export interface Quote {
  text: string;
  /** Omitted for unattributed lines. */
  by?: string;
  theme: QuoteTheme;
}

export const QUOTE_THEMES: Record<QuoteTheme, string> = {
  discipline: 'Discipline',
  finish: 'Finish the goal',
  payoff: 'The payoff',
  life: 'The life it buys',
};

/**
 * Compensation lines are deliberately broad and rounded: real numbers move
 * every year and vary by level, team and city. Check levels.fyi for current bands.
 */
export const QUOTES: Quote[] = [
  // Discipline
  { theme: 'discipline', text: 'Discipline is the bridge between goals and accomplishment.', by: 'Jim Rohn' },
  { theme: 'discipline', text: 'You do not rise to the level of your goals. You fall to the level of your systems.', by: 'James Clear' },
  { theme: 'discipline', text: 'Every action you take is a vote for the type of person you wish to become.', by: 'James Clear' },
  { theme: 'discipline', text: 'We are what we repeatedly do. Excellence, then, is not an act, but a habit.', by: 'Will Durant' },
  { theme: 'discipline', text: 'Amateurs sit and wait for inspiration, the rest of us just get up and go to work.', by: 'Stephen King' },
  { theme: 'discipline', text: 'Hard choices, easy life. Easy choices, hard life.', by: 'Jerzy Gregorek' },
  { theme: 'discipline', text: 'Motivation gets you to open the laptop. Discipline gets you through the second hour.' },
  { theme: 'discipline', text: 'You will not always feel like it. Do one problem anyway — that is the whole trick.' },
  { theme: 'discipline', text: 'A bad day of practice still beats a perfect day of planning.' },
  { theme: 'discipline', text: 'The streak is not about today’s problem. It is about becoming someone who shows up.' },
  { theme: 'discipline', text: 'Consistency beats intensity. Forty ordinary days outrun one heroic weekend.' },
  { theme: 'discipline', text: 'Nobody is coming to make you study. That is good news — it means it is entirely in your hands.' },
  { theme: 'discipline', text: 'Protect the first hour of your evening like it is a meeting with your future employer.' },

  // Finishing the goal
  { theme: 'finish', text: 'The best time to plant a tree was 20 years ago. The second best time is now.', by: 'Proverb' },
  { theme: 'finish', text: 'Talk is cheap. Show me the code.', by: 'Linus Torvalds' },
  { theme: 'finish', text: 'Simplicity is prerequisite for reliability.', by: 'Edsger W. Dijkstra' },
  { theme: 'finish', text: 'Interviewers don’t see your plan. They see what you can do on the day. Build that, one rep at a time.' },
  { theme: 'finish', text: 'Every problem you solve today is one you won’t freeze on in the interview room.' },
  { theme: 'finish', text: 'Revision is where learning turns into recall. Clear the queue before adding more.' },
  { theme: 'finish', text: 'The finish line is a date on the calendar. Each day you show up moves it closer; each skipped day just moves the work.' },
  { theme: 'finish', text: 'Design one system end to end this week. Breadth comes from many finished things, not many started ones.' },
  { theme: 'finish', text: 'Half-done is the most expensive state: all the effort, none of the confidence. Finish the item.' },
  { theme: 'finish', text: 'You don’t need to know everything. You need to explain trade-offs clearly and code without panic.' },
  { theme: 'finish', text: 'One more mock, one more design, one more pattern. Then do it again tomorrow.' },
  { theme: 'finish', text: 'The offer letter is written months before it is sent — in the evenings you choose to practise.' },
  { theme: 'finish', text: 'Pick the topic you keep avoiding. That is exactly where the interview will go.' },

  // The payoff — what top-tier engineering roles typically pay
  { theme: 'payoff', text: 'At large US tech companies, mid-level engineers commonly earn total compensation in the low-to-mid six figures (USD) — salary, stock and bonus together.' },
  { theme: 'payoff', text: 'Senior engineer offers at top-tier companies frequently run well above typical industry pay, with stock refreshers adding up year after year.' },
  { theme: 'payoff', text: 'In India, senior engineering offers at FAANG-tier companies often reach several times typical service-company packages. Look up current bands on levels.fyi.' },
  { theme: 'payoff', text: 'Stock grants vest over years. The work you do this month can keep paying you long after the offer is signed.' },
  { theme: 'payoff', text: 'One level up the ladder can be worth more than several years of ordinary raises. That jump is decided in a handful of interviews.' },
  { theme: 'payoff', text: 'Compensation is negotiated from leverage. Competing offers come from being interview-ready, not from luck.' },
  { theme: 'payoff', text: 'The interview is a few hours. The difference in pay compounds for the rest of your career.' },
  { theme: 'payoff', text: 'Today’s two problems are a small, quiet investment with a very large expected return.' },
  { theme: 'payoff', text: 'Top companies pay for judgement: clean designs, clear trade-offs, calm debugging. That is exactly what you are practising.' },
  { theme: 'payoff', text: 'Check levels.fyi for the role you want. Write the number down. Then go earn the right to negotiate it.' },

  // The life it buys
  { theme: 'life', text: 'Picture the day you accept the offer. The person who gets there is built in sessions like today’s.' },
  { theme: 'life', text: 'Financial breathing room means saying yes to family, travel and health without checking your balance first.' },
  { theme: 'life', text: 'Work on problems at real scale, alongside engineers who make you sharper every week.' },
  { theme: 'life', text: 'A stronger offer buys options: a better home, savings that grow, and the freedom to choose your next move.' },
  { theme: 'life', text: 'Imagine telling your family the news. Study like that conversation is already on the calendar.' },
  { theme: 'life', text: 'The confidence of having earned it — not been handed it — lasts far longer than the joining bonus.' },
  { theme: 'life', text: 'Better pay is the headline. The real prize is the engineer you become while getting there.' },
  { theme: 'life', text: 'Every evening you study now is an evening you won’t have to spend worrying about your career later.' },
  { theme: 'life', text: 'Your future self is counting on the decisions you make tonight. Don’t let them down.' },
  { theme: 'life', text: 'The job switch is a door. Discipline is the key, and you are cutting it one day at a time.' },
];

/** A stable pick for the day; `offset` steps through the list from there. */
export function quoteFor(day: DayKey, offset = 0): Quote {
  let h = 0;
  for (const ch of day) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return QUOTES[(h + offset) % QUOTES.length];
}
