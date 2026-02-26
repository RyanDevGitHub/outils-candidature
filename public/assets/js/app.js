const API_BASE = 'http://localhost:4173/api.php';
const AUTH_TOKEN_KEY = 'authToken';

// Sélection des éléments
const signupForm = document.getElementById('signup-form');
const loginForm = document.getElementById('login-form');
const verifyForm = document.getElementById('verify-form');
const googleOauthButton = document.getElementById('google-oauth-button');
const message = document.getElementById('message');

// On détermine quel formulaire est présent sur la page actuelle
const activeForm = signupForm || loginForm;

let pendingEmail = '';

/**
 * Utilitaires pour les Cookies
 */
function getCookie(name) {
    const escapedName = name.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
    const match = document.cookie.match(new RegExp(`(?:^|; )${escapedName}=([^;]*)`));
    return match ? decodeURIComponent(match[1]) : '';
}

function deleteCookie(name) {
    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=Lax`;
}

function setMessage(text, type = 'success') {
    if (!message) return;
    message.textContent = text;
    message.className = `message ${type}`;
}

/**
 * Envoi de requête à l'API
 * Note: credentials 'include' est crucial pour que le navigateur accepte les cookies
 */
async function apiRequest(action, payload) {
    const response = await fetch(`${API_BASE}?action=${encodeURIComponent(action)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        credentials: 'include' 
    });

    const data = await response.json();
    if (!response.ok || !data.ok) {
        throw new Error(data.error || 'Une erreur est survenue.');
    }

    return data;
}

/**
 * Vérification de la session au chargement
 */
async function restoreSessionIfAny() {
    const token = getCookie('authToken');
    if (!token) return;

    try {
        await apiRequest('auth.session', { token });
        // Si la session est valide, on redirige vers le dashboard
        window.location.href = '/home';
    } catch (error) {
        console.error("Session invalide détectée :", error);
        deleteCookie('authToken');
    }
}

/**
 * Gestion de l'envoi du mail (Login ou Signup)
 */
if (activeForm) {
    activeForm.addEventListener('submit', async (event) => {
        event.preventDefault();

        if (!activeForm.checkValidity()) {
            activeForm.reportValidity();
            setMessage('Merci de renseigner tous les champs obligatoires.', 'error');
            return;
        }

        const email = activeForm.email.value.trim();
        // On récupère le fullName uniquement s'il existe (cas du signup)
        const fullName = activeForm.fullName ? activeForm.fullName.value.trim() : '';

        try {
            // Choix de l'action selon le formulaire affiché
            const action = activeForm.id === 'signup-form' ? 'auth.email.start' : 'auth.email.login.start';
            
            const data = await apiRequest(action, { fullName, email });
            pendingEmail = email;

            // Interface : on masque le formulaire principal et on montre celui du code
            verifyForm.classList.remove('hidden');
            activeForm.classList.add('hidden');

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
}

/**
 * Validation du code de vérification
 */
if (verifyForm) {
    verifyForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const code = verifyForm.verificationCode.value.trim();

        try {
            await apiRequest('auth.email.verify', {
                email: pendingEmail,
                code: code
            });

            // Une fois vérifié, le cookie est déjà posé par le serveur PHP
            window.location.href = '/home';
        } catch (error) {
            setMessage(error.message, 'error');
        }
    });
}

/**
 * OAuth Google
 */
if (googleOauthButton) {
    googleOauthButton.addEventListener('click', () => {
        window.location.href = `${API_BASE}?action=oauth.google.start`;
    });
}

// Initialisation
restoreSessionIfAny();