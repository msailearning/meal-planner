# Meal Planner & Shopping List

A simple, colourful, phone-first meal planner and shopping list app.

## Features
- 4-week meal planner, weeks run Saturday–Friday
- Multiple meals per day, organised by Breakfast/Lunch/Dinner/Snack
- Meal database with optional photos and ingredients
- Automatic shopping list generation from planned meals
  - Duplicate ingredients merged, flagged "May need extra" when used by multiple meals
  - Shows which meals each ingredient is for
  - Manual items and tick-off while shopping
- Weekly overview with meal photos and ingredient summary

## Tech
Plain HTML/CSS/JavaScript PWA — no build step, no server required. All data is stored
locally on your device using IndexedDB. Installable to your phone's home screen via
"Add to Home Screen" from your browser.

## Running locally
Serve the folder with any static file server, e.g.:

```
python -m http.server 8000
```

Then open `http://localhost:8000` in your browser.
