const API_BASE = '/public/api.php';
const AUTH_TOKEN_KEY = 'authToken';

const signupForm = document.getElementById('signup-form');
const verifyForm = document.getElementById('verify-form');
const googleOauthButton = document.getElementById('google-oauth-button');
const message = document.getElementById('message');
const modal = document.getElementById('profile-modal');
const modalQuestion = document.getElementById('modal-question');
const modalFieldContainer = document.getElementById('modal-field-container');
const progressText = document.getElementById('progress-text');
const progressBar = document.getElementById('progress-bar');
const backButton = document.getElementById('back-button');
const nextButton = document.getElementById('next-button');
const profilePreview = document.getElementById('profile-preview');
const previewContent = document.getElementById('preview-content');

const profileSteps = [
  { key: 'contractType', label: 'Quel type de contrat recherchez-vous ?', type: 'select', options: ['CDI', 'CDD', 'Stage', 'Alternance', 'Freelance'] },
  { key: 'regions', label: 'Dans quelles régions souhaitez-vous travailler ? (séparez par des virgules)', type: 'text', placeholder: 'Île-de-France, Occitanie' },
  { key: 'educationLevel', label: "Quel est votre niveau d'étude ?", type: 'select', options: ['Bac', 'Bac+2', 'Bac+3', 'Bac+5', 'Doctorat'] },
  { key: 'duration', label: 'Quelle durée souhaitez-vous ?', type: 'text', placeholder: 'Ex: 6 mois' },
  { key: 'experience', label: "Quel est votre niveau d'expérience ?", type: 'select', options: ['Junior (0-2 ans)', 'Confirmé (3-5 ans)', 'Senior (6+ ans)'] },
  { key: 'startDate', label: 'Quelle est votre date de début souhaitée ?', type: 'date' },
  { key: 'companyCategory', label: "Quelle catégorie d'entreprise vous intéresse ?", type: 'select', options: ['Startup', 'PME', 'Grande entreprise', 'Association', 'Public'] },
];

let currentStep = 0;
let accountData = null;
let pendingEmail = '';
const profileAnswers = {};

function parseRegions(value) {
  return value.split(',').map((region) => region.trim()).filter(Boolean);
}

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

function renderPreview(payload) {
  profilePreview.classList.remove('hidden');
  previewContent.textContent = JSON.stringify(payload, null, 2);
}

function hydratePreviewFromStorage() {
  const raw = localStorage.getItem('candidateProfile');
  if (!raw) return;

  try {
    renderPreview(JSON.parse(raw));
  } catch {
    localStorage.removeItem('candidateProfile');
  }
}

function getStepValue(step) {
  if (step.key === 'regions') {
    return Array.isArray(profileAnswers.regions) ? profileAnswers.regions.join(', ') : '';
  }
  return profileAnswers[step.key] || '';
}

function setStepValue(step, rawValue) {
  if (step.key === 'regions') {
    const parsed = parseRegions(rawValue);
    if (!parsed.length) return false;
    profileAnswers.regions = parsed;
    return true;
  }

  const value = rawValue.trim();
  if (!value) return false;
  profileAnswers[step.key] = value;
  return true;
}

function renderStep() {
  const step = profileSteps[currentStep];
  const progress = Math.round((currentStep / profileSteps.length) * 100);

  progressText.textContent = `Finalisation du profil : ${progress}%`;
  progressBar.style.width = `${progress}%`;
  modalQuestion.textContent = step.label;
  modalFieldContainer.innerHTML = '';

  let input;
  if (step.type === 'select') {
    input = document.createElement('select');
    const placeholderOption = document.createElement('option');
    placeholderOption.value = '';
    placeholderOption.textContent = 'Sélectionnez...';
    input.appendChild(placeholderOption);

    step.options.forEach((optionValue) => {
      const option = document.createElement('option');
      option.value = optionValue;
      option.textContent = optionValue;
      input.appendChild(option);
    });
  } else {
    input = document.createElement('input');
    input.type = step.type;
    if (step.placeholder) input.placeholder = step.placeholder;
  }

  input.id = 'step-input';
  input.value = getStepValue(step);
  input.required = true;
  modalFieldContainer.appendChild(input);

  backButton.disabled = currentStep === 0;
  nextButton.textContent = currentStep === profileSteps.length - 1 ? 'Terminer' : 'Suivant';
}

function openModal() {
  currentStep = 0;
  profileSteps.forEach((step) => {
    profileAnswers[step.key] = step.key === 'regions' ? [] : '';
  });
  modal.classList.remove('hidden');
  modal.setAttribute('aria-hidden', 'false');
  renderStep();
}

function closeModal() {
  modal.classList.add('hidden');
  modal.setAttribute('aria-hidden', 'true');
}

function saveProfile() {
  const payload = {
    account: accountData,
    searchOptions: {
      contractType: profileAnswers.contractType,
      regions: profileAnswers.regions,
      educationLevel: profileAnswers.educationLevel,
      duration: profileAnswers.duration,
      experience: profileAnswers.experience,
      startDate: profileAnswers.startDate,
      companyCategory: profileAnswers.companyCategory,
    },
  };

  localStorage.setItem('candidateProfile', JSON.stringify(payload));
  return payload;
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
  setMessage('Connexion Google réussie. Vous pouvez compléter votre profil.', 'success');
  history.replaceState(null, '', window.location.pathname);
}

signupForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  if (!signupForm.checkValidity()) {
    setMessage('Merci de renseigner tous les champs obligatoires.', 'error');
    signupForm.reportValidity();
    return;
  }

  const fullName = signupForm.fullName.value.trim();
  const email = signupForm.email.value.trim();

  try {
    const data = await apiRequest('auth.email.start', { fullName, email });
    pendingEmail = email;
    accountData = { fullName, email };
    verifyForm.classList.remove('hidden');
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

  if (!verifyForm.checkValidity()) {
    verifyForm.reportValidity();
    setMessage('Code de vérification invalide.', 'error');
    return;
  }

  const code = verifyForm.verificationCode.value.trim();

  try {
    const data = await apiRequest('auth.email.verify', { email: pendingEmail, code });
    saveAuthToken(data.token);
    accountData = { fullName: data.user.fullName || '', email: data.user.email };
    verifyForm.reset();
    verifyForm.classList.add('hidden');
    setMessage('E-mail vérifié. Vous êtes connecté.', 'success');
    openModal();
  } catch (error) {
    setMessage(error.message, 'error');
  }
});

googleOauthButton.addEventListener('click', () => {
  window.location.href = `${API_BASE}?action=oauth.google.start`;
});

backButton.addEventListener('click', () => {
  if (currentStep === 0) return;
  currentStep -= 1;
  renderStep();
});

nextButton.addEventListener('click', () => {
  const step = profileSteps[currentStep];
  const input = document.getElementById('step-input');

  if (!setStepValue(step, input.value)) {
    setMessage('Merci de répondre à la question avant de continuer.', 'error');
    input.focus();
    return;
  }

  if (currentStep < profileSteps.length - 1) {
    currentStep += 1;
    renderStep();
    return;
  }

  progressText.textContent = 'Finalisation du profil : 100%';
  progressBar.style.width = '100%';
  const payload = saveProfile();
  renderPreview(payload);
  closeModal();
  setMessage('Profil complété avec succès. Vos préférences ont été enregistrées.', 'success');
});

handleOauthTokenFromHash();
hydratePreviewFromStorage();
restoreSessionIfAny();
