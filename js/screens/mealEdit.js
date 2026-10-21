import { Meals, CATEGORIES } from '../repo.js';
import { navigate, setHeader } from '../app.js';

async function resizeImage(file, maxSize = 480) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > height && width > maxSize) {
          height = Math.round((height * maxSize) / width);
          width = maxSize;
        } else if (height > maxSize) {
          width = Math.round((width * maxSize) / height);
          height = maxSize;
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.8));
      };
      img.onerror = reject;
      img.src = reader.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export async function renderMealEdit(main, params) {
  const existing = params.id ? await Meals.get(params.id) : null;
  setHeader(existing ? 'Edit Meal' : 'New Meal', null);

  let image = existing ? existing.image : null;
  let category = existing ? existing.category : CATEGORIES[0];
  let ingredients = existing ? existing.ingredients.map((i) => ({ name: i.name, qty: i.qty })) : [{ name: '', qty: '' }];

  main.innerHTML = `
    <div class="form-group">
      <label>Meal Name</label>
      <input type="text" id="meal-name" placeholder="e.g. Spaghetti" value="${existing ? escapeAttr(existing.name) : ''}" />
    </div>

    <div class="form-group">
      <label>Category</label>
      <div class="category-select" id="category-select"></div>
    </div>

    <div class="form-group">
      <label>Photo (optional)</label>
      <div class="image-picker">
        <img id="image-preview" class="image-preview" src="${image || ''}" style="${image ? '' : 'display:none;'}" />
        <div id="image-placeholder" class="image-preview" style="${image ? 'display:none;' : 'display:flex;'}align-items:center;justify-content:center;font-size:1.6rem;">📷</div>
        <input type="file" id="image-input" accept="image/*" style="display:none;" />
        <button class="btn btn-secondary" id="pick-image-btn">Choose Photo</button>
        <button class="btn btn-ghost" id="remove-image-btn" style="${image ? '' : 'display:none;'}">Remove</button>
      </div>
    </div>

    <div class="form-group">
      <label>Ingredients</label>
      <div id="ingredients-list"></div>
      <button class="add-ingredient-btn" id="add-ingredient-btn">+ Add ingredient</button>
    </div>

    <div class="form-group">
      <label>Notes (optional)</label>
      <textarea id="meal-notes" rows="2" placeholder="Any extra notes…">${existing ? escapeHtml(existing.notes || '') : ''}</textarea>
    </div>

    <div class="form-actions">
      <button class="btn btn-secondary" id="cancel-btn">Cancel</button>
      <button class="btn btn-primary" id="save-btn">Save Meal</button>
    </div>
    ${existing ? '<button class="btn btn-danger btn-block" id="delete-btn" style="margin-top:12px;">Delete Meal</button>' : ''}
  `;

  const categorySelect = main.querySelector('#category-select');
  CATEGORIES.forEach((cat) => {
    const tab = document.createElement('button');
    tab.className = 'category-tab' + (cat === category ? ' active' : '');
    tab.textContent = cat;
    tab.addEventListener('click', () => {
      category = cat;
      categorySelect.querySelectorAll('.category-tab').forEach((t) => t.classList.remove('active'));
      tab.classList.add('active');
    });
    categorySelect.appendChild(tab);
  });

  const ingredientsList = main.querySelector('#ingredients-list');
  function renderIngredientRows() {
    ingredientsList.innerHTML = '';
    ingredients.forEach((ing, idx) => {
      const row = document.createElement('div');
      row.className = 'ingredient-row';
      row.innerHTML = `
        <input type="text" class="ing-name" placeholder="Ingredient" value="${escapeAttr(ing.name)}" />
        <input type="text" class="ing-qty" placeholder="Qty (opt)" value="${escapeAttr(ing.qty)}" />
        <button class="remove-ing-btn">✕</button>
      `;
      row.querySelector('.ing-name').addEventListener('input', (e) => { ingredients[idx].name = e.target.value; });
      row.querySelector('.ing-qty').addEventListener('input', (e) => { ingredients[idx].qty = e.target.value; });
      row.querySelector('.remove-ing-btn').addEventListener('click', () => {
        ingredients.splice(idx, 1);
        if (ingredients.length === 0) ingredients.push({ name: '', qty: '' });
        renderIngredientRows();
      });
      ingredientsList.appendChild(row);
    });
  }
  renderIngredientRows();

  main.querySelector('#add-ingredient-btn').addEventListener('click', () => {
    ingredients.push({ name: '', qty: '' });
    renderIngredientRows();
  });

  const imageInput = main.querySelector('#image-input');
  const imagePreview = main.querySelector('#image-preview');
  const imagePlaceholder = main.querySelector('#image-placeholder');
  const removeImageBtn = main.querySelector('#remove-image-btn');

  main.querySelector('#pick-image-btn').addEventListener('click', () => imageInput.click());
  imageInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      image = await resizeImage(file);
      imagePreview.src = image;
      imagePreview.style.display = '';
      imagePlaceholder.style.display = 'none';
      removeImageBtn.style.display = '';
    } catch (err) {
      console.error(err);
      alert('Could not load that image.');
    }
  });
  removeImageBtn.addEventListener('click', () => {
    image = null;
    imagePreview.style.display = 'none';
    imagePlaceholder.style.display = 'flex';
    removeImageBtn.style.display = 'none';
  });

  main.querySelector('#cancel-btn').addEventListener('click', () => navigate('meals'));

  main.querySelector('#save-btn').addEventListener('click', async () => {
    const name = main.querySelector('#meal-name').value.trim();
    if (!name) {
      alert('Please enter a meal name.');
      return;
    }
    const notes = main.querySelector('#meal-notes').value;
    await Meals.save({
      id: existing ? existing.id : undefined,
      name,
      category,
      image,
      notes,
      ingredients: ingredients.filter((i) => i.name.trim()),
    });
    navigate('meals');
  });

  const deleteBtn = main.querySelector('#delete-btn');
  if (deleteBtn) {
    deleteBtn.addEventListener('click', async () => {
      if (confirm(`Delete "${existing.name}"? This will also remove it from your planner.`)) {
        await Meals.remove(existing.id);
        navigate('meals');
      }
    });
  }
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function escapeAttr(str) {
  return escapeHtml(str || '').replace(/"/g, '&quot;');
}
