import { renderPlanner } from './screens/planner.js';
import { renderMealsList } from './screens/meals.js';
import { renderMealEdit } from './screens/mealEdit.js';
import { renderShopping } from './screens/shopping.js';
import { renderOverview } from './screens/overview.js';
import { seedIfEmpty } from './seed.js';

const main = document.getElementById('main-content');
const headerTitle = document.getElementById('header-title');
const headerAction = document.getElementById('header-action');
const navButtons = document.querySelectorAll('.nav-btn');

const routes = {
  planner: { title: 'Meal Planner', tab: 'planner', render: renderPlanner },
  meals: { title: 'My Meals', tab: 'meals', render: renderMealsList },
  mealEdit: { title: 'Meal', tab: 'meals', render: renderMealEdit },
  shopping: { title: 'Shopping List', tab: 'shopping', render: renderShopping },
  overview: { title: 'Weekly Overview', tab: 'overview', render: renderOverview },
};

export function navigate(routeName, params = {}) {
  const query = new URLSearchParams(params).toString();
  window.location.hash = `#${routeName}${query ? '?' + query : ''}`;
}

function parseHash() {
  const hash = window.location.hash.replace(/^#/, '') || 'planner';
  const [routeName, queryStr] = hash.split('?');
  const params = {};
  if (queryStr) {
    new URLSearchParams(queryStr).forEach((v, k) => { params[k] = v; });
  }
  return { routeName: routeName || 'planner', params };
}

export function setHeader(title, actionEl) {
  headerTitle.textContent = title;
  headerAction.innerHTML = '';
  if (actionEl) headerAction.appendChild(actionEl);
}

async function renderCurrentRoute() {
  const { routeName, params } = parseHash();
  const route = routes[routeName] || routes.planner;

  navButtons.forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.route === route.tab);
  });

  setHeader(route.title, null);
  main.innerHTML = '<div class="empty-state">Loading…</div>';
  try {
    await route.render(main, params);
  } catch (err) {
    console.error(err);
    main.innerHTML = `<div class="empty-state"><span class="emoji">⚠️</span>Something went wrong.<br><small>${err.message || err}</small></div>`;
  }
}

navButtons.forEach((btn) => {
  btn.addEventListener('click', () => navigate(btn.dataset.route));
});

window.addEventListener('hashchange', renderCurrentRoute);

async function init() {
  await seedIfEmpty();
  await renderCurrentRoute();

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch((err) => console.warn('SW registration failed', err));
  }
}

init();
