const API_BASE = 'http://localhost:8000/api.php';

const signupForm = document.getElementById('signup-form');
const googleOauthButton = document.getElementById('google-oauth-button');
const message = document.getElementById('message');

let accountData = null;
let pendingEmail = '';

function setMessage(text, type = 'success') {
  message.textContent = text;
  message.className = `message ${type}`;
}

async function apiRequest(action, payload) {
  const response = await fetch(`${API_BASE}?action=${encodeURIComponent(action)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const data = await response.json();
  if (!response.ok || !data.ok) {
    throw new Error(data.error || 'Une erreur est survenue.');
  }

  return data;
}

function saveAuthToken(token) {
  localStorage.setItem(AUTH_TOKEN_KEY, token);
}

function getAuthToken() {
  return localStorage.getItem(AUTH_TOKEN_KEY) || '';
}

async function restoreSessionIfAny() {
  const token = getAuthToken();
  if (!token) return;

  try {
    const data = await apiRequest('auth.session', { token });
    accountData = { fullName: data.user.fullName || '', email: data.user.email };
    setMessage(`Session active: ${data.user.email}`, 'success');
  } catch {
    localStorage.removeItem(AUTH_TOKEN_KEY);
  }
}

function handleOauthTokenFromHash() {
  const hash = window.location.hash.replace(/^#/, '');
  const params = new URLSearchParams(hash);
  const authToken = params.get('authToken');
  if (!authToken) return;

  saveAuthToken(authToken);
  setMessage('Connexion Google réussie. Redirection vers la suite de l’inscription.', 'success');
  history.replaceState(null, '', window.location.pathname);
  window.location.href = 'home.html';
}

signupForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  if (!signupForm.checkValidity()) {
    signupForm.reportValidity();
    setMessage('Merci de renseigner tous les champs obligatoires.', 'error');
    return;
  }

  const fullName = signupForm.fullName.value.trim();
  const email = signupForm.email.value.trim();

  try {
    const data = await apiRequest('auth.email.start', { fullName, email });
    const params = new URLSearchParams({ email, fullName });
    if (data.debugCode) {
      params.set('debugCode', data.debugCode);
    }

  try {
    const data = await apiRequest('auth.email.verify', { email: pendingEmail, code });
    saveAuthToken(data.token);
    accountData = { fullName: data.user.fullName || '', email: data.user.email };
    verifyForm.reset();
    verifyForm.classList.add('hidden');
    setMessage('E-mail vérifié. Redirection vers la suite.', 'success');
    window.location.href = 'home.html';
  } catch (error) {
    setMessage(error.message, 'error');
  }
});

googleOauthButton.addEventListener('click', () => {
  window.location.href = `${API_BASE}?action=oauth.google.start`;
});

handleOauthTokenFromHash();
restoreSessionIfAny();
