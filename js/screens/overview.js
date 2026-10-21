import { Meals, Planner, ShoppingList, CATEGORY_COLORS } from '../repo.js';
import { DB } from '../db.js';
import { DAYS, DAY_FULL, addDays, formatISO, parseISO, thisCycleStart, formatDayLabel, formatWeekRangeLabel } from '../dates.js';
import { navigate } from '../app.js';

const CYCLE_SETTING_KEY = 'plannerCycleStart';
const OVERVIEW_WEEK_KEY = 'overviewWeekIndex';

export async function renderOverview(main) {
  let cycleStart = await DB.getSetting(CYCLE_SETTING_KEY);
  if (!cycleStart) {
    cycleStart = formatISO(thisCycleStart());
    await DB.setSetting(CYCLE_SETTING_KEY, cycleStart);
  }
  let weekIndex = Number(await DB.getSetting(OVERVIEW_WEEK_KEY, 0)) || 0;
  if (weekIndex < 0) weekIndex = 0;
  if (weekIndex > 3) weekIndex = 3;

  async function draw() {
    const weekStart = formatISO(addDays(parseISO(cycleStart), weekIndex * 7));
    const meals = await Meals.all();
    const mealsById = new Map(meals.map((m) => [m.id, m]));
    const dayAssignments = await Promise.all(DAYS.map((day) => Planner.mealsForDay(weekStart, day)));
    const { grouped, mealCount } = await ShoppingList.build(weekStart);

    main.innerHTML = '';

    const tabsWrap = document.createElement('div');
    tabsWrap.className = 'overview-week-select';
    for (let i = 0; i < 4; i++) {
      const tab = document.createElement('button');
      tab.className = 'category-tab' + (i === weekIndex ? ' active' : '');
      tab.textContent = `Week ${i + 1}`;
      tab.addEventListener('click', async () => {
        weekIndex = i;
        await DB.setSetting(OVERVIEW_WEEK_KEY, weekIndex);
        draw();
      });
      tabsWrap.appendChild(tab);
    }
    main.appendChild(tabsWrap);

    const rangeLabel = document.createElement('div');
    rangeLabel.style.textAlign = 'center';
    rangeLabel.style.color = 'var(--text-muted)';
    rangeLabel.style.fontSize = '0.8rem';
    rangeLabel.style.marginBottom = '14px';
    rangeLabel.textContent = formatWeekRangeLabel(weekStart);
    main.appendChild(rangeLabel);

    let totalMealSlots = 0;

    DAYS.forEach((day, i) => {
      const assignments = dayAssignments[i];
      const dayMeals = assignments.map((a) => mealsById.get(a.mealId)).filter(Boolean);
      totalMealSlots += dayMeals.length;

      const block = document.createElement('div');
      block.className = 'overview-day-block';
      const dateLabel = formatDayLabel(addDays(parseISO(weekStart), i));
      block.innerHTML = `<div class="overview-day-title">${DAY_FULL[i]} <span class="date-sub">${dateLabel}</span></div>`;

      if (dayMeals.length === 0) {
        const none = document.createElement('div');
        none.style.color = 'var(--text-muted)';
        none.style.fontSize = '0.82rem';
        none.textContent = 'No meals planned';
        block.appendChild(none);
      } else {
        const cardsWrap = document.createElement('div');
        cardsWrap.className = 'overview-meal-cards';
        dayMeals.forEach((meal) => {
          const color = CATEGORY_COLORS[meal.category] || '#999';
          const card = document.createElement('div');
          card.className = 'overview-meal-card';
          card.innerHTML = `
            ${meal.image ? `<img class="meal-img" src="${meal.image}" alt="">` : `<div class="meal-img-placeholder">🍲</div>`}
            <div class="meal-card-body">
              <span class="chip" style="background:${color};font-size:0.6rem;">${meal.category}</span>
              <div class="meal-card-name">${escapeHtml(meal.name)}</div>
            </div>
          `;
          cardsWrap.appendChild(card);
        });
        block.appendChild(cardsWrap);
      }
      main.appendChild(block);
    });

    const summaryGrid = document.createElement('div');
    summaryGrid.className = 'overview-summary-grid';
    summaryGrid.innerHTML = `
      <div class="summary-stat"><div class="stat-num">${totalMealSlots}</div><div class="stat-label">Meals Planned</div></div>
      <div class="summary-stat"><div class="stat-num">${grouped.length}</div><div class="stat-label">Ingredients Needed</div></div>
    `;
    main.appendChild(summaryGrid);

    const flaggedCount = grouped.filter((g) => g.flagged).length;
    if (flaggedCount > 0) {
      const note = document.createElement('div');
      note.style.textAlign = 'center';
      note.style.color = 'var(--warning)';
      note.style.fontSize = '0.8rem';
      note.style.fontWeight = '700';
      note.style.marginTop = '10px';
      note.textContent = `⚠ ${flaggedCount} ingredient${flaggedCount > 1 ? 's' : ''} may need extra (used in multiple meals)`;
      main.appendChild(note);
    }

    const shopBtn = document.createElement('button');
    shopBtn.className = 'link-card';
    shopBtn.innerHTML = `<span>🛒 View full shopping list</span><span>›</span>`;
    shopBtn.addEventListener('click', async () => {
      await DB.setSetting('shoppingWeekIndex', weekIndex);
      navigate('shopping');
    });
    main.appendChild(shopBtn);
  }

  await draw();
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
