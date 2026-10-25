import type { AppState, DayKey } from '../domain/types';
import { NUTRITION_PLAN, type MealEntry, type NutritionDay } from '../domain/nutrition';
import { addDays } from '../lib/date';
import { uid } from '../lib/id';
import { ActionError, type Ctx } from './actions';

/** Calories-and-protein tracking, as the plan asks — no macro micromanagement. */

export function emptyDay(): NutritionDay {
  return { meals: {}, extras: [], habits: {}, supplements: {} };
}

export function getDay(state: AppState, date: DayKey): NutritionDay {
  return state.nutrition.days[date] ?? emptyDay();
}

export interface DayTotals {
  cal: number;
  protein: number;
  mealsLogged: number;
  withinBudget: boolean;
  proteinHit: boolean;
  logged: boolean;
}

export function dayTotals(state: AppState, date: DayKey): DayTotals {
  const d = getDay(state, date);
  const entries = Object.values(d.meals);
  const cal = entries.reduce((s, m) => s + m.cal, 0) + d.extras.reduce((s, e) => s + e.cal, 0);
  const protein = entries.reduce((s, m) => s + m.protein, 0) + d.extras.reduce((s, e) => s + e.protein, 0);
  const logged = entries.length > 0 || d.extras.length > 0;
  return {
    cal,
    protein,
    mealsLogged: entries.length,
    withinBudget: logged && cal <= state.nutrition.calorieBudget,
    proteinHit: protein >= state.nutrition.proteinGoal,
    logged,
  };
}

function setDay(state: AppState, date: DayKey, day: NutritionDay): AppState {
  return { ...state, nutrition: { ...state.nutrition, days: { ...state.nutrition.days, [date]: day } } };
}

function checkDate(date: DayKey, ctx: Ctx) {
  if (date > ctx.today) throw new ActionError('You can’t log a future day.');
}

function checkNums(cal: number, protein: number) {
  if (!Number.isFinite(cal) || cal < 0 || cal > 5000) throw new ActionError('Calories should be between 0 and 5000.');
  if (!Number.isFinite(protein) || protein < 0 || protein > 400) throw new ActionError('Protein should be between 0 and 400 g.');
}

/** Log (or clear, with `null`) a planned meal. Values default to the chosen option's totals. */
export function logMeal(state: AppState, date: DayKey, mealId: string, entry: MealEntry | null, ctx: Ctx): AppState {
  checkDate(date, ctx);
  const meal = NUTRITION_PLAN.meals.find((m) => m.id === mealId);
  if (!meal) throw new ActionError('Unknown meal.');
  const d = getDay(state, date);
  const meals = { ...d.meals };
  if (entry === null) delete meals[mealId];
  else {
    checkNums(entry.cal, entry.protein);
    meals[mealId] = { ...entry, cal: Math.round(entry.cal), protein: Math.round(entry.protein) };
  }
  return setDay(state, date, { ...d, meals });
}

export function addExtra(state: AppState, date: DayKey, input: { name: string; cal: number; protein: number }, ctx: Ctx): AppState {
  checkDate(date, ctx);
  const name = input.name.trim();
  if (!name) throw new ActionError('Name the food.');
  checkNums(input.cal, input.protein);
  const d = getDay(state, date);
  return setDay(state, date, { ...d, extras: [...d.extras, { id: uid('food'), name, cal: Math.round(input.cal), protein: Math.round(input.protein) }] });
}

export function removeExtra(state: AppState, date: DayKey, id: string): AppState {
  const d = getDay(state, date);
  return setDay(state, date, { ...d, extras: d.extras.filter((e) => e.id !== id) });
}

export function toggleHabit(state: AppState, date: DayKey, key: string, kind: 'habits' | 'supplements', value: boolean, ctx: Ctx): AppState {
  checkDate(date, ctx);
  const d = getDay(state, date);
  return setDay(state, date, { ...d, [kind]: { ...d[kind], [key]: value } });
}

export function logWeight(state: AppState, date: DayKey, kg: number, ctx: Ctx): AppState {
  checkDate(date, ctx);
  if (!Number.isFinite(kg) || kg < 25 || kg > 300) throw new ActionError('Enter a weight between 25 and 300 kg.');
  const weights = [...state.nutrition.weights.filter((w) => w.date !== date), { date, kg: Math.round(kg * 10) / 10 }].sort((a, b) => a.date.localeCompare(b.date));
  return { ...state, nutrition: { ...state.nutrition, weights } };
}

export function setNutritionTargets(state: AppState, calorieBudget: number, proteinGoal: number): AppState {
  if (!(calorieBudget >= 800 && calorieBudget <= 6000)) throw new ActionError('Calorie budget should be 800–6000.');
  if (!(proteinGoal >= 20 && proteinGoal <= 400)) throw new ActionError('Protein goal should be 20–400 g.');
  return { ...state, nutrition: { ...state.nutrition, calorieBudget: Math.round(calorieBudget), proteinGoal: Math.round(proteinGoal) } };
}

export interface HistoryPoint extends DayTotals {
  date: DayKey;
}

export function history(state: AppState, today: DayKey, days: number): HistoryPoint[] {
  return Array.from({ length: days }, (_, i) => {
    const date = addDays(today, -(days - 1 - i));
    return { date, ...dayTotals(state, date) };
  });
}

/** Averages over logged days only, so unlogged days don't look like fasting. */
export function summary(points: HistoryPoint[]) {
  const logged = points.filter((p) => p.logged);
  const n = logged.length || 1;
  return {
    loggedDays: logged.length,
    avgCal: Math.round(logged.reduce((s, p) => s + p.cal, 0) / n),
    avgProtein: Math.round(logged.reduce((s, p) => s + p.protein, 0) / n),
    withinBudget: logged.filter((p) => p.withinBudget).length,
    proteinHit: logged.filter((p) => p.proteinHit).length,
  };
}

/** 7-entry moving average smooths daily water-weight swings. */
export function weightTrend(state: AppState) {
  const w = state.nutrition.weights;
  return w.map((p, i) => {
    const win = w.slice(Math.max(0, i - 6), i + 1);
    return { ...p, avg: Math.round((win.reduce((s, x) => s + x.kg, 0) / win.length) * 10) / 10 };
  });
}
