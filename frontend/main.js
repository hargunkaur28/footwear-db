// ========================================
// FootwearDB — Main Application Logic
// ========================================

const API_BASE = '/api';
let token = localStorage.getItem('fw_token');
let currentUser = null;
let selectedFiles = [];
let loadedEntries = [];

let selectedColors = [];
let selectedSizes = [];
let editingEntryId = null;

// ========================================
// Built-in defaults for smart dropdowns
// ========================================
const BUILT_IN = {
  category: ['Shoes', 'Sandals', 'Boots', 'Slippers', 'Loafers'],
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
  
  // Show/Hide admin filter group
  const adminFilterGroup = document.getElementById('admin-filter-group');
  if (adminFilterGroup) {
    adminFilterGroup.classList.toggle('hidden', !currentUser.isAdmin);
  }

  initFilters();
  loadEntries();
}

// ========================================
// Filters
// ========================================
async function initFilters() {
  console.log('Initializing filters for user:', currentUser);
  
  // Brands
  api('/brands').then(brands => {
    const brandFilter = document.getElementById('filter-brand');
    if (!brandFilter) return;
    brandFilter.innerHTML = '<option value="">All Brands</option>';
    brands.forEach(b => {
      const opt = document.createElement('option');
      opt.value = b.name; opt.textContent = b.name;
      brandFilter.appendChild(opt);
    });
  }).catch(err => console.error('Error loading brand filters:', err));

  // Categories
  api('/options/category').then(categories => {
    const catFilter = document.getElementById('filter-category');
    if (!catFilter) return;
    catFilter.innerHTML = '<option value="">All Categories</option>';
    const standardCats = ['Shoes', 'Sandals', 'Boots', 'Slippers', 'Loafers'];
    const allCats = [...new Set([...standardCats, ...categories])];
    allCats.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c; opt.textContent = c;
      catFilter.appendChild(opt);
    });
  }).catch(err => console.error('Error loading category filters:', err));

  // Users (Admin only)
  if (currentUser?.isAdmin) {
    console.log('User is admin, fetching users list...');
    api('/auth/users').then(users => {
      console.log('Users found:', users);
      const userFilter = document.getElementById('filter-user');
      if (!userFilter) return;
      userFilter.innerHTML = '<option value="">All Users</option>';
      users.forEach(u => {
        const opt = document.createElement('option');
        opt.value = u._id; opt.textContent = u.name;
        userFilter.appendChild(opt);
      });
    }).catch(err => console.error('Error loading user filters:', err));
  }
}

window.applyFilters = function() {
  const filters = {
    brand: document.getElementById('filter-brand').value,
    category: document.getElementById('filter-category').value,
  };
  
  if (currentUser.isAdmin) {
    filters.addedBy = document.getElementById('filter-user').value;
  }
  
  loadEntries(filters);
};

window.resetFilters = function() {
  document.getElementById('filter-brand').value = '';
  document.getElementById('filter-category').value = '';
  if (document.getElementById('filter-user')) {
    document.getElementById('filter-user').value = '';
  }
  loadEntries();
};

// ========================================
// Entries
// ========================================
async function loadEntries(filters = {}) {
  try {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(filters)) {
      if (v) params.append(k, v);
    }
    const query = params.toString() ? `?${params.toString()}` : '';
    const entries = await api(`/footwear${query}`);
    const grid = document.getElementById('entries-grid');
    const emptyState = document.getElementById('empty-state');
    const entryCount = document.getElementById('entry-count');

    if (entries.length === 0) {
      grid.classList.add('hidden');
      emptyState.classList.remove('hidden');
      entryCount.textContent = 'No entries yet';
      return;
    }

    grid.classList.remove('hidden');
    emptyState.classList.add('hidden');
    entryCount.textContent = `${entries.length} entr${entries.length === 1 ? 'y' : 'ies'}`;

    loadedEntries = entries;

    grid.innerHTML = entries.map((entry, i) => `
      <div class="entry-card" style="animation-delay:${i * 0.05}s">
        <div class="entry-card-image" ${entry.images?.length ? `onclick="openGallery('${entry._id}')"` : ''}>
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
            ${entry.color && entry.color.length ? `<span class="entry-tag">Colors: ${entry.color.join(', ')}</span>` : ''}
            ${entry.size && entry.size.length ? `<span class="entry-tag">Sizes: ${entry.size.join(', ')}</span>` : ''}
          </div>
          ${entry.material ? `<div class="entry-meta">Material: ${entry.material}</div>` : ''}
          ${entry.description ? `<div class="entry-meta entry-desc">${entry.description}</div>` : ''}
          ${currentUser.isAdmin && entry.addedBy ? `<div class="entry-meta author-meta">Added by: ${entry.addedBy.name}</div>` : ''}
        </div>
        <div class="entry-date">${new Date(entry.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
        <div class="entry-card-footer">
            <div class="entry-actions">
              <button class="entry-edit-btn" onclick="editEntry('${entry._id}')" title="Edit">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path>
                </svg>
              </button>
              <button class="entry-delete-btn" onclick="deleteEntry('${entry._id}')" title="Delete">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="3 6 5 6 21 6"/>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                </svg>
              </button>
            </div>
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
// Image Gallery
// ========================================
let currentGalleryImages = [];
let currentGalleryIndex = 0;

window.openGallery = function(entryId) {
  const entry = loadedEntries.find(e => e._id === entryId);
  if (!entry || !entry.images || entry.images.length === 0) return;
  
  currentGalleryImages = entry.images;
  currentGalleryIndex = 0;
  
  document.getElementById('gallery-modal').classList.remove('hidden');
  updateGalleryView();
};

window.closeGalleryModal = function() {
  document.getElementById('gallery-modal').classList.add('hidden');
  currentGalleryImages = [];
};

window.handleGalleryOverlayClick = function(e) {
  if (e.target.id === 'gallery-modal') closeGalleryModal();
};

function updateGalleryView() {
  const img = document.getElementById('gallery-current-image');
  img.src = currentGalleryImages[currentGalleryIndex];
  
  document.getElementById('gallery-counter').textContent = `${currentGalleryIndex + 1} / ${currentGalleryImages.length}`;
  
  document.getElementById('gallery-prev-btn').disabled = currentGalleryImages.length <= 1;
  document.getElementById('gallery-next-btn').disabled = currentGalleryImages.length <= 1;
  
  document.getElementById('gallery-prev-btn').style.opacity = currentGalleryImages.length <= 1 ? '0.3' : '1';
  document.getElementById('gallery-next-btn').style.opacity = currentGalleryImages.length <= 1 ? '0.3' : '1';
}

window.prevGalleryImage = function() {
  if (currentGalleryImages.length <= 1) return;
  currentGalleryIndex = (currentGalleryIndex - 1 + currentGalleryImages.length) % currentGalleryImages.length;
  updateGalleryView();
};

window.nextGalleryImage = function() {
  if (currentGalleryImages.length <= 1) return;
  currentGalleryIndex = (currentGalleryIndex + 1) % currentGalleryImages.length;
  updateGalleryView();
};

window.downloadGalleryImage = async function() {
  const url = currentGalleryImages[currentGalleryIndex];
  if (!url) return;
  
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    const blobUrl = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = blobUrl;
    
    // Extract filename from URL or use a default
    const filename = url.substring(url.lastIndexOf('/') + 1) || 'image.jpg';
    a.download = filename;
    
    document.body.appendChild(a);
    a.click();
    
    window.URL.revokeObjectURL(blobUrl);
    document.body.removeChild(a);
  } catch (err) {
    showToast('Error downloading image', 'error');
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
  if (!el) return;
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
      
      if (field === 'size') {
        if (!selectedSizes.includes(value)) {
          selectedSizes.push(value);
        }
        renderSizeGrid();
      } else {
        const customs = await api(`/options/${field}`);
        await buildSmartSelect(field, `fw-${field}`, customs);
        document.getElementById(`fw-${field}`).value = value;
      }
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
// Tag UI Logic
// ========================================
function renderTags(field, arr) {
  const container = document.getElementById(`selected-${field}s`);
  if (!container) return;
  container.innerHTML = arr.map(val => `
    <div class="selected-tag">
      ${val}
      <button type="button" onclick="remove${field === 'color' ? 'Color' : 'Size'}('${val}')">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
    </div>
  `).join('');
}

window.addColorFromSelect = function() {
  const select = document.getElementById('fw-color');
  const val = select.value;
  if (val && !selectedColors.includes(val)) {
    selectedColors.push(val);
    renderTags('color', selectedColors);
  }
  select.value = '';
};

window.removeColor = function(val) {
  selectedColors = selectedColors.filter(c => c !== val);
  renderTags('color', selectedColors);
};

window.toggleSize = function(val) {
  if (selectedSizes.includes(val)) {
    selectedSizes = selectedSizes.filter(s => s !== val);
  } else {
    selectedSizes.push(val);
  }
  renderSizeGrid();
};

function renderSizeGrid() {
  const grid = document.getElementById('size-selector-grid');
  if (!grid) return;
  
  // Clear and rebuild
  const commonSizes = ['UK 6', 'UK 7', 'UK 8', 'UK 9', 'UK 10', 'UK 11', 'UK 12', 'EU 40', 'EU 41', 'EU 42', 'EU 43', 'EU 44', 'EU 45'];
  
  // Add any selected custom sizes that aren't in commonSizes
  const allToDisplay = [...new Set([...commonSizes, ...selectedSizes])].sort((a,b) => {
    // Basic sorting: UK first, then numbers
    return a.localeCompare(b, undefined, {numeric: true, sensitivity: 'base'});
  });

  grid.innerHTML = allToDisplay.map(size => `
    <div class="size-chip ${selectedSizes.includes(size) ? 'active' : ''}" onclick="toggleSize('${size}')">
      ${size}
    </div>
  `).join('');
}

window.removeSize = function(val) {
  selectedSizes = selectedSizes.filter(s => s !== val);
  renderSizeGrid();
};

// ========================================
// Form Modal
// ========================================
window.openFormModal = async function () {
  editingEntryId = null;
  document.getElementById('form-modal').classList.remove('hidden');
  document.getElementById('footwear-form').reset();
  document.getElementById('image-previews').innerHTML = '';
  document.getElementById('form-error').classList.add('hidden');
  document.querySelector('#form-modal h2').textContent = 'Add Footwear Entry';
  
  selectedFiles = [];
  selectedColors = [];
  selectedSizes = [];
  renderTags('color', selectedColors);
  renderSizeGrid();

  // Reset all custom input boxes
  ['brand', 'category', 'color', 'size', 'material', 'subCategory'].forEach(f => {
    document.getElementById(`custom-input-${f}`)?.classList.add('hidden');
    const inp = document.getElementById(`custom-val-${f}`);
    if (inp) inp.value = '';
  });

  // Load dropdowns from DB
  await Promise.all([
    buildBrandSelect(),
    api('/options/category').then(c => buildSmartSelect('category', 'fw-category', c)).catch(()=>{}),
    api('/options/color').then(c => buildSmartSelect('color', 'fw-color', c)).catch(()=>{}),
    api('/options/material').then(m => buildSmartSelect('material', 'fw-material', m)).catch(()=>{}),
    api('/options/subCategory').then(s => buildSmartSelect('subCategory', 'fw-subCategory', s)).catch(()=>{}),
  ]);
};

window.editEntry = async function(id) {
  const entry = loadedEntries.find(e => e._id === id);
  if (!entry) return;
  
  await openFormModal();
  editingEntryId = id;
  document.querySelector('#form-modal h2').textContent = 'Edit Footwear Entry';
  
  document.getElementById('fw-modelNumber').value = entry.modelNumber || '';
  document.getElementById('fw-brand').value = entry.brand || '';
  document.getElementById('fw-category').value = entry.category || '';
  document.getElementById('fw-subCategory').value = entry.subCategory || '';
  document.getElementById('fw-gender').value = entry.gender || '';
  document.getElementById('fw-price').value = entry.price || '';
  document.getElementById('fw-material').value = entry.material || '';
  document.getElementById('fw-description').value = entry.description || '';
  
  selectedColors = entry.color || [];
  selectedSizes = entry.size || [];
  renderTags('color', selectedColors);
  renderSizeGrid();
  
  // Show existing images in preview
  const container = document.getElementById('image-previews');
  if (entry.images && entry.images.length > 0) {
    entry.images.forEach((imgUrl, idx) => {
      // In edit mode, we'll replace all if they upload new ones, but let's just visually show them for now
      // A complete image management logic for editing is complex. We'll add a note that uploading new images replaces old ones.
      const div = document.createElement('div');
      div.className = 'image-preview';
      div.innerHTML = `<img src="${imgUrl}" alt="Existing" />`;
      container.appendChild(div);
    });
  }
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

  if (selectedSizes.length === 0) {
    errorEl.textContent = 'Please select at least one size.';
    errorEl.classList.remove('hidden');
    return;
  }

  btn.classList.add('loading');
  try {
    const formData = new FormData();
    formData.append('modelNumber', document.getElementById('fw-modelNumber').value.trim());
    formData.append('brand', document.getElementById('fw-brand').value);
    formData.append('category', document.getElementById('fw-category').value);
    formData.append('subCategory', document.getElementById('fw-subCategory').value);
    formData.append('gender', document.getElementById('fw-gender').value);
    formData.append('color', JSON.stringify(selectedColors));
    formData.append('price', document.getElementById('fw-price').value);
    formData.append('size', JSON.stringify(selectedSizes));
    formData.append('material', document.getElementById('fw-material').value);
    formData.append('description', document.getElementById('fw-description').value.trim());

    if (editingEntryId && selectedFiles.filter(Boolean).length > 0) {
      formData.append('replaceImages', 'true');
    }
    selectedFiles.forEach(f => { if (f) formData.append('images', f); });

    if (editingEntryId) {
      await api(`/footwear/${editingEntryId}`, { method: 'PUT', body: formData });
      showToast('✅ Footwear entry updated!', 'success');
    } else {
      await api('/footwear', { method: 'POST', body: formData });
      showToast('✅ Footwear entry saved!', 'success');
    }
    
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
