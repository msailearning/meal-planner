import { ShoppingList } from '../repo.js';
import { DB } from '../db.js';
import { addDays, formatISO, parseISO, thisCycleStart, formatWeekRangeLabel } from '../dates.js';

const CYCLE_SETTING_KEY = 'plannerCycleStart';
const SHOPPING_WEEK_KEY = 'shoppingWeekIndex';

export async function renderShopping(main) {
  let cycleStart = await DB.getSetting(CYCLE_SETTING_KEY);
  if (!cycleStart) {
    cycleStart = formatISO(thisCycleStart());
    await DB.setSetting(CYCLE_SETTING_KEY, cycleStart);
  }
  let weekIndex = Number(await DB.getSetting(SHOPPING_WEEK_KEY, 0)) || 0;
  if (weekIndex < 0) weekIndex = 0;
  if (weekIndex > 3) weekIndex = 3;

  async function draw() {
    const weekStart = formatISO(addDays(parseISO(cycleStart), weekIndex * 7));
    const { grouped, manual } = await ShoppingList.build(weekStart);

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

    if (grouped.length === 0 && manual.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'empty-state';
      empty.innerHTML = `<span class="emoji">🛒</span>No items yet.<br>Plan some meals for this week, or add items manually below.`;
      main.appendChild(empty);
    } else {
      if (grouped.length > 0) {
        const title = document.createElement('div');
        title.className = 'shopping-section-title';
        title.textContent = 'From your meals';
        main.appendChild(title);
        grouped.forEach((item) => main.appendChild(renderShoppingItem(item, draw)));
      }

      if (manual.length > 0) {
        const title = document.createElement('div');
        title.className = 'shopping-section-title';
        title.textContent = 'Added manually';
        main.appendChild(title);
        manual.forEach((item) => main.appendChild(renderManualItem(item, draw)));
      }
    }

    const addBar = document.createElement('div');
    addBar.className = 'add-item-bar';
    addBar.innerHTML = `
      <input type="text" id="manual-item-input" placeholder="Add an item…" />
      <button class="btn btn-primary" id="manual-item-add">Add</button>
    `;
    main.appendChild(addBar);

    const input = addBar.querySelector('#manual-item-input');
    const addManual = async () => {
      const val = input.value.trim();
      if (!val) return;
      await ShoppingList.addManualItem(weekStart, val);
      input.value = '';
      draw();
    };
    addBar.querySelector('#manual-item-add').addEventListener('click', addManual);
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') addManual(); });

    document.getElementById('prev-week').addEventListener('click', async () => {
      if (weekIndex > 0) {
        weekIndex -= 1;
        await DB.setSetting(SHOPPING_WEEK_KEY, weekIndex);
        draw();
      }
    });
    document.getElementById('next-week').addEventListener('click', async () => {
      if (weekIndex < 3) {
        weekIndex += 1;
        await DB.setSetting(SHOPPING_WEEK_KEY, weekIndex);
        draw();
      }
    });
  }

  await draw();
}

function renderShoppingItem(item, onChange) {
  const row = document.createElement('div');
  row.className = 'shopping-item' + (item.checked ? ' checked' : '');
  const uniqueMeals = [...new Set(item.mealNames)];
  const qtyText = item.qtyList.length ? item.qtyList.join(', ') : '';
  row.innerHTML = `
    <div class="shopping-check ${item.checked ? 'checked' : ''}">${item.checked ? '✓' : ''}</div>
    <div class="shopping-item-body">
      <div class="shopping-item-name">
        ${escapeHtml(item.name)}
        ${item.flagged ? '<span class="flag-badge">May need extra</span>' : ''}
      </div>
      ${qtyText ? `<div class="shopping-item-qty">${escapeHtml(qtyText)}</div>` : ''}
      <div class="shopping-item-meals">Used for: ${uniqueMeals.map(escapeHtml).join(', ')}</div>
    </div>
  `;
  row.addEventListener('click', async () => {
    await ShoppingList.toggleChecked(item.stateId, !item.checked);
    onChange();
  });
  return row;
}

function renderManualItem(item, onChange) {
  const row = document.createElement('div');
  row.className = 'shopping-item' + (item.checked ? ' checked' : '');
  row.innerHTML = `
    <div class="shopping-check ${item.checked ? 'checked' : ''}">${item.checked ? '✓' : ''}</div>
    <div class="shopping-item-body">
      <div class="shopping-item-name">${escapeHtml(item.name)}</div>
    </div>
    <button class="remove-manual-btn">✕</button>
  `;
  row.querySelector('.shopping-check').parentElement;
  row.addEventListener('click', async (e) => {
    if (e.target.closest('.remove-manual-btn')) return;
    await ShoppingList.toggleChecked(item.stateId, !item.checked);
    onChange();
  });
  row.querySelector('.remove-manual-btn').addEventListener('click', async (e) => {
    e.stopPropagation();
    await ShoppingList.removeManualItem(item.id);
    onChange();
  });
  return row;
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
