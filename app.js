const API_BASE = '/public/api.php';

const signupForm = document.getElementById('signup-form');
const googleOauthButton = document.getElementById('google-oauth-button');
const message = document.getElementById('message');

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

    window.location.href = `/home.html?${params.toString()}`;
  } catch (error) {
    setMessage(error.message, 'error');
  }
});

googleOauthButton.addEventListener('click', () => {
  window.location.href = `${API_BASE}?action=oauth.google.start`;
});
