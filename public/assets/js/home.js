const API_BASE = 'http://localhost:4173/api.php';
const AUTH_TOKEN_KEY = 'authToken';

const modal = document.getElementById('profile-modal');
const modalQuestion = document.getElementById('modal-question');
const modalFieldContainer = document.getElementById('modal-field-container');
const progressText = document.getElementById('progress-text');
const progressBar = document.getElementById('progress-bar');
const backButton = document.getElementById('back-button');
const nextButton = document.getElementById('next-button');
const homeMessage = document.getElementById('home-message');

const profileSteps = [
  { key: 'contractType', label: 'Quel type de contrat recherchez-vous ?', type: 'select', options: ['CDI', 'CDD', 'Stage', 'Alternance', 'Freelance'] },
  { key: 'regions', label: 'Dans quelles régions souhaitez-vous travailler ?', type: 'region-select' },
  { key: 'educationLevel', label: "Quel est votre niveau d'étude ?", type: 'select', options: ['Bac', 'Bac+2', 'Bac+3', 'Bac+5', 'Doctorat'] },
  { key: 'duration', label: 'Quelle durée souhaitez-vous ?', type: 'select', options: ['3 mois', '6 mois', '1 an', '18 mois', '2 ans', '3 ans'] },
  { key: 'experience', label: "Quel est votre niveau d'expérience ?", type: 'select', options: ['Junior (0-2 ans)', 'Confirmé (3-5 ans)', 'Senior (6+ ans)'] },
  { key: 'startDate', label: 'Quelle est votre date de début souhaitée ?', type: 'date' },
  { key: 'companyCategory', label: "Quelle catégorie d'entreprise vous intéresse ?", type: 'select', options: ['Startup', 'PME', 'Grande entreprise', 'Association', 'Public'] },
];

const REGION_SUGGESTIONS = ['Auvergne-Rhône-Alpes', 'Bourgogne-Franche-Comté', 'Bretagne', 'Centre-Val de Loire', 'Corse', 'Grand Est', 'Hauts-de-France', 'Île-de-France', 'Normandie', 'Nouvelle-Aquitaine', 'Occitanie', 'Pays de la Loire', 'Provence-Alpes-Côte d’Azur'];

let accountData = null;
let currentStep = 0;
const profileAnswers = {};


function handleOauthTokenFromHash() {
  console.log('Checking for OAuth token in URL hash');
  const hash = window.location.hash.replace(/^#/, '');
  const params = new URLSearchParams(hash);
  const authToken = params.get('authToken');
  if (!authToken) return;

  saveAuthToken(authToken);
  setMessage('Connexion Google réussie. Redirection vers la suite de l’inscription.', 'success');
}
function toggleModal(visible) {
  modal.classList.toggle('hidden', !visible);
  modal.setAttribute('aria-hidden', visible ? 'false' : 'true');
}

function setMessage(text, type = 'success') {
  homeMessage.textContent = text;
  homeMessage.className = `message ${type}`;
}

function showPendingToastIfAny() {
  const toast = sessionStorage.getItem('profileToast');
  if (!toast) return;

  setMessage(toast, 'success');
  sessionStorage.removeItem('profileToast');
}

function getAuthToken() {
  return localStorage.getItem(AUTH_TOKEN_KEY) || '';
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

function getStepValue(step) {
  if (step.key === 'regions') {
    return Array.isArray(profileAnswers.regions) ? profileAnswers.regions.join(', ') : '';
  }

  return profileAnswers[step.key] || '';
}

function setStepValue(step, rawValue) {
  if (step.key === 'regions') {
    const parsed = Array.isArray(rawValue) ? rawValue : [];
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
  if (step.key === 'contractType') {
    input = document.createElement('div');
    input.className = 'contract-picker';
    input.id = 'step-input';

    step.options.forEach((optionValue) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'contract-option';
      button.textContent = optionValue;
      button.setAttribute('aria-pressed', String(getStepValue(step) === optionValue));

      if (getStepValue(step) === optionValue) button.classList.add('selected');

      button.addEventListener('click', () => {
        profileAnswers.contractType = optionValue;
        renderStep();
      });

      input.appendChild(button);
    });
  } else if (step.key === 'startDate') {
    input = document.createElement('div');
    input.id = 'step-input';
    input.className = 'date-widget';

    const dateInput = document.createElement('input');
    dateInput.type = 'date';
    dateInput.id = 'start-date-input';
    dateInput.value = getStepValue(step);

    const quickActions = document.createElement('div');
    quickActions.className = 'date-quick-actions';

    [{ label: "Aujourd'hui", days: 0 }, { label: 'Dans 2 semaines', days: 14 }, { label: 'Dans 1 mois', days: 30 }].forEach((option) => {
      const quickButton = document.createElement('button');
      quickButton.type = 'button';
      quickButton.className = 'date-quick-button';
      quickButton.textContent = option.label;
      quickButton.addEventListener('click', () => {
        const date = new Date();
        date.setDate(date.getDate() + option.days);
        dateInput.value = date.toISOString().split('T')[0];
      });
      quickActions.appendChild(quickButton);
    });

    input.appendChild(dateInput);
    input.appendChild(quickActions);
  } else if (step.type === 'select') {
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

    input.id = 'step-input';
    input.value = getStepValue(step);
  } else if (step.key === 'regions') {
    input = document.createElement('select');
    input.id = 'step-input';
    input.className = 'region-select';
    input.multiple = true;

    REGION_SUGGESTIONS.forEach((region) => {
      const option = document.createElement('option');
      option.value = region;
      option.textContent = region;
      if ((profileAnswers.regions || []).includes(region)) {
        option.selected = true;
      }
      input.appendChild(option);
    });
  } else {
    input = document.createElement('input');
    input.type = 'text';
    input.id = 'step-input';
    input.value = getStepValue(step);
    if (step.placeholder) input.placeholder = step.placeholder;
  }

  modalFieldContainer.appendChild(input);
  backButton.disabled = currentStep === 0;
  nextButton.textContent = currentStep === profileSteps.length - 1 ? 'Terminer' : 'Suivant';
}

async function saveProfile() {
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
  
  await apiRequest('profile.save', {
    token: getAuthToken(),
    profile: payload.searchOptions,
  });
}

async function restoreSessionIfAny() {
  const token = getAuthToken();
  if (!token) {
    // window.location.href = '/';
    return;
  }

  try {
    const data = await apiRequest('auth.session', { token });
    accountData = { fullName: data.user.fullName || '', email: data.user.email };
    setMessage(`Bienvenue ${accountData.fullName || accountData.email}`);

    if (data.user.hasCompletedProfile) {
      toggleModal(false);
      return;
    }

    toggleModal(true);
    renderStep();
  } catch (error) {
    console.error('Error restoring session:', error);
    localStorage.removeItem(AUTH_TOKEN_KEY);
    window.location.href = '/';
  }
}

backButton.addEventListener('click', () => {
  if (currentStep === 0) return;
  currentStep -= 1;
  renderStep();
});

nextButton.addEventListener('click', () => {
  const step = profileSteps[currentStep];
  const input = document.getElementById('step-input');

  const rawValue = (() => {
    if (step.key === 'contractType') return profileAnswers.contractType || '';
    if (step.key === 'regions') return Array.from(input?.selectedOptions || []).map((option) => option.value);
    if (step.key === 'startDate') return document.getElementById('start-date-input')?.value || '';
    return input ? input.value : '';
  })();

  if (!setStepValue(step, rawValue)) {
    setMessage('Merci de répondre à la question avant de continuer.', 'error');
    return;
  }

  if (currentStep < profileSteps.length - 1) {
    currentStep += 1;
    renderStep();
    return;
  }

  saveProfile()
    .then(() => {
      sessionStorage.setItem('profileToast', 'Profil complété avec succès. Vos préférences ont été enregistrées.');
      toggleModal(false);
      showPendingToastIfAny();
    })
    .catch((error) => {
      setMessage(error.message, 'error');
    });
});
handleOauthTokenFromHash();
// On ne vérifie la session QUE si on a un token
if (getAuthToken()) {
    restoreSessionIfAny();
} else {
    // Si vraiment pas de token du tout, on renvoie à l'accueil
    // window.location.href = '/';
}
showPendingToastIfAny();
