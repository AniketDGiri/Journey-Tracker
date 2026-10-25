import type { DayKey } from './types';

/**
 * Nutrition plan, transcribed from the coach's "Meal Plan" sheet.
 * Text is kept verbatim (only list bullets are split into items).
 */

export interface FoodRow {
  role?: 'Protein source' | 'Sides';
  food: string;
  amount?: string;
  cal?: number;
  protein?: number;
}

export interface MealOption {
  id: string;
  label: string;
  title: string;
  foods: FoodRow[];
  totalCal: number;
  totalProtein: number;
  description?: string;
  tipsTitle?: string;
  tips: string[];
}

export interface Meal {
  id: string;
  name: string;
  targetCal: number;
  targetProtein: number;
  options: MealOption[];
  after?: string;
}

export interface NutritionPlan {
  name: string;
  currentWeight: number;
  maintenance: number;
  goal: string;
  calorieBudget: number;
  proteinGoal: number;
  focus: string;
  note: string[];
  supplements: { id: string; label: string }[];
  meals: Meal[];
  tips: string[];
}

export const NUTRITION_PLAN: NutritionPlan = {
  name: 'Nutrition Plan',
  currentWeight: 74,
  maintenance: 2200,
  goal: 'Body Recomposition',
  calorieBudget: 1800,
  proteinGoal: 140,
  focus:
    'Just focus on Calories and Protein Goal.\nThat is - to eat within your calorie budget while meeting your protein needs.\nYou don’t have to track your fats and carbs closely.\nI have explained this concept in your nutrition guidebook.',
  note: [
    'All meals mention portions of food items in raw uncooked state (in grams).',
    'The cooked weight will vary for foods that absorb or release water upon cooking.',
    'I have designed your meal plan to prioritize ease of execution. The meals are really simple to make/cook. Nevertheless, you can always refer Hypertroph Recipe Library for more ideas.',
  ],
  supplements: [
    { id: 'protein', label: 'Protein Powder (or Plant Protein as you wish)' },
    { id: 'd3', label: 'Vitamin D3' },
    { id: 'omega3', label: 'Omega 3 - Fish Oil or Algae Oil [Veg.]' },
    { id: 'creatine', label: 'Creatine' },
  ],
  meals: [
    {
      id: 'breakfast',
      name: 'Breakfast',
      targetCal: 300,
      targetProtein: 30,
      options: [
        {
          id: 'b1',
          label: 'Option 1',
          title: 'Protein Shake + Fruit (Or Dry Fruit)',
          foods: [
            { role: 'Protein source', food: 'Protein Powder', amount: '1 scoop', cal: 120, protein: 25 },
            { role: 'Sides', food: '1 Fruit of Choice', amount: '1', cal: 100 },
            { food: 'Milk', amount: '150 ml', cal: 90, protein: 5 },
          ],
          totalCal: 300,
          totalProtein: 30,
          description: 'Simply make Protein Shake with milk and water, along with fruit (or dry fruit).',
          tips: [
            'If the fruit can be blended with protein shake, then you can make a fruit smoothie, like banana shake, mango shake, apple shake..',
            'ideally vanilla flavoured protein powder fits nicely in any fruit smoothie without interfering with the taste.',
            'If you do make a fruit smoothie, then you can also sneak in some greens like spinach, kale in your blender. (Taste will be good because of fruit).',
            'But ofcourse, not all fruits can be blended with a protein shake. Fruits like grapes, pineapple, kiwi, oranges - should be consumed separately.',
            'If you are having the fruit separately, then another spin on your protein shake can be making a cold coffee.',
            'Cold Coffee Recipe: Vanilla/Chocolate/Coffee flavoured protein powder combined with milk, water and coffee powder.',
            'Instead of 100 Cals from fruit, you can have 100 calories from dry fruits or nuts (can be blended with protein shake or taken separately)',
            '100 Cals from dry fruits = 14 almonds OR 25 pistachios OR 10 cashews OR 8 walnut halves OR 16 gms Peanut Butter.',
          ],
        },
        {
          id: 'b2',
          label: 'Option 2',
          title: 'Eggs - A great breakfast anyday!',
          foods: [
            { role: 'Protein source', food: 'Eggs', amount: '3 Whole + 2 Whites', cal: 250, protein: 25 },
            { role: 'Sides', food: 'Cooking Oil (Olive Oil, Ghee or Butter)', amount: '0.5 tbsp (5 gms)', cal: 40 },
          ],
          totalCal: 300,
          totalProtein: 25,
          description:
            'Eggs make for a great nutritious & lean breakfast. Have 2-3 whole eggs atleast, and the rest whites.\nHave eggs as you prefer - boiled/omlette/scrambled/bhurji/sunny-side up.',
          tips: [
            'Here, you can replace a whole egg here with a cheese slice to make a cheese omlette. (So, 2 wholes + 2 whites + 1 cheese slice).',
            'Cheese omlette tastes delicious with italian spices like oregano.',
            'If you have boiled eggs instead, then saute them slightly in 5 gms butter with salt and black pepper or oregano. It adds to the taste.',
            'Feel free to add veggies to your omlette/bhurji and make it really filling: like spinach, tomatoes, corn, peas. (need not count cals for veggies).',
          ],
        },
      ],
    },
    {
      id: 'lunch',
      name: 'Lunch',
      targetCal: 400,
      targetProtein: 30,
      options: [
        {
          id: 'l1',
          label: 'Option 1',
          title: 'Oat Meal',
          foods: [
            { role: 'Protein source', food: 'Protein Powder', amount: '1 Scoop', cal: 120, protein: 25 },
            { role: 'Sides', food: 'Oats', amount: '40 gms', cal: 150, protein: 3 },
            { food: 'Milk', amount: '150 ml', cal: 90, protein: 3 },
            { food: 'Peanut Butter', amount: '0.5 tbsp (8 gms)', cal: 50, protein: 2 },
          ],
          totalCal: 410,
          totalProtein: 33,
          description: 'Oatmeal - nutritious and very quick to make. You can even make this in office with microwave, just carry all raw stuff in microwaveable tiffin.',
          tips: [
            'If you make a hot oatmeal using gas stove or microwave, then add whey protein in the end after oatmeal is ready. (Or it forms clots)',
            'Highly recommend you make overnight oatmeal - it is simply delicious. No comparison, feels like dessert.',
            'You can also blend all of this in a blender, and make a thick protein shake. Many interesting ways to eat the same thing.',
          ],
        },
        {
          id: 'l2',
          label: 'Option 2',
          title: 'High Protein Salad Bowl',
          foods: [
            { role: 'Protein source', food: 'Eggs', amount: '2 Whole + 4 Whites', cal: 210, protein: 25 },
            { role: 'Sides', food: 'Veggies of Choice', amount: '*Have handful of each', cal: 80 },
            { food: 'Potatoes', amount: '100 gms', cal: 70 },
            { food: 'Cooking Oil', amount: '0.5 tbsp', cal: 45 },
          ],
          totalCal: 400,
          totalProtein: 30,
          tips: [
            'Saute the veggies, or steam the veggies. Or make salad chatpata style with chaat masala.',
            'Instead of potatoes, you can have bread or rice or beans under 100 Cals.',
            'Instead of eggs as your protein source, you can have any other protein source from your primary protein sources.',
          ],
        },
        {
          id: 'l3',
          label: 'Option 3',
          title: 'High Protein Sandwich',
          foods: [
            { role: 'Protein source', food: 'Eggs', amount: '2 Whole + 4 Whites', cal: 210, protein: 25 },
            { role: 'Sides', food: 'Bread Slices', amount: '2', cal: 100 },
            { food: 'Cheese slice', amount: '1', cal: 70, protein: 3 },
            { food: 'Veggies' },
            { food: 'Cooking Oil', amount: '0.5 tbsp', cal: 45 },
          ],
          totalCal: 400,
          totalProtein: 30,
          tips: [
            'Use 0 Cal chutneys like cilantro or mint chutney to make your sandwich tasty. (Chutney Recipes can be found in hypertroph recipe book)',
            'Suitable veggies for sandwich: Lettuce, Tomatoes, Onion, Cucumber.. (no need to count calories)',
            'Instead of eggs as your protein source, you can have any other protein source from your primary protein sources.',
            'To fit eggs in sandwich: either mash the boiled eggs with some chutney and spices, or use omlette/sunny side up or simply boiled eggs.',
            'Instead of 2 breads, you can also use 1 roti, and make a high protein roll/wrap. Be creative. :)',
          ],
        },
      ],
    },
    {
      id: 'evening',
      name: 'Evening Meal',
      targetCal: 300,
      targetProtein: 30,
      after: 'HIT YOUR TRAINING SESSION! [30 mins after Pre-workout meal: when you are well-fueled plus light on stomach.]',
      options: [
        {
          id: 'e1',
          label: 'Evening Snack',
          title: 'Evening Snack',
          foods: [
            { role: 'Protein source', food: 'Protein Shake', amount: '1 scoop', cal: 120, protein: 24 },
            { food: 'Tea/Coffee (use 150 ml milk)', amount: '1', cal: 90, protein: 5 },
            { food: 'Almonds', amount: '10', cal: 80 },
          ],
          totalCal: 300,
          totalProtein: 29,
          tipsTitle: 'Meal Tip',
          tips: [
            'You can replace Almonds (or Tea) with any other dry fruit or fruit under 100 Cals.',
            'If you eat eggs, then a 6 egg white omlette (or boiled) can be a good option here in protein source - instead of going for a protein shake.',
            'If you use double toned milk instead of toned milk for tea - then you can use 300 ml milk (= more tea and also more protein).',
            "You can use 1 tbsp sugar in tea (that's 20 Cals), or 0 Cal sweetners like sugar free or stevia.",
          ],
        },
      ],
    },
    {
      id: 'dinner',
      name: 'Dinner',
      targetCal: 800,
      targetProtein: 60,
      options: [
        {
          id: 'd1',
          label: 'Indian Style Food',
          title: 'Indian Style Food [Design your own plate skillfully!]',
          foods: [
            { role: 'Protein source', food: 'Paneer', amount: '100 gms', cal: 280, protein: 20 },
            { food: 'Protein Shake', amount: '1 scoop + 200 ml milk', cal: 240, protein: 30 },
            { role: 'Sides', food: 'White Rice', amount: '30 gms', cal: 100, protein: 1 },
            { food: 'Dal/Chole/Rajma', amount: '30 gms', cal: 100, protein: 5 },
            { food: 'Oil/Ghee/Butter (Used for cooking)', amount: '1 tbsp (10 gms)', cal: 100 },
          ],
          totalCal: 790,
          totalProtein: 55,
          description: 'This is basically eating proper Home style food that we have always been eating - but skillfully this time.',
          tips: [
            'I suggest you include salad with this meal.',
            'You can replace all portion of your chapati/rice/bread with equal calories of potatoes. [More satiating carb source]',
            'You can boil them, make mashed potatoes, or some alu tamatar sabzi in less oil. [Recipes in Hypertroph Recipe Library, recipe1 recipe2]',
            'Always have 0 Calorie Chutneys in fridge, they bring freshness and taste to any meal. (Mint/Cilantro Chutneys)',
            'Regarding Paneer: The paneer I have mentioned here is standard full-fat paneer, which is most commonly available in Indian Market.',
            'However, if you can buy Low Fat Paneer, then that would be awesome as it has 25 gms Protein in under 200 Cals - making more space for sides.',
            'So if you use 100 gms low fat paneer instead of 100 gms full fat paneer - you will get higher protein (25 gms), and still have 50-100 Cals left for having something else (like dal/chole/rajma/curry/sabzi or more rice/chapati).',
            'You can also make low fat paneer at home.',
          ],
        },
      ],
    },
  ],
  tips: [
    'Read your nutrition Guidebook (shared as pdf) thoroughly.',
    "Get your sleep. No compromise there. Drink enough water. Never stay thirsty. Keep a bottle nearby so that you don't postpone in laziness. :)",
    '1 daily serving of fruit & veggies. *INCLUDE SALAD IN LUNCH/DINNER. OR VEGGIES IN SOME FORM*',
    'Feel free to have 0-cal drinks in your day - diet coke, green tea, lemon tea. Even dilute masala chaach is very low calories (<50 cals for a big glass).',
    'Almost 3-5 high protein meals of 20-40 gms Protein to hit near 140 gms protein in your day.',
    'Eat under your CALORIE BUDGET - under 1800 Calories. Which means not more than 1800 cals. :)',
  ],
};

/** Daily habits drawn from the plan's tips. */
export const HABITS = [
  { id: 'sleep', label: 'Got my sleep' },
  { id: 'water', label: 'Drank enough water' },
  { id: 'fruitveg', label: '1 serving of fruit & veggies' },
  { id: 'salad', label: 'Salad / veggies with lunch or dinner' },
];

// ── Logging ─────────────────────────────────────────────────────────────

export interface MealEntry {
  optionId?: string;
  cal: number;
  protein: number;
  note?: string;
}

export interface FoodExtra {
  id: string;
  name: string;
  cal: number;
  protein: number;
}

export interface NutritionDay {
  meals: Record<string, MealEntry>;
  extras: FoodExtra[];
  habits: Record<string, boolean>;
  supplements: Record<string, boolean>;
}

export interface NutritionState {
  calorieBudget: number;
  proteinGoal: number;
  days: Record<DayKey, NutritionDay>;
  weights: { date: DayKey; kg: number }[];
}

export function emptyNutrition(): NutritionState {
  return { calorieBudget: NUTRITION_PLAN.calorieBudget, proteinGoal: NUTRITION_PLAN.proteinGoal, days: {}, weights: [] };
}
