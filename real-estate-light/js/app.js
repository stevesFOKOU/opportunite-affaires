/* ========================================
   OPPORTUNITÉ D'AFFAIRES - APP.JS
   Fonctions principales et configuration
   ======================================== */

// Configuration API - détection automatique de l'environnement
const isProduction = window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';
const API_BASE_URL = isProduction ? '/api' : 'http://localhost:3001/api';
const UPLOADS_BASE_URL = isProduction ? '' : 'http://localhost:3001';

// État global de l'application
const App = {
  user: null,
  token: null,
  favorites: [],

  // Initialisation
  init() {
    this.loadUserFromStorage();
    this.setupEventListeners();
    this.updateUI();
    console.log('App initialized');
  },

  // Charger l'utilisateur depuis localStorage
  loadUserFromStorage() {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    if (token && user) {
      this.token = token;
      this.user = JSON.parse(user);
    }
  },

  // Sauvegarder l'utilisateur
  saveUserToStorage(token, user) {
    this.token = token;
    this.user = user;
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
  },

  // Déconnexion
  logout() {
    this.token = null;
    this.user = null;
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    this.updateUI();
    window.location.href = 'index.html';
  },

  // Vérifier si connecté
  isLoggedIn() {
    return !!this.token;
  },

  // Mettre à jour l'interface selon l'état de connexion
  updateUI() {
    const authButtons = document.querySelectorAll('.auth-buttons');
    const userMenu = document.querySelectorAll('.user-menu');
    const userName = document.querySelectorAll('.user-name');

    authButtons.forEach(el => {
      el.style.display = this.isLoggedIn() ? 'none' : 'flex';
    });

    userMenu.forEach(el => {
      el.style.display = this.isLoggedIn() ? 'flex' : 'none';
    });

    userName.forEach(el => {
      if (this.user) {
        el.textContent = this.user.name || this.user.email;
      }
    });

    // Ajouter liens dynamiques selon le rôle
    const nav = document.querySelector('.nav');
    if (nav && this.isLoggedIn()) {
      // Supprimer les liens dynamiques existants
      nav.querySelectorAll('.nav-link-dynamic').forEach(el => el.remove());

      // Lien "Favoris" pour tous les utilisateurs connectés
      const favLink = document.createElement('a');
      favLink.href = 'favorites.html';
      favLink.className = 'nav-link nav-link-dynamic';
      favLink.textContent = 'Favoris';
      nav.appendChild(favLink);

      // Lien "Mes annonces" pour agents et vendeurs
      if (['agent_regional', 'client_vendeur', 'admin_central'].includes(this.user?.role)) {
        const myPropsLink = document.createElement('a');
        myPropsLink.href = 'my-properties.html';
        myPropsLink.className = 'nav-link nav-link-dynamic';
        myPropsLink.textContent = 'Mes annonces';
        nav.appendChild(myPropsLink);

        // Lien "Leads" avec badge
        const leadsLink = document.createElement('a');
        leadsLink.href = 'leads.html';
        leadsLink.className = 'nav-link nav-link-dynamic';
        leadsLink.innerHTML = 'Leads <span id="leads-badge" class="nav-badge" style="display: none;"></span>';
        nav.appendChild(leadsLink);
      }

      // Lien "Admin" pour les admins
      if (this.user?.role === 'admin_central') {
        const adminLink = document.createElement('a');
        adminLink.href = 'admin.html';
        adminLink.className = 'nav-link nav-link-dynamic';
        adminLink.innerHTML = 'Admin <span id="admin-badge" class="nav-badge" style="display: none;"></span>';
        nav.appendChild(adminLink);
      }

      // Séparateur et bouton déconnexion dans le menu mobile
      const separator = document.createElement('div');
      separator.className = 'nav-separator nav-link-dynamic';
      separator.style.cssText = 'height: 1px; background: var(--gray-200); margin: 8px 0;';
      nav.appendChild(separator);

      // Lien Profil
      const profileLink = document.createElement('a');
      profileLink.href = 'profile.html';
      profileLink.className = 'nav-link nav-link-dynamic';
      profileLink.textContent = '👤 Mon profil';
      nav.appendChild(profileLink);

      // Bouton déconnexion
      const logoutLink = document.createElement('a');
      logoutLink.href = '#';
      logoutLink.className = 'nav-link nav-link-dynamic logout-btn';
      logoutLink.style.color = 'var(--error)';
      logoutLink.textContent = '🚪 Déconnexion';
      logoutLink.addEventListener('click', (e) => {
        e.preventDefault();
        this.logout();
      });
      nav.appendChild(logoutLink);

      // Charger les notifications
      this.loadNotifications();
    } else if (nav) {
      // Utilisateur non connecté - ajouter lien connexion dans le menu
      nav.querySelectorAll('.nav-link-dynamic').forEach(el => el.remove());
      
      const separator = document.createElement('div');
      separator.className = 'nav-separator nav-link-dynamic';
      separator.style.cssText = 'height: 1px; background: var(--gray-200); margin: 8px 0;';
      nav.appendChild(separator);

      const loginLink = document.createElement('a');
      loginLink.href = 'login.html';
      loginLink.className = 'nav-link nav-link-dynamic';
      loginLink.style.cssText = 'background: var(--primary); color: white; text-align: center;';
      loginLink.textContent = '🔐 Se connecter';
      nav.appendChild(loginLink);
    }

    // Ajouter lien Profil dans le menu utilisateur
    const userMenus = document.querySelectorAll('.user-menu');
    userMenus.forEach(menu => {
      if (!menu.querySelector('.profile-link')) {
        const profileLink = document.createElement('a');
        profileLink.href = 'profile.html';
        profileLink.className = 'btn btn-ghost profile-link';
        profileLink.textContent = '👤';
        profileLink.title = 'Mon profil';
        menu.insertBefore(profileLink, menu.firstChild);
      }
    });
  },

  // Setup des event listeners globaux
  setupEventListeners() {
    // Menu mobile toggle
    const menuToggle = document.querySelector('.menu-toggle');
    const nav = document.querySelector('.nav');
    if (menuToggle && nav) {
      menuToggle.addEventListener('click', () => {
        nav.classList.toggle('active');
      });
    }

    // Fermer le menu mobile en cliquant ailleurs
    document.addEventListener('click', (e) => {
      if (nav && !nav.contains(e.target) && !menuToggle?.contains(e.target)) {
        nav.classList.remove('active');
      }
    });

    // Logout buttons
    document.querySelectorAll('.logout-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        this.logout();
      });
    });
  },

  // Charger les notifications
  async loadNotifications() {
    if (!this.isLoggedIn()) return;

    try {
      const data = await apiRequest('/notifications/counts');
      const counts = data.counts || {};

      // Badge leads
      const leadsBadge = document.getElementById('leads-badge');
      if (leadsBadge) {
        if (counts.newLeads > 0) {
          leadsBadge.textContent = counts.newLeads;
          leadsBadge.style.display = 'inline-flex';
        } else {
          leadsBadge.style.display = 'none';
        }
      }

      // Badge admin (propriétés + agents en attente)
      const adminBadge = document.getElementById('admin-badge');
      if (adminBadge) {
        const adminCount = (counts.pendingProperties || 0) + (counts.pendingAgents || 0);
        if (adminCount > 0) {
          adminBadge.textContent = adminCount;
          adminBadge.style.display = 'inline-flex';
        } else {
          adminBadge.style.display = 'none';
        }
      }

      // Stocker pour utilisation ailleurs
      this.notifications = counts;

    } catch (error) {
      console.error('Erreur chargement notifications:', error);
    }
  },

  notifications: {}
};

// ========================================
// UTILITAIRES
// ========================================

// Requête API avec token
async function apiRequest(endpoint, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers
  };

  if (App.token) {
    headers['Authorization'] = `Bearer ${App.token}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || `Erreur ${response.status}`);
  }

  return response.json();
}

// Requête API avec FormData (pour upload)
async function apiRequestFormData(endpoint, formData) {
  const headers = {};
  if (App.token) {
    headers['Authorization'] = `Bearer ${App.token}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method: 'POST',
    headers,
    body: formData
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || `Erreur ${response.status}`);
  }

  return response.json();
}

// Formater le prix
function formatPrice(price, currency = 'XAF') {
  if (!price) return '-';
  const formatted = new Intl.NumberFormat('fr-FR').format(price);
  return `${formatted} ${currency}`;
}

// Formater la date
function formatDate(dateString) {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
}

// Obtenir l'URL de l'image
function getImageUrl(path) {
  if (!path) return 'assets/images/placeholder.jpg';
  if (path.startsWith('http')) return path;
  return `${UPLOADS_BASE_URL}${path}`;
}

// Gérer les erreurs de chargement d'images
function handleImageError(img) {
  img.onerror = null; // Éviter boucle infinie
  img.src = 'assets/images/placeholder.jpg';
}

// Initialiser la gestion des erreurs d'images au chargement
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('img').forEach(img => {
    img.onerror = function() { handleImageError(this); };
  });

  // Observer pour les nouvelles images ajoutées dynamiquement
  const observer = new MutationObserver(mutations => {
    mutations.forEach(mutation => {
      mutation.addedNodes.forEach(node => {
        if (node.nodeName === 'IMG') {
          node.onerror = function() { handleImageError(this); };
        }
        if (node.querySelectorAll) {
          node.querySelectorAll('img').forEach(img => {
            img.onerror = function() { handleImageError(this); };
          });
        }
      });
    });
  });

  observer.observe(document.body, { childList: true, subtree: true });
});

// Afficher une notification
function showNotification(message, type = 'success') {
  const existing = document.querySelector('.notification');
  if (existing) existing.remove();

  const notification = document.createElement('div');
  notification.className = `notification notification-${type}`;
  notification.innerHTML = `
    <span>${message}</span>
    <button class="notification-close">&times;</button>
  `;

  notification.style.cssText = `
    position: fixed;
    top: 100px;
    right: 20px;
    padding: 15px 20px;
    background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#f59e0b'};
    color: white;
    border-radius: 8px;
    box-shadow: 0 4px 20px rgba(0,0,0,0.15);
    z-index: 3000;
    display: flex;
    align-items: center;
    gap: 15px;
    animation: slideIn 0.3s ease;
  `;

  document.body.appendChild(notification);

  notification.querySelector('.notification-close').addEventListener('click', () => {
    notification.remove();
  });

  setTimeout(() => notification.remove(), 5000);
}

// Afficher un loader
function showLoader(container) {
  container.innerHTML = `
    <div class="flex-center" style="padding: 60px;">
      <div class="spinner"></div>
    </div>
  `;
}

// Afficher un état vide
function showEmptyState(container, icon, title, text, buttonText, buttonHref) {
  container.innerHTML = `
    <div class="empty-state">
      <div class="empty-state-icon">${icon}</div>
      <div class="empty-state-title">${title}</div>
      <div class="empty-state-text">${text}</div>
      ${buttonText ? `<a href="${buttonHref}" class="btn btn-primary">${buttonText}</a>` : ''}
    </div>
  `;
}

// Debounce pour la recherche
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Obtenir les paramètres URL
function getUrlParams() {
  const params = new URLSearchParams(window.location.search);
  const result = {};
  for (const [key, value] of params) {
    result[key] = value;
  }
  return result;
}

// Mettre à jour l'URL sans recharger
function updateUrlParams(params) {
  const url = new URL(window.location);
  Object.keys(params).forEach(key => {
    if (params[key]) {
      url.searchParams.set(key, params[key]);
    } else {
      url.searchParams.delete(key);
    }
  });
  window.history.pushState({}, '', url);
}

// Traduire le type de bien
function translatePropertyType(type) {
  const types = {
    'apartment': 'Appartement',
    'house': 'Maison',
    'land': 'Terrain',
    'commercial': 'Commercial'
  };
  return types[type] || type;
}

// Traduire le statut
function translateStatus(status) {
  const statuses = {
    'draft': 'Brouillon',
    'pending': 'En attente',
    'published': 'Publié',
    'rejected': 'Refusé'
  };
  return statuses[status] || status;
}

// Initialiser l'app au chargement
document.addEventListener('DOMContentLoaded', () => {
  App.init();
});

// Ajouter les styles pour les notifications
const notificationStyles = document.createElement('style');
notificationStyles.textContent = `
  @keyframes slideIn {
    from {
      transform: translateX(100%);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }
  .notification-close {
    background: none;
    border: none;
    color: white;
    font-size: 1.5rem;
    cursor: pointer;
    line-height: 1;
  }
`;
document.head.appendChild(notificationStyles);
