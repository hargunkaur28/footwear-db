// ========================================
// FootwearDB — Main Application Logic
// ========================================

const API_BASE = '/api';
let token = localStorage.getItem('fw_token');
let currentUser = null;
let selectedFiles = [];

// ========================================
// Built-in defaults for smart dropdowns
// ========================================
const BUILT_IN = {
  color: [
    'Black', 'White', 'Grey', 'Navy Blue', 'Red', 'Blue', 'Brown',
    'Beige', 'Tan', 'Olive', 'Green', 'Yellow', 'Orange', 'Pink',
    'Purple', 'Maroon', 'Cream', 'Gold', 'Silver', 'Multi-Color',
  ],
  size: [
    'UK 4', 'UK 5', 'UK 6', 'UK 7', 'UK 8', 'UK 9', 'UK 10', 'UK 11', 'UK 12',
    'EU 36', 'EU 37', 'EU 38', 'EU 39', 'EU 40', 'EU 41', 'EU 42', 'EU 43', 'EU 44', 'EU 45',
    'US 5', 'US 6', 'US 7', 'US 8', 'US 9', 'US 10', 'US 11', 'US 12',
    'Kids 1', 'Kids 2', 'Kids 3', 'Kids 4', 'Kids 5',
  ],
  material: [
    'Leather', 'Synthetic Leather', 'Canvas', 'Mesh', 'Suede', 'Nubuck',
    'Rubber', 'EVA Foam', 'TPU', 'Knit / Flyknit', 'Neoprene',
    'Textile', 'Patent Leather', 'Cork', 'Jute', 'Velvet',
  ],
};

const subCategories = {
  Shoes:    ['Sneakers', 'Sports / Running', 'Casual', 'Formal', 'Training', 'Basketball', 'Skate', 'Tennis', 'Hiking', 'Oxford', 'Derby'],
  Sandals:  ['Casual Sandals', 'Sports Sandals', 'Flip Flops', 'Slides', 'Gladiator', 'Wedge', 'Platform', 'T-Strap'],
  Boots:    ['Ankle Boots', 'Chelsea Boots', 'Combat Boots', 'Hiking Boots', 'Rain Boots', 'Work Boots', 'Cowboy Boots', 'Knee-High Boots'],
  Slippers: ['Indoor Slippers', 'Outdoor Slippers', 'Moccasin Slippers', 'Flip Flop Slippers', 'Memory Foam Slippers'],
  Loafers:  ['Penny Loafers', 'Tassel Loafers', 'Driving Loafers', 'Boat Shoes', 'Moccasins', 'Horsebit Loafers'],
};

// ========================================
// API Helper
// ========================================
async function api(endpoint, options = {}) {
  const headers = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (!(options.body instanceof FormData)) headers['Content-Type'] = 'application/json';

  const res = await fetch(`${API_BASE}${endpoint}`, { ...options, headers: { ...headers, ...options.headers } });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Something went wrong');
  return data;
}

// ========================================
// Auth
// ========================================
window.switchAuthTab = function (tab) {
  document.getElementById('login-tab').classList.toggle('active', tab === 'login');
  document.getElementById('register-tab').classList.toggle('active', tab === 'register');
  document.getElementById('login-form').classList.toggle('active', tab === 'login');
  document.getElementById('register-form').classList.toggle('active', tab === 'register');
  document.getElementById('auth-error').classList.add('hidden');
};

window.handleLogin = async function (e) {
  e.preventDefault();
  const btn = document.getElementById('login-btn');
  btn.classList.add('loading');
  try {
    const data = await api('/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: document.getElementById('login-email').value.trim(),
        password: document.getElementById('login-password').value,
      }),
    });
    token = data.token;
    currentUser = data;
    localStorage.setItem('fw_token', token);
    showDashboard();
  } catch (err) {
    showAuthError(err.message);
  } finally {
    btn.classList.remove('loading');
  }
};

window.handleRegister = async function (e) {
  e.preventDefault();
  const btn = document.getElementById('register-btn');
  btn.classList.add('loading');
  try {
    const data = await api('/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        name: document.getElementById('register-name').value.trim(),
        email: document.getElementById('register-email').value.trim(),
        password: document.getElementById('register-password').value,
      }),
    });
    token = data.token;
    currentUser = data;
    localStorage.setItem('fw_token', token);
    showDashboard();
  } catch (err) {
    showAuthError(err.message);
  } finally {
    btn.classList.remove('loading');
  }
};

window.handleLogout = function () {
  token = null; currentUser = null;
  localStorage.removeItem('fw_token');
  showAuthPage();
};

function showAuthError(msg) {
  const el = document.getElementById('auth-error');
  el.textContent = msg;
  el.classList.remove('hidden');
}

// ========================================
// Pages
// ========================================
function showAuthPage() {
  document.getElementById('auth-page').classList.add('active');
  document.getElementById('dashboard-page').classList.remove('active');
  document.getElementById('login-form').reset();
  document.getElementById('register-form').reset();
}

async function showDashboard() {
  document.getElementById('auth-page').classList.remove('active');
  document.getElementById('dashboard-page').classList.add('active');
  if (!currentUser?.name) {
    try { currentUser = await api('/auth/me'); }
    catch { handleLogout(); return; }
  }
  
  const greetingText = currentUser.isAdmin 
    ? `Hi, ${currentUser.name} <span class="admin-badge">Admin</span>` 
    : `Hi, ${currentUser.name}`;
    
  document.getElementById('user-greeting').innerHTML = greetingText;
  loadEntries();
}

// ========================================
// Entries
// ========================================
async function loadEntries() {
  try {
    const entries = await api('/footwear');
    const grid = document.getElementById('entries-grid');
    const emptyState = document.getElementById('empty-state');
    const entryCount = document.getElementById('entry-count');

    if (!entries.length) {
      grid.classList.add('hidden');
      emptyState.classList.remove('hidden');
      entryCount.textContent = 'No entries yet';
      return;
    }

    grid.classList.remove('hidden');
    emptyState.classList.add('hidden');
    entryCount.textContent = `${entries.length} entr${entries.length === 1 ? 'y' : 'ies'}`;

    grid.innerHTML = entries.map((entry, i) => `
      <div class="entry-card" style="animation-delay:${i * 0.05}s">
        <div class="entry-card-image">
          ${entry.images?.length
            ? `<img src="${entry.images[0]}" alt="${entry.brand} ${entry.modelNumber}" loading="lazy" />`
            : `<div class="no-image">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#4b5563" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                  <circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
                </svg>
                No image
              </div>`}
        </div>
        <div class="entry-card-body">
          <div class="entry-card-top">
            <span class="entry-brand">${entry.brand}</span>
            <span class="entry-price">₹${Number(entry.price).toLocaleString('en-IN')}</span>
          </div>
          <div class="entry-model">${entry.modelNumber}</div>
          <div class="entry-tags">
            <span class="entry-tag category">${entry.category}</span>
            <span class="entry-tag">${entry.subCategory}</span>
            <span class="entry-tag gender">${entry.gender}</span>
            ${entry.color ? `<span class="entry-tag">${entry.color}</span>` : ''}
            ${entry.size ? `<span class="entry-tag">Size: ${entry.size}</span>` : ''}
          </div>
          ${entry.material ? `<div class="entry-meta">Material: ${entry.material}</div>` : ''}
          ${entry.description ? `<div class="entry-meta entry-desc">${entry.description}</div>` : ''}
          ${currentUser.isAdmin && entry.addedBy ? `<div class="entry-meta author-meta">Added by: ${entry.addedBy.name}</div>` : ''}
          <div class="entry-card-footer">
            <span class="entry-date">${new Date(entry.createdAt).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' })}</span>
            <button class="entry-delete-btn" onclick="deleteEntry('${entry._id}')" title="Delete">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="3 6 5 6 21 6"/>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
              </svg>
            </button>
          </div>
        </div>
      </div>
    `).join('');
  } catch (err) {
    console.error('Error loading entries:', err);
  }
}

window.deleteEntry = async function (id) {
  if (!confirm('Delete this entry?')) return;
  try {
    await api(`/footwear/${id}`, { method: 'DELETE' });
    showToast('Entry deleted', 'success');
    loadEntries();
  } catch (err) {
    showToast(err.message, 'error');
  }
};

// ========================================
// Smart Dropdown Builder
// ========================================
// Builds <select> with 3 groups:
//   1. Built-in defaults (if any)
//   2. "Previously Added" custom values from DB
//   3. A separator option at top if both exist
async function buildSmartSelect(field, selectId, customValues) {
  const el = document.getElementById(selectId);
  const placeholder = el.options[0]; // preserve placeholder

  // Collect custom values for this field
  let customs = customValues || [];

  el.innerHTML = '';
  el.appendChild(placeholder);

  const builtIns = BUILT_IN[field] || [];

  if (builtIns.length) {
    const grp = document.createElement('optgroup');
    grp.label = 'Standard Options';
    builtIns.forEach(v => {
      const opt = document.createElement('option');
      opt.value = v; opt.textContent = v;
      grp.appendChild(opt);
    });
    el.appendChild(grp);
  }

  if (customs.length) {
    const grp = document.createElement('optgroup');
    grp.label = '⭐ Previously Added';
    customs.forEach(v => {
      const opt = document.createElement('option');
      opt.value = v; opt.textContent = v;
      grp.appendChild(opt);
    });
    el.appendChild(grp);
  }
}

// For brands, fetch from DB
async function buildBrandSelect(customValues) {
  const el = document.getElementById('fw-brand');
  el.innerHTML = '<option value="">Select Brand</option>';

  try {
    const brands = await api('/brands');
    const standard = brands.filter(b => !b.isCustom);
    const custom = brands.filter(b => b.isCustom);

    if (standard.length) {
      const grp = document.createElement('optgroup');
      grp.label = 'Standard Brands';
      standard.forEach(b => {
        const opt = document.createElement('option');
        opt.value = b.name; opt.textContent = b.name;
        grp.appendChild(opt);
      });
      el.appendChild(grp);
    }
    if (custom.length) {
      const grp = document.createElement('optgroup');
      grp.label = '⭐ Previously Added';
      custom.forEach(b => {
        const opt = document.createElement('option');
        opt.value = b.name; opt.textContent = b.name;
        grp.appendChild(opt);
      });
      el.appendChild(grp);
    }
  } catch (err) {
    console.error('Error loading brands:', err);
  }
}

// ========================================
// Custom Option Input (generic)
// ========================================
window.toggleCustomInput = function (field) {
  const box = document.getElementById(`custom-input-${field}`);
  const isHidden = box.classList.contains('hidden');
  box.classList.toggle('hidden', !isHidden);
  if (isHidden) {
    document.getElementById(`custom-val-${field}`).focus();
  }
};

window.cancelCustomInput = function (field) {
  document.getElementById(`custom-input-${field}`).classList.add('hidden');
  document.getElementById(`custom-val-${field}`).value = '';
};

window.saveCustomOption = async function (field) {
  const input = document.getElementById(`custom-val-${field}`);
  const value = input.value.trim();
  if (!value) { showToast('Please enter a value', 'error'); return; }

  try {
    if (field === 'brand') {
      await api('/brands', { method: 'POST', body: JSON.stringify({ name: value }) });
      showToast(`Brand "${value}" saved!`, 'success');
      cancelCustomInput('brand');
      await buildBrandSelect();
      document.getElementById('fw-brand').value = value;
    } else {
      await api(`/options/${field}`, { method: 'POST', body: JSON.stringify({ value }) });
      showToast(`"${value}" saved to ${field}!`, 'success');
      cancelCustomInput(field);
      // Reload all options for this field from backend
      const customs = await api(`/options/${field}`);
      await buildSmartSelect(field, `fw-${field}`, customs);
      document.getElementById(`fw-${field}`).value = value;
    }
  } catch (err) {
    showToast(err.message, 'error');
  }
};

// Enter key in custom input triggers save
document.addEventListener('keydown', function (e) {
  if (e.key === 'Enter' && e.target.id?.startsWith('custom-val-')) {
    e.preventDefault();
    const field = e.target.id.replace('custom-val-', '');
    saveCustomOption(field);
  }
});

// ========================================
// Sub-Categories
// ========================================
window.updateSubCategories = function () {
  const category = document.getElementById('fw-category').value;
  const sub = document.getElementById('fw-subCategory');
  sub.innerHTML = '<option value="">Select Sub-Category</option>';
  if (category && subCategories[category]) {
    subCategories[category].forEach(s => {
      const opt = document.createElement('option');
      opt.value = s; opt.textContent = s;
      sub.appendChild(opt);
    });
  }
};

// ========================================
// Form Modal
// ========================================
window.openFormModal = async function () {
  document.getElementById('form-modal').classList.remove('hidden');
  document.getElementById('footwear-form').reset();
  document.getElementById('image-previews').innerHTML = '';
  document.getElementById('form-error').classList.add('hidden');
  document.getElementById('fw-subCategory').innerHTML = '<option value="">Select category first</option>';
  selectedFiles = [];

  // Reset all custom input boxes
  ['brand', 'color', 'size', 'material'].forEach(f => {
    document.getElementById(`custom-input-${f}`)?.classList.add('hidden');
    const inp = document.getElementById(`custom-val-${f}`);
    if (inp) inp.value = '';
  });

  // Load brand dropdown
  await buildBrandSelect();

  // Load color, size, material from DB + built-ins
  const [colors, sizes, materials] = await Promise.all([
    api('/options/color').catch(() => []),
    api('/options/size').catch(() => []),
    api('/options/material').catch(() => []),
  ]);

  await buildSmartSelect('color', 'fw-color', colors);
  await buildSmartSelect('size', 'fw-size', sizes);
  await buildSmartSelect('material', 'fw-material', materials);
};

window.closeFormModal = function () {
  document.getElementById('form-modal').classList.add('hidden');
};

window.handleOverlayClick = function (e) {
  if (e.target.id === 'form-modal') closeFormModal();
};

document.addEventListener('keydown', function (e) {
  if (e.key === 'Escape') closeFormModal();
});

// ========================================
// Image Preview
// ========================================
window.handleImagePreview = function (e) {
  const files = Array.from(e.target.files);
  const container = document.getElementById('image-previews');
  const active = selectedFiles.filter(Boolean);

  if (active.length + files.length > 5) {
    showToast('Maximum 5 images allowed', 'error');
    return;
  }

  files.forEach(file => {
    const idx = selectedFiles.length;
    selectedFiles.push(file);
    const reader = new FileReader();
    reader.onload = ev => {
      const div = document.createElement('div');
      div.className = 'image-preview';
      div.id = `img-preview-${idx}`;
      div.innerHTML = `
        <img src="${ev.target.result}" alt="Preview" />
        <button class="remove-image" onclick="removeImage(${idx})" type="button">✕</button>
      `;
      container.appendChild(div);
    };
    reader.readAsDataURL(file);
  });
  // Reset input so same file can be re-selected if removed
  e.target.value = '';
};

window.removeImage = function (idx) {
  selectedFiles[idx] = null;
  document.getElementById(`img-preview-${idx}`)?.remove();
};

// ========================================
// Submit Form
// ========================================
window.handleFootwearSubmit = async function (e) {
  e.preventDefault();
  const btn = document.getElementById('submit-entry-btn');
  const errorEl = document.getElementById('form-error');
  errorEl.classList.add('hidden');
  btn.classList.add('loading');

  try {
    const formData = new FormData();
    formData.append('modelNumber', document.getElementById('fw-modelNumber').value.trim());
    formData.append('brand', document.getElementById('fw-brand').value);
    formData.append('category', document.getElementById('fw-category').value);
    formData.append('subCategory', document.getElementById('fw-subCategory').value);
    formData.append('gender', document.getElementById('fw-gender').value);
    formData.append('color', document.getElementById('fw-color').value);
    formData.append('price', document.getElementById('fw-price').value);
    formData.append('size', document.getElementById('fw-size').value);
    formData.append('material', document.getElementById('fw-material').value);
    formData.append('description', document.getElementById('fw-description').value.trim());

    selectedFiles.forEach(f => { if (f) formData.append('images', f); });

    await api('/footwear', { method: 'POST', body: formData });
    showToast('✅ Footwear entry saved!', 'success');
    closeFormModal();
    loadEntries();
  } catch (err) {
    errorEl.textContent = err.message;
    errorEl.classList.remove('hidden');
  } finally {
    btn.classList.remove('loading');
  }
};

// ========================================
// Toast
// ========================================
function showToast(message, type = 'success') {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.className = `toast ${type}`;
  toast.classList.remove('hidden');
  clearTimeout(window._toastTimer);
  window._toastTimer = setTimeout(() => toast.classList.add('hidden'), 3000);
}

// ========================================
// Init
// ========================================
async function init() {
  if (token) {
    try {
      currentUser = await api('/auth/me');
      showDashboard();
    } catch {
      localStorage.removeItem('fw_token');
      token = null;
      showAuthPage();
    }
  } else {
    showAuthPage();
  }
}

init();
