const API_BASE = 'http://localhost:8000/api.php';
const AUTH_TOKEN_KEY = 'authToken';

const signupForm = document.getElementById('signup-form');
const verifyForm = document.getElementById('verify-form');
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
    window.location.href = 'home.html';
    setMessage(`Session active: ${data.user.email}`, 'success');
  } catch {
    localStorage.removeItem(AUTH_TOKEN_KEY);
  }
}

function handleOauthTokenFromHash() {
  console.log('Checking for OAuth token in URL hash');
  const hash = window.location.hash.replace(/^#/, '');
  const params = new URLSearchParams(hash);
  const authToken = params.get('authToken');
  if (!authToken) return;

  saveAuthToken(authToken);
  setMessage('Connexion Google réussie. Redirection vers la suite de l’inscription.', 'success');
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
    // 1. On demande l'envoi du code au serveur
    const data = await apiRequest('auth.email.start', { fullName, email });
    
    // On mémorise l'email pour la prochaine étape
    pendingEmail = email;
    accountData = { fullName, email };

    // 2. On affiche le formulaire de vérification (le champ pour taper le code)
    verifyForm.classList.remove('hidden'); 
    signupForm.classList.add('hidden'); // Optionnel : cache le formulaire d'inscription

    // 3. On affiche le message de succès (et le debugCode si on est en local)
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
  event.preventDefault(); // Empêche le rechargement de la page (ton problème actuel)

  const code = verifyForm.verificationCode.value.trim();

  try {
    // On appelle l'API pour vérifier le code
    const data = await apiRequest('auth.email.verify', { 
      email: pendingEmail, 
      code: code 
    });

    // Si ça marche, on stocke le token
    saveAuthToken(data.token);
    
    // On redirige vers home.html
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
  console.log('App initialized');
