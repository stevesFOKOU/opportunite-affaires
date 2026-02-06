/* ========================================
   AUTHENTIFICATION
   ======================================== */

// Connexion
async function login(email, password) {
  try {
    const data = await apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });

    App.saveUserToStorage(data.token, data.user);
    App.updateUI();
    showNotification('Connexion réussie !', 'success');
    
    // Rediriger vers la page précédente ou l'accueil
    const redirect = getUrlParams().redirect || 'index.html';
    setTimeout(() => {
      window.location.href = redirect;
    }, 1000);

    return data;
  } catch (error) {
    showNotification(error.message, 'error');
    throw error;
  }
}

// Inscription
async function register(userData) {
  try {
    const data = await apiRequest('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData)
    });

    showNotification('Inscription réussie ! Vous pouvez maintenant vous connecter.', 'success');
    return data;
  } catch (error) {
    showNotification(error.message, 'error');
    throw error;
  }
}

// Récupérer le profil
async function getProfile() {
  if (!App.isLoggedIn()) return null;
  
  try {
    const data = await apiRequest('/auth/me');
    return data;
  } catch (error) {
    console.error('Erreur profil:', error);
    return null;
  }
}

// Mettre à jour le profil
async function updateProfile(userData) {
  try {
    const data = await apiRequest('/auth/me', {
      method: 'PUT',
      body: JSON.stringify(userData)
    });

    // Mettre à jour le localStorage
    App.user = { ...App.user, ...userData };
    localStorage.setItem('user', JSON.stringify(App.user));
    App.updateUI();

    showNotification('Profil mis à jour !', 'success');
    return data;
  } catch (error) {
    showNotification(error.message, 'error');
    throw error;
  }
}

// Vérifier si l'utilisateur peut publier (agent ou vendeur validé)
function canPublish() {
  if (!App.user) return false;
  const role = App.user.role;
  if (role === 'admin_central') return true;
  if (role === 'agent_regional' && App.user.agentStatus === 'approved') return true;
  if (role === 'client_vendeur') return true;
  return false;
}

// Vérifier si l'utilisateur est admin
function isAdmin() {
  return App.user?.role === 'admin_central';
}

// Initialiser le formulaire de connexion
function initLoginForm() {
  const form = document.getElementById('login-form');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = form.querySelector('[name="email"]').value;
    const password = form.querySelector('[name="password"]').value;
    
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = 'Connexion...';

    try {
      await login(email, password);
    } catch (error) {
      // Erreur déjà affichée
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = originalText;
    }
  });
}

// Initialiser le formulaire d'inscription
function initRegisterForm() {
  const form = document.getElementById('register-form');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const formData = new FormData(form);
    const roleToAccountType = {
      'client_acheteur': 'buyer',
      'client_vendeur': 'seller',
      'agent_regional': 'agent'
    };
    const role = formData.get('role') || 'client_acheteur';
    const userData = {
      email: formData.get('email'),
      password: formData.get('password'),
      confirmPassword: formData.get('confirmPassword'),
      name: formData.get('name'),
      phone: formData.get('phone'),
      accountType: roleToAccountType[role] || 'buyer'
    };

    // Validation
    if (userData.password !== formData.get('confirmPassword')) {
      showNotification('Les mots de passe ne correspondent pas', 'error');
      return;
    }

    const submitBtn = form.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = 'Inscription...';

    try {
      await register(userData);
      // Basculer vers le formulaire de connexion
      document.getElementById('register-tab')?.classList.remove('active');
      document.getElementById('login-tab')?.classList.add('active');
      document.getElementById('register-panel')?.classList.add('hidden');
      document.getElementById('login-panel')?.classList.remove('hidden');
    } catch (error) {
      // Erreur déjà affichée
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = originalText;
    }
  });
}

// Initialiser les onglets connexion/inscription
function initAuthTabs() {
  const loginTab = document.getElementById('login-tab');
  const registerTab = document.getElementById('register-tab');
  const loginPanel = document.getElementById('login-panel');
  const registerPanel = document.getElementById('register-panel');

  if (!loginTab || !registerTab) return;

  loginTab.addEventListener('click', () => {
    loginTab.classList.add('active');
    registerTab.classList.remove('active');
    loginPanel?.classList.remove('hidden');
    registerPanel?.classList.add('hidden');
  });

  registerTab.addEventListener('click', () => {
    registerTab.classList.add('active');
    loginTab.classList.remove('active');
    registerPanel?.classList.remove('hidden');
    loginPanel?.classList.add('hidden');
  });
}

// Initialiser l'authentification au chargement
document.addEventListener('DOMContentLoaded', () => {
  initLoginForm();
  initRegisterForm();
  initAuthTabs();
});
