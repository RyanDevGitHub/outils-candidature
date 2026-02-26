const API_BASE = 'http://localhost:8000/api.php';
const AUTH_TOKEN_KEY = 'authToken';

const loginForm = document.getElementById('login-form');
const verifyForm = document.getElementById('verify-form');
const googleOauthButton = document.getElementById('google-oauth-button');
const message = document.getElementById('message');

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
    await apiRequest('auth.session', { token });
    window.location.href = 'home.html';
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
  setMessage('Connexion Google réussie. Redirection…', 'success');
  window.location.href = 'home.html';
}

loginForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  if (!loginForm.checkValidity()) {
    loginForm.reportValidity();
    setMessage('Merci de renseigner un e-mail valide.', 'error');
    return;
  }

  const email = loginForm.email.value.trim();

  try {
    const data = await apiRequest('auth.email.login.start', { email });
    pendingEmail = email;

    verifyForm.classList.remove('hidden');
    loginForm.classList.add('hidden');

    setMessage(
      data.debugCode
        ? `Code envoyé. (dev: ${data.debugCode})`
        : 'Code envoyé par e-mail. Vérifiez votre boîte de réception.',
      'success'
    );
  } catch (error) {
    setMessage(error.message, 'error');
  }
});

verifyForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  const code = verifyForm.verificationCode.value.trim();

  try {
    const data = await apiRequest('auth.email.verify', {
      email: pendingEmail,
      code,
    });

    saveAuthToken(data.token);
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
