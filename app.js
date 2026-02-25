const signupForm = document.getElementById('signup-form');
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
  {
    key: 'contractType',
    label: 'Quel type de contrat recherchez-vous ?',
    type: 'select',
    options: ['CDI', 'CDD', 'Stage', 'Alternance', 'Freelance'],
  },
  {
    key: 'regions',
    label: 'Dans quelles régions souhaitez-vous travailler ? (séparez par des virgules)',
    type: 'text',
    placeholder: 'Île-de-France, Occitanie',
  },
  {
    key: 'educationLevel',
    label: "Quel est votre niveau d'étude ?",
    type: 'select',
    options: ['Bac', 'Bac+2', 'Bac+3', 'Bac+5', 'Doctorat'],
  },
  {
    key: 'duration',
    label: 'Quelle durée souhaitez-vous ?',
    type: 'text',
    placeholder: 'Ex: 6 mois',
  },
  {
    key: 'experience',
    label: "Quel est votre niveau d'expérience ?",
    type: 'select',
    options: ['Junior (0-2 ans)', 'Confirmé (3-5 ans)', 'Senior (6+ ans)'],
  },
  {
    key: 'startDate',
    label: 'Quelle est votre date de début souhaitée ?',
    type: 'date',
  },
  {
    key: 'companyCategory',
    label: "Quelle catégorie d'entreprise vous intéresse ?",
    type: 'select',
    options: ['Startup', 'PME', 'Grande entreprise', 'Association', 'Public'],
  },
];

let currentStep = 0;
let accountData = null;
const profileAnswers = {};

function parseRegions(value) {
  return value
    .split(',')
    .map((region) => region.trim())
    .filter(Boolean);
}

function renderPreview(payload) {
  profilePreview.classList.remove('hidden');
  previewContent.textContent = JSON.stringify(payload, null, 2);
}

function hydratePreviewFromStorage() {
  const raw = localStorage.getItem('candidateProfile');
  if (!raw) {
    return;
  }

  try {
    const parsed = JSON.parse(raw);
    renderPreview(parsed);
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
    if (!parsed.length) {
      return false;
    }
    profileAnswers.regions = parsed;
    return true;
  }

  const value = rawValue.trim();
  if (!value) {
    return false;
  }

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
    if (step.placeholder) {
      input.placeholder = step.placeholder;
    }
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

signupForm.addEventListener('submit', (event) => {
  event.preventDefault();

  if (!signupForm.checkValidity()) {
    message.textContent = 'Merci de renseigner tous les champs obligatoires.';
    message.className = 'message error';
    signupForm.reportValidity();
    return;
  }

  accountData = {
    fullName: signupForm.fullName.value.trim(),
    email: signupForm.email.value.trim(),
  };

  message.textContent = 'Compte créé. Complétez maintenant votre profil étape par étape.';
  message.className = 'message success';

  signupForm.reset();
  openModal();
});

backButton.addEventListener('click', () => {
  if (currentStep === 0) {
    return;
  }

  currentStep -= 1;
  renderStep();
});

nextButton.addEventListener('click', () => {
  const step = profileSteps[currentStep];
  const input = document.getElementById('step-input');

  if (!setStepValue(step, input.value)) {
    message.textContent = 'Merci de répondre à la question avant de continuer.';
    message.className = 'message error';
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

  message.textContent = 'Profil complété avec succès. Vos préférences ont été enregistrées.';
  message.className = 'message success';
});

hydratePreviewFromStorage();
