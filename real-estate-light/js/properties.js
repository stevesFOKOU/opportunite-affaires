/* ========================================
   GESTION DES BIENS IMMOBILIERS
   ======================================== */

// État des filtres
let currentFilters = {
  q: '',
  type: '',
  priceMin: '',
  priceMax: '',
  surfaceMin: '',
  city: '',
  sort: 'newest'
};

let currentPage = 1;
const itemsPerPage = 12;
let allProperties = [];

// Charger les biens depuis l'API
async function loadProperties(filters = {}) {
  try {
    const params = new URLSearchParams();
    Object.keys(filters).forEach(key => {
      if (filters[key]) params.append(key, filters[key]);
    });

    const data = await apiRequest(`/properties?${params.toString()}`);
    return data.properties || data || [];
  } catch (error) {
    console.error('Erreur chargement biens:', error);
    showNotification('Erreur lors du chargement des annonces', 'error');
    return [];
  }
}

// Charger un bien par ID
async function loadProperty(id) {
  try {
    const data = await apiRequest(`/properties/${id}`);
    return data.property || data;
  } catch (error) {
    console.error('Erreur chargement bien:', error);
    throw error;
  }
}

// Charger mes biens
async function loadMyProperties() {
  try {
    const data = await apiRequest('/properties/mine');
    return data.properties || data || [];
  } catch (error) {
    console.error('Erreur chargement mes biens:', error);
    return [];
  }
}

// Créer une carte de bien
function createPropertyCard(property) {
  const imageUrl = property.photos?.[0]?.url 
    ? getImageUrl(property.photos[0].url) 
    : 'assets/images/placeholder.jpg';

  const isFavorite = App.favorites.includes(property.id);

  return `
    <article class="card">
      <div class="card-image">
        <img src="${imageUrl}" alt="${property.title}" loading="lazy">
        <span class="card-badge">${translatePropertyType(property.type)}</span>
        <button class="card-favorite ${isFavorite ? 'active' : ''}" 
                onclick="toggleFavorite(${property.id}, event)" 
                title="${isFavorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}">
          ${isFavorite ? '<svg width="18" height="18" viewBox="0 0 24 24" fill="var(--error)" stroke="var(--error)" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>' : '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>'}
        </button>
      </div>
      <div class="card-body">
        <h3 class="card-title">${property.title}</h3>
        <div class="card-location">
          <span></span>
          <span>${property.city || ''}${property.city && property.region ? ', ' : ''}${property.region || ''}</span>
        </div>
        <div class="card-features">
          ${property.surfaceM2 ? `<span class="card-feature">${property.surfaceM2} m²</span>` : ''}
          <span class="card-feature">${translateStatus(property.status)}</span>
        </div>
        <div class="card-footer">
          <div class="card-price">${formatPrice(property.price, property.currency)}</div>
          <a href="property-detail.html?id=${property.id}" class="btn btn-sm btn-primary">Voir</a>
        </div>
      </div>
    </article>
  `;
}

// Afficher la grille de biens
function renderPropertiesGrid(properties, containerId = 'properties-grid') {
  const container = document.getElementById(containerId);
  if (!container) return;

  if (properties.length === 0) {
    showEmptyState(
      container,
      '<svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="var(--gray)" stroke-width="1.5"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>',
      'Aucune annonce trouvée',
      'Essayez de modifier vos critères de recherche.',
      'Voir toutes les annonces',
      'properties.html'
    );
    return;
  }

  container.innerHTML = properties.map(p => createPropertyCard(p)).join('');
}

// Pagination
function renderPagination(totalItems, containerId = 'pagination') {
  const container = document.getElementById(containerId);
  if (!container) return;

  const totalPages = Math.ceil(totalItems / itemsPerPage);
  if (totalPages <= 1) {
    container.innerHTML = '';
    return;
  }

  let html = '';
  
  // Bouton précédent
  html += `<button class="pagination-btn" ${currentPage === 1 ? 'disabled' : ''} onclick="goToPage(${currentPage - 1})">←</button>`;

  // Pages
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || (i >= currentPage - 1 && i <= currentPage + 1)) {
      html += `<button class="pagination-btn ${i === currentPage ? 'active' : ''}" onclick="goToPage(${i})">${i}</button>`;
    } else if (i === currentPage - 2 || i === currentPage + 2) {
      html += `<span style="padding: 0 5px;">...</span>`;
    }
  }

  // Bouton suivant
  html += `<button class="pagination-btn" ${currentPage === totalPages ? 'disabled' : ''} onclick="goToPage(${currentPage + 1})">→</button>`;

  container.innerHTML = html;
}

// Aller à une page
function goToPage(page) {
  currentPage = page;
  applyFiltersAndRender();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Appliquer les filtres et afficher
async function applyFiltersAndRender() {
  const container = document.getElementById('properties-grid');
  if (!container) return;

  showLoader(container);

  const properties = await loadProperties(currentFilters);
  allProperties = properties;

  // Tri
  if (currentFilters.sort === 'price-asc') {
    allProperties.sort((a, b) => a.price - b.price);
  } else if (currentFilters.sort === 'price-desc') {
    allProperties.sort((a, b) => b.price - a.price);
  }

  // Pagination
  const start = (currentPage - 1) * itemsPerPage;
  const paginatedProperties = allProperties.slice(start, start + itemsPerPage);

  renderPropertiesGrid(paginatedProperties);
  renderPagination(allProperties.length);

  // Mettre à jour le compteur
  const counter = document.getElementById('properties-count');
  if (counter) {
    counter.textContent = `${allProperties.length} annonce${allProperties.length > 1 ? 's' : ''} trouvée${allProperties.length > 1 ? 's' : ''}`;
  }
}

// Initialiser les filtres
function initFilters() {
  // Lire les paramètres URL
  const params = getUrlParams();
  currentFilters = { ...currentFilters, ...params };

  // Remplir les champs de filtre
  const searchInput = document.getElementById('filter-search');
  const typeSelect = document.getElementById('filter-type');
  const priceMinInput = document.getElementById('filter-price-min');
  const priceMaxInput = document.getElementById('filter-price-max');
  const surfaceMinInput = document.getElementById('filter-surface-min');
  const sortSelect = document.getElementById('filter-sort');

  if (searchInput) searchInput.value = currentFilters.q || '';
  if (typeSelect) typeSelect.value = currentFilters.type || '';
  if (priceMinInput) priceMinInput.value = currentFilters.priceMin || '';
  if (priceMaxInput) priceMaxInput.value = currentFilters.priceMax || '';
  if (surfaceMinInput) surfaceMinInput.value = currentFilters.surfaceMin || '';
  if (sortSelect) sortSelect.value = currentFilters.sort || 'newest';

  // Event listeners
  const debouncedApply = debounce(() => {
    currentPage = 1;
    applyFiltersAndRender();
  }, 300);

  searchInput?.addEventListener('input', (e) => {
    currentFilters.q = e.target.value;
    debouncedApply();
  });

  typeSelect?.addEventListener('change', (e) => {
    currentFilters.type = e.target.value;
    currentPage = 1;
    applyFiltersAndRender();
  });

  priceMinInput?.addEventListener('input', (e) => {
    currentFilters.priceMin = e.target.value;
    debouncedApply();
  });

  priceMaxInput?.addEventListener('input', (e) => {
    currentFilters.priceMax = e.target.value;
    debouncedApply();
  });

  surfaceMinInput?.addEventListener('input', (e) => {
    currentFilters.surfaceMin = e.target.value;
    debouncedApply();
  });

  sortSelect?.addEventListener('change', (e) => {
    currentFilters.sort = e.target.value;
    currentPage = 1;
    applyFiltersAndRender();
  });

  // Bouton reset
  document.getElementById('filter-reset')?.addEventListener('click', () => {
    currentFilters = { q: '', type: '', priceMin: '', priceMax: '', surfaceMin: '', city: '', sort: 'newest' };
    currentPage = 1;
    if (searchInput) searchInput.value = '';
    if (typeSelect) typeSelect.value = '';
    if (priceMinInput) priceMinInput.value = '';
    if (priceMaxInput) priceMaxInput.value = '';
    if (surfaceMinInput) surfaceMinInput.value = '';
    if (sortSelect) sortSelect.value = 'newest';
    applyFiltersAndRender();
  });
}

// Favoris
async function toggleFavorite(propertyId, event) {
  event?.preventDefault();
  event?.stopPropagation();

  if (!App.isLoggedIn()) {
    showNotification('Connectez-vous pour ajouter aux favoris', 'warning');
    return;
  }

  try {
    const isFavorite = App.favorites.includes(propertyId);
    
    if (isFavorite) {
      await apiRequest(`/favorites/${propertyId}`, { method: 'DELETE' });
      App.favorites = App.favorites.filter(id => id !== propertyId);
      showNotification('Retiré des favoris', 'success');
    } else {
      await apiRequest(`/favorites/${propertyId}`, { method: 'POST' });
      App.favorites.push(propertyId);
      showNotification('Ajouté aux favoris !', 'success');
    }

    // Mettre à jour l'UI
    const btn = event?.target?.closest('.card-favorite');
    if (btn) {
      btn.classList.toggle('active');
      btn.innerHTML = App.favorites.includes(propertyId) ? '❤️' : '🤍';
    }
  } catch (error) {
    showNotification(error.message, 'error');
  }
}

// Charger les favoris de l'utilisateur
async function loadFavorites() {
  if (!App.isLoggedIn()) return;

  try {
    const data = await apiRequest('/favorites');
    App.favorites = (data.favorites || data || []).map(f => f.propertyId || f.id);
  } catch (error) {
    console.error('Erreur chargement favoris:', error);
  }
}

// Partage WhatsApp
function shareOnWhatsApp(property) {
  const url = `${window.location.origin}/property-detail.html?id=${property.id}`;
  const text = `${property.title} - ${formatPrice(property.price, property.currency)} - ${url}`;
  window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
}

// Initialiser la page des biens
async function initPropertiesPage() {
  await loadFavorites();
  initFilters();
  applyFiltersAndRender();
}

// Initialiser au chargement
document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('properties-grid')) {
    initPropertiesPage();
  }
});
