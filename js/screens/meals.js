import { Meals, CATEGORIES, CATEGORY_COLORS } from '../repo.js';
import { navigate, setHeader } from '../app.js';

export async function renderMealsList(main) {
  const addBtn = document.createElement('button');
  addBtn.className = 'icon-btn';
  addBtn.textContent = '+';
  addBtn.style.fontSize = '1.3rem';
  addBtn.addEventListener('click', () => navigate('mealEdit'));
  setHeader('My Meals', addBtn);

  let activeCategory = 'All';
  let searchTerm = '';
  const allMeals = await Meals.all();

  main.innerHTML = `
    <div class="search-bar">
      <input type="text" id="meal-search" placeholder="Search your meals…" />
    </div>
    <div class="category-tabs" id="category-tabs" style="padding:0 0 10px;"></div>
    <div id="meal-grid-container"></div>
  `;

  const tabsEl = main.querySelector('#category-tabs');
  ['All', ...CATEGORIES].forEach((cat) => {
    const tab = document.createElement('button');
    tab.className = 'category-tab' + (cat === activeCategory ? ' active' : '');
    tab.textContent = cat;
    tab.addEventListener('click', () => {
      activeCategory = cat;
      tabsEl.querySelectorAll('.category-tab').forEach((t) => t.classList.remove('active'));
      tab.classList.add('active');
      renderGrid();
    });
    tabsEl.appendChild(tab);
  });

  main.querySelector('#meal-search').addEventListener('input', (e) => {
    searchTerm = e.target.value.toLowerCase();
    renderGrid();
  });

  function renderGrid() {
    const container = main.querySelector('#meal-grid-container');
    const filtered = allMeals.filter((m) => {
      const matchesCategory = activeCategory === 'All' || m.category === activeCategory;
      const matchesSearch = !searchTerm || m.name.toLowerCase().includes(searchTerm);
      return matchesCategory && matchesSearch;
    });

    if (filtered.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <span class="emoji">🍽️</span>
          ${allMeals.length === 0 ? 'No meals yet. Tap + to add your first one.' : 'No meals match your search.'}
        </div>`;
      return;
    }

    const grid = document.createElement('div');
    grid.className = 'meal-grid';
    filtered.forEach((meal) => {
      const card = document.createElement('div');
      card.className = 'meal-grid-card';
      const color = CATEGORY_COLORS[meal.category] || '#999';
      card.innerHTML = `
        ${meal.image
          ? `<img class="meal-img" src="${meal.image}" alt="">`
          : `<div class="meal-img-placeholder">🍲</div>`}
        <div class="meal-card-body">
          <span class="chip" style="background:${color};">${meal.category}</span>
          <div class="meal-card-name">${escapeHtml(meal.name)}</div>
        </div>
      `;
      card.addEventListener('click', () => navigate('mealEdit', { id: meal.id }));
      grid.appendChild(card);
    });
    container.innerHTML = '';
    container.appendChild(grid);
  }

  renderGrid();
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
