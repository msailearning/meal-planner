import { DB } from './db.js';

export const CATEGORIES = ['Breakfast', 'Lunch', 'Dinner', 'Snack'];

export const CATEGORY_COLORS = {
  Breakfast: '#FFB74D',
  Lunch: '#4DD0E1',
  Dinner: '#FF6B6B',
  Snack: '#9575CD',
};

function normalizeName(name) {
  return name.trim().toLowerCase();
}

export const Ingredients = {
  async all() {
    const items = await DB.getAll('ingredients');
    return items.sort((a, b) => a.name.localeCompare(b.name));
  },

  async findOrCreate(name) {
    const trimmed = name.trim();
    if (!trimmed) return null;
    const nameLower = normalizeName(trimmed);
    const existing = await DB.getByIndex('ingredients', 'byName', nameLower);
    if (existing && existing.length) return existing[0];
    const ingredient = { id: DB.genId(), name: trimmed, nameLower };
    await DB.put('ingredients', ingredient);
    return ingredient;
  },

  async rename(id, newName) {
    const ingredient = await DB.get('ingredients', id);
    if (!ingredient) return;
    ingredient.name = newName.trim();
    ingredient.nameLower = normalizeName(newName);
    await DB.put('ingredients', ingredient);
  },

  async remove(id) {
    const meals = await Meals.all();
    const inUse = meals.some((m) => m.ingredients.some((i) => i.ingredientId === id));
    if (inUse) {
      throw new Error('This ingredient is used in a meal. Remove it from meals first.');
    }
    await DB.delete('ingredients', id);
  },
};

export const Meals = {
  async all() {
    const meals = await DB.getAll('meals');
    return meals.sort((a, b) => a.name.localeCompare(b.name));
  },

  async get(id) {
    return DB.get('meals', id);
  },

  async byCategory(category) {
    return DB.getByIndex('meals', 'byCategory', category);
  },

  // meal = { name, category, image (dataURL or null), notes, ingredients: [{name, qty}] }
  async save(meal) {
    const resolvedIngredients = [];
    for (const item of meal.ingredients || []) {
      if (!item.name || !item.name.trim()) continue;
      const ing = await Ingredients.findOrCreate(item.name);
      resolvedIngredients.push({ ingredientId: ing.id, name: ing.name, qty: (item.qty || '').trim() });
    }
    const record = {
      id: meal.id || DB.genId(),
      name: meal.name.trim(),
      category: meal.category,
      image: meal.image || null,
      notes: (meal.notes || '').trim(),
      ingredients: resolvedIngredients,
    };
    await DB.put('meals', record);
    return record;
  },

  async remove(id) {
    await DB.delete('meals', id);
    await DB.deleteWhere('plannedMeals', (pm) => pm.mealId === id);
  },
};

export const Planner = {
  async mealsForWeek(weekStart) {
    return DB.getByIndex('plannedMeals', 'byWeek', weekStart);
  },

  async mealsForDay(weekStart, day) {
    return DB.getByIndex('plannedMeals', 'byWeekDay', [weekStart, day]);
  },

  async addMeal(weekStart, day, mealId) {
    const existing = await this.mealsForDay(weekStart, day);
    if (existing.some((pm) => pm.mealId === mealId)) return;
    const record = { id: DB.genId(), weekStart, day, mealId };
    await DB.put('plannedMeals', record);
  },

  async removeMeal(weekStart, day, mealId) {
    const existing = await this.mealsForDay(weekStart, day);
    const match = existing.find((pm) => pm.mealId === mealId);
    if (match) await DB.delete('plannedMeals', match.id);
  },

  async setMealsForDay(weekStart, day, mealIds) {
    const existing = await this.mealsForDay(weekStart, day);
    const existingIds = new Set(existing.map((pm) => pm.mealId));
    const wantedIds = new Set(mealIds);

    const toRemove = existing.filter((pm) => !wantedIds.has(pm.mealId));
    for (const pm of toRemove) await DB.delete('plannedMeals', pm.id);

    const toAdd = mealIds.filter((id) => !existingIds.has(id));
    for (const mealId of toAdd) {
      await DB.put('plannedMeals', { id: DB.genId(), weekStart, day, mealId });
    }
  },
};

export const ShoppingList = {
  // Returns { grouped: [{ingredientId, name, qtyList, mealNames, flagged, checked}], manual: [...] }
  async build(weekStart) {
    const planned = await Planner.mealsForWeek(weekStart);
    const mealIds = [...new Set(planned.map((p) => p.mealId))];
    const meals = await Promise.all(mealIds.map((id) => Meals.get(id)));
    const validMeals = meals.filter(Boolean);

    const byIngredient = new Map();
    for (const meal of validMeals) {
      for (const item of meal.ingredients) {
        if (!byIngredient.has(item.ingredientId)) {
          byIngredient.set(item.ingredientId, { ingredientId: item.ingredientId, name: item.name, qtyList: [], mealNames: [] });
        }
        const bucket = byIngredient.get(item.ingredientId);
        bucket.mealNames.push(meal.name);
        if (item.qty) bucket.qtyList.push(item.qty);
      }
    }

    const states = await DB.getAll('shoppingItemState');
    const stateMap = new Map(states.map((s) => [s.id, s.checked]));

    const grouped = [...byIngredient.values()]
      .map((item) => ({
        ...item,
        flagged: item.mealNames.length > 1,
        checked: !!stateMap.get(`${weekStart}:${item.ingredientId}`),
        stateId: `${weekStart}:${item.ingredientId}`,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));

    const manualRaw = await DB.getByIndex('manualShoppingItems', 'byWeek', weekStart);
    const manual = manualRaw
      .map((item) => ({ ...item, checked: !!stateMap.get(`manual:${item.id}`), stateId: `manual:${item.id}` }))
      .sort((a, b) => a.createdAt - b.createdAt);

    return { grouped, manual, mealCount: validMeals.length };
  },

  async toggleChecked(stateId, checked) {
    await DB.put('shoppingItemState', { id: stateId, checked });
  },

  async addManualItem(weekStart, name) {
    const item = { id: DB.genId(), weekStart, name: name.trim(), createdAt: Date.now() };
    await DB.put('manualShoppingItems', item);
    return item;
  },

  async removeManualItem(id) {
    await DB.delete('manualShoppingItems', id);
    await DB.delete('shoppingItemState', `manual:${id}`);
  },

  async clearCheckedForWeek(weekStart, groupedIds, manualIds) {
    for (const id of groupedIds) await DB.delete('shoppingItemState', `${weekStart}:${id}`);
    for (const id of manualIds) await DB.delete('shoppingItemState', `manual:${id}`);
  },
};
