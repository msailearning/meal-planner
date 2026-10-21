import { DB } from './db.js';
import { Meals } from './repo.js';

// Pulled from the user's "Ingredients List" sheet in Menu and Shopping List.xlsx.
// Categories are a best-guess mapping onto Breakfast/Lunch/Dinner/Snack; easy to edit in-app.
const SEED_MEALS = [
  { name: 'Egg SW', category: 'Breakfast', ingredients: ['grown up bread', 'eggs', 'mayonnaise'] },
  { name: 'Sopas', category: 'Breakfast', ingredients: ['macaroni', 'chicken/pork mince', 'cheese slices', 'Milk - Powder', 'Beef cubes', 'Frozen - veggie rice'] },
  { name: 'Cereal', category: 'Breakfast', ingredients: ['Cereal', 'Milk - Full Cream'] },
  { name: 'Overnight Oats', category: 'Breakfast', ingredients: ['rolled oats', 'Yoghurt', 'Milk UHT - Almond', 'Maple Syrup', 'FV - bananas', 'FV - blueberries', 'Chia seeds'] },
  { name: 'Tuna w/ egg', category: 'Lunch', ingredients: ['Tuna Hot&Spicy', 'Eggs'] },
  { name: 'Fish sinigang', category: 'Dinner', ingredients: ['Bangus belly', 'Okra', 'Sitaw', 'Daikon', 'Sinigang mix', 'FV - tomatoes', 'FV - spinach'] },
  { name: 'Fish Paksiw', category: 'Dinner', ingredients: ['Bangus belly', 'FV - garlic', 'FV - ginger', 'FV - onions', 'Vinegar', 'Ampalaya', 'Sitaw', 'Peppercorn'] },
  { name: 'Pork Adobo', category: 'Dinner', ingredients: ['Pork shoulder', 'Soy sauce', 'Bay leaves', 'Garlic', 'Peppercorns', 'Vinegar', 'Potatoes', 'Sitaw'] },
  { name: 'Pork+Kailan', category: 'Lunch', ingredients: ['Pork Stirfry', 'Kailan', 'Brown sauce ingredients'] },
  { name: 'Cheese SW', category: 'Snack', ingredients: ['White bread', 'Cheese slices', 'Chiz Whiz'] },
  { name: 'Batchoy', category: 'Dinner', ingredients: ['Deli - pork shoulder', 'Liquid seasoning', 'Soy sauce', 'FV - Ginger', 'Pork liver', 'Frozen - frozen onions', 'Minced garlic', 'FV - Chokoes', 'FV - spinach'] },
  { name: 'Spaghetti', category: 'Dinner', ingredients: ['Spaghetti noodles', 'Spaghetti sauce', 'Frozen - frozen onions', 'Frozen - veggie rice', 'Frozen - chopped spinach', 'Deli - beef mince', 'Cheese - Tasty shredded', 'Cheese - Slices', 'Cheese - Bocconcini'] },
  { name: 'Kyiv', category: 'Dinner', ingredients: ['Deli - Kyiv'] },
  { name: 'Cottage Pie', category: 'Dinner', ingredients: ['Coles Cottage Pie'] },
  { name: 'Grocery Chicken', category: 'Dinner', ingredients: ['Grocery Chicken'] },
  { name: 'Nutella SW', category: 'Snack', ingredients: ['White bread', 'Nutella SW'] },
  { name: 'Nachos', category: 'Snack', ingredients: ['Deli - beef mince', 'Cheese - Tasty shredded', 'Nacho chips', 'Taco sauce', 'Taco seasoning', 'Frozen - frozen onions', 'Minced garlic'] },
  { name: 'HC Croissant', category: 'Snack', ingredients: ['Croissant', 'Ham', 'Cheese - Slices'] },
  { name: 'Sinampalukan', category: 'Dinner', ingredients: ['FV - Ginger', 'Frozen - frozen onions', 'Chicken', 'Sinigang mix', 'Sitaw', 'FV - Spinach', 'Fish sauce'] },
  { name: 'Tinola', category: 'Dinner', ingredients: ['FV - Ginger', 'FV - Garlic', 'Peppercorns', 'Frozen - frozen onions', 'Chicken', 'Tinola mix', 'Chokoes', 'Spinach/Chili leaves', 'Fish sauce'] },
  { name: 'Arroz Caldo', category: 'Breakfast', ingredients: ['FV - Ginger', 'FV - Garlic', 'Glutinous rice', 'Frozen - frozen onions', 'Chicken', 'Beef cubes', 'Fish sauce', 'Eggs'] },
  { name: 'Fish Ginger Shallot', category: 'Dinner', ingredients: ['Pomfret', 'FV - Ginger', 'FV - shallots', 'Soy sauce', 'Liquid seasoning', 'Beef cube'] },
  { name: 'Afritada', category: 'Dinner', ingredients: ['Chicken', 'Frozen - frozen onions', 'Minced garlic', 'FV - capsicum', 'FV - Carrots', 'FV - Potatoes', 'Bay leaves', 'Afritada mix', 'Tomato Sauce (opt)', 'Chicken stock (opt)', 'Sugar (opt)'] },
  { name: 'Pizza', category: 'Dinner', ingredients: ['Pizza base', 'Pizza sauce', 'Mozzarella', 'Pizza toppings'] },
  { name: 'Pancit', category: 'Lunch', ingredients: ['Bean vermicelli', 'Pork bones', 'Prawns', 'Chicken', 'Cabbage', 'Beef cubes', 'Soy sauce', 'Liquid seasoning', 'Frozen - frozen onions', 'Minced garlic'] },
];

export async function seedIfEmpty() {
  const count = await DB.count('meals');
  if (count > 0) return;

  for (const seed of SEED_MEALS) {
    await Meals.save({
      name: seed.name,
      category: seed.category,
      image: null,
      notes: '',
      ingredients: seed.ingredients.map((name) => ({ name, qty: '' })),
    });
  }
}
