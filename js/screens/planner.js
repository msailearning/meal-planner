import { Meals, Planner, CATEGORIES, CATEGORY_COLORS } from '../repo.js';
import { DB } from '../db.js';
import { DAYS, DAY_FULL, formatISO, parseISO, addDays, thisCycleStart, formatDayLabel, formatWeekRangeLabel } from '../dates.js';

const CYCLE_SETTING_KEY = 'plannerCycleStart';
const WEEK_INDEX_KEY = 'plannerWeekIndex';

let cycleStart = null;
let weekIndex = 0;

async function loadCycleState() {
  let stored = await DB.getSetting(CYCLE_SETTING_KEY);
  if (!stored) {
    stored = formatISO(thisCycleStart());
    await DB.setSetting(CYCLE_SETTING_KEY, stored);
  }
  cycleStart = stored;
  weekIndex = Number(await DB.getSetting(WEEK_INDEX_KEY, 0)) || 0;
  if (weekIndex < 0) weekIndex = 0;
  if (weekIndex > 3) weekIndex = 3;
}

function weekStartForIndex(idx) {
  return formatISO(addDays(parseISO(cycleStart), idx * 7));
}

export async function renderPlanner(main) {
  await loadCycleState();
  await draw(main);
}

async function draw(main) {
  const weekStart = weekStartForIndex(weekIndex);
  const meals = await Meals.all();
  const mealsById = new Map(meals.map((m) => [m.id, m]));

  const dayAssignments = await Promise.all(
    DAYS.map((_, i) => Planner.mealsForDay(weekStart, DAYS[i]))
  );

  main.innerHTML = '';

  const header = document.createElement('div');
  header.className = 'week-pager-header';
  header.innerHTML = `
    <button class="icon-btn" id="prev-week" ${weekIndex === 0 ? 'disabled style="opacity:.3"' : ''}>‹</button>
    <h2>Week ${weekIndex + 1} <span style="color:var(--text-muted);font-weight:500;">· ${formatWeekRangeLabel(weekStart)}</span></h2>
    <button class="icon-btn" id="next-week" ${weekIndex === 3 ? 'disabled style="opacity:.3"' : ''}>›</button>
  `;
  main.appendChild(header);

  const dots = document.createElement('div');
  dots.className = 'week-dots';
  for (let i = 0; i < 4; i++) {
    const dot = document.createElement('div');
    dot.className = 'week-dot' + (i === weekIndex ? ' active' : '');
    dots.appendChild(dot);
  }
  main.appendChild(dots);

  const dayDates = DAYS.map((_, i) => addDays(parseISO(weekStart), i));

  DAYS.forEach((day, i) => {
    const card = document.createElement('div');
    card.className = 'day-card';

    const assignments = dayAssignments[i];
    const assignedMeals = assignments.map((a) => mealsById.get(a.mealId)).filter(Boolean);

    const dateLabel = formatDayLabel(dayDates[i]);

    card.innerHTML = `
      <div class="day-card-header">
        <span class="day-name">${DAY_FULL[i]}</span>
        <span class="day-date">${dateLabel}</span>
      </div>
      <div class="meal-pills-container"></div>
      <button class="add-meal-btn" data-day="${day}">+ Add meal</button>
    `;

    const pillsContainer = card.querySelector('.meal-pills-container');
    assignedMeals.forEach((meal) => {
      const pill = document.createElement('div');
      pill.className = 'day-meal-pill';
      const color = CATEGORY_COLORS[meal.category] || 'var(--primary)';
      pill.innerHTML = `
        <div class="meal-info">
          ${meal.image
            ? `<img class="meal-thumb" src="${meal.image}" alt="">`
            : `<div class="meal-thumb" style="background:${color};display:flex;align-items:center;justify-content:center;color:white;font-size:0.8rem;">${meal.name.charAt(0).toUpperCase()}</div>`}
          <span class="meal-name">${escapeHtml(meal.name)}</span>
        </div>
        <button class="remove-pill-btn" data-day="${day}" data-meal-id="${meal.id}">✕</button>
      `;
      pillsContainer.appendChild(pill);
    });

    card.querySelector('.add-meal-btn').addEventListener('click', () => openMealPicker(weekStart, day, meals, () => draw(main)));
    pillsContainer.querySelectorAll('.remove-pill-btn').forEach((btn) => {
      btn.addEventListener('click', async () => {
        await Planner.removeMeal(weekStart, btn.dataset.day, btn.dataset.mealId);
        draw(main);
      });
    });

    main.appendChild(card);
  });

  document.getElementById('prev-week').addEventListener('click', async () => {
    if (weekIndex > 0) {
      weekIndex -= 1;
      await DB.setSetting(WEEK_INDEX_KEY, weekIndex);
      draw(main);
    }
  });
  document.getElementById('next-week').addEventListener('click', async () => {
    if (weekIndex < 3) {
      weekIndex += 1;
      await DB.setSetting(WEEK_INDEX_KEY, weekIndex);
      draw(main);
    }
  });

  if (meals.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'empty-state';
    empty.innerHTML = `<span class="emoji">🍳</span>No meals saved yet.<br>Go to the <b>Meals</b> tab to add your first meal.`;
    main.appendChild(empty);
  }
}

function openMealPicker(weekStart, day, meals, onClose) {
  const overlay = document.createElement('div');
  overlay.className = 'sheet-overlay';

  let activeCategory = 'All';
  let searchTerm = '';
  let selectedIds = new Set();

  Planner.mealsForDay(weekStart, day).then((existing) => {
    selectedIds = new Set(existing.map((e) => e.mealId));
    renderList();
  });

  overlay.innerHTML = `
    <div class="sheet">
      <div class="sheet-handle"></div>
      <div class="sheet-header">
        <h3>Add to ${day}</h3>
        <button class="icon-btn" id="close-sheet">✕</button>
      </div>
      <div style="padding:0 14px 10px;">
        <input type="text" id="meal-search" placeholder="Search meals…" style="width:100%;padding:10px 12px;border-radius:10px;border:1px solid var(--border);font-size:0.9rem;">
      </div>
      <div class="category-tabs" id="picker-tabs"></div>
      <div class="sheet-body" id="picker-body"></div>
      <div class="sheet-footer">
        <button class="btn btn-primary btn-block" id="done-picking">Done</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  const tabsEl = overlay.querySelector('#picker-tabs');
  ['All', ...CATEGORIES].forEach((cat) => {
    const tab = document.createElement('button');
    tab.className = 'category-tab' + (cat === activeCategory ? ' active' : '');
    tab.textContent = cat;
    tab.addEventListener('click', () => {
      activeCategory = cat;
      tabsEl.querySelectorAll('.category-tab').forEach((t) => t.classList.remove('active'));
      tab.classList.add('active');
      renderList();
    });
    tabsEl.appendChild(tab);
  });

  overlay.querySelector('#meal-search').addEventListener('input', (e) => {
    searchTerm = e.target.value.toLowerCase();
    renderList();
  });

  function renderList() {
    const body = overlay.querySelector('#picker-body');
    const filtered = meals.filter((m) => {
      const matchesCategory = activeCategory === 'All' || m.category === activeCategory;
      const matchesSearch = !searchTerm || m.name.toLowerCase().includes(searchTerm);
      return matchesCategory && matchesSearch;
    });

    if (filtered.length === 0) {
      body.innerHTML = `<div class="empty-state">No meals found.</div>`;
      return;
    }

    body.innerHTML = '';
    filtered.forEach((meal) => {
      const row = document.createElement('div');
      row.className = 'meal-pick-row';
      const isSelected = selectedIds.has(meal.id);
      const color = CATEGORY_COLORS[meal.category] || 'var(--primary)';
      row.innerHTML = `
        ${meal.image
          ? `<img class="meal-thumb" src="${meal.image}" alt="">`
          : `<div class="meal-thumb" style="background:${color};display:flex;align-items:center;justify-content:center;color:white;">${meal.name.charAt(0).toUpperCase()}</div>`}
        <span class="meal-pick-name">${escapeHtml(meal.name)}</span>
        <div class="checkbox-circle ${isSelected ? 'checked' : ''}">${isSelected ? '✓' : ''}</div>
      `;
      row.addEventListener('click', () => {
        if (selectedIds.has(meal.id)) selectedIds.delete(meal.id);
        else selectedIds.add(meal.id);
        renderList();
      });
      body.appendChild(row);
    });
  }

  overlay.querySelector('#close-sheet').addEventListener('click', closeSheet);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) closeSheet(); });
  overlay.querySelector('#done-picking').addEventListener('click', async () => {
    await Planner.setMealsForDay(weekStart, day, [...selectedIds]);
    closeSheet();
    onClose();
  });

  function closeSheet() {
    overlay.remove();
  }
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
