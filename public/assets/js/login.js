const API_BASE = 'http://localhost:8000/api.php';

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

function getCookie(name) {
  const escapedName = name.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
  const match = document.cookie.match(new RegExp(`(?:^|; )${escapedName}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : '';
}

function deleteCookie(name) {
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=Lax`;
}

function getAuthToken() {
  return getCookie('authToken');
}

async function restoreSessionIfAny() {
  const token = getAuthToken();
  if (!token) return;

  try {
    await apiRequest('auth.session', { token });
    window.location.href = '/home';
  } catch {
    deleteCookie('authToken');
  }
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
    await apiRequest('auth.email.verify', {
      email: pendingEmail,
      code,
    });

    window.location.href = '/home';
  } catch (error) {
    setMessage(error.message, 'error');
  }
});

googleOauthButton.addEventListener('click', () => {
  window.location.href = `${API_BASE}?action=oauth.google.start`;
});

restoreSessionIfAny();
