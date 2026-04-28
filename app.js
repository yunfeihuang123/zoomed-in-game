const REQUIRED_ROUNDS = 12;
const SAVED_SETUP_KEY = "zoomedInGameSetupV1";

const setupSection = document.getElementById("setupSection");
const gameSection = document.getElementById("gameSection");
const resultsSection = document.getElementById("resultsSection");

const roundsContainer = document.getElementById("roundsContainer");
const addRoundBtn = document.getElementById("addRoundBtn");
const saveSetupBtn = document.getElementById("saveSetupBtn");
const loadSetupBtn = document.getElementById("loadSetupBtn");
const clearSetupBtn = document.getElementById("clearSetupBtn");
const startGameBtn = document.getElementById("startGameBtn");
const setupStatus = document.getElementById("setupStatus");
const setupError = document.getElementById("setupError");
const roundTemplate = document.getElementById("roundTemplate");

const roundTitle = document.getElementById("roundTitle");
const roundProgress = document.getElementById("roundProgress");
const roundImage = document.getElementById("roundImage");
const zoomStage = document.getElementById("zoomStage");
const revealControls = document.getElementById("revealControls");
const revealBtn = document.getElementById("revealBtn");
const answerArea = document.getElementById("answerArea");
const optionsContainer = document.getElementById("optionsContainer");
const nextRoundBtn = document.getElementById("nextRoundBtn");

const addParticipantBtn = document.getElementById("addParticipantBtn");
const participantsContainer = document.getElementById("participantsContainer");
const resultsError = document.getElementById("resultsError");
const showChartBtn = document.getElementById("showChartBtn");
const chartSection = document.getElementById("chartSection");
const barChart = document.getElementById("barChart");
const participantTemplate = document.getElementById("participantTemplate");
const restartBtn = document.getElementById("restartBtn");

const roundCards = [];
const participantCards = [];
let gameState = null;

addRoundBtn.addEventListener("click", () => {
  addRoundCard();
  renderRoundLabels();
  setupStatus.textContent = "";
});

startGameBtn.addEventListener("click", async () => {
  setupError.textContent = "";
  setupStatus.textContent = "";

  if (roundCards.length !== REQUIRED_ROUNDS) {
    setupError.textContent = `You need exactly ${REQUIRED_ROUNDS} rounds.`;
    return;
  }

  const rounds = [];
  for (let i = 0; i < roundCards.length; i += 1) {
    const parsedRound = await parseRoundCard(roundCards[i], i);
    if (!parsedRound) {
      return;
    }
    rounds.push(parsedRound);
  }

  initializeGame(rounds);
  renderCurrentRound();
});

saveSetupBtn.addEventListener("click", async () => {
  setupError.textContent = "";
  setupStatus.textContent = "";

  const setupData = await collectSetupDataForStorage();
  if (!setupData) {
    return;
  }

  try {
    localStorage.setItem(SAVED_SETUP_KEY, JSON.stringify(setupData));
    setupStatus.textContent = "Setup saved. You can refresh and load it later.";
  } catch (error) {
    setupError.textContent = "Could not save setup. Try smaller images.";
  }
});

loadSetupBtn.addEventListener("click", () => {
  setupError.textContent = "";
  setupStatus.textContent = "";
  const stored = localStorage.getItem(SAVED_SETUP_KEY);

  if (!stored) {
    setupError.textContent = "No saved setup found.";
    return;
  }

  try {
    const parsed = JSON.parse(stored);
    applySavedSetup(parsed);
    setupStatus.textContent = "Saved setup loaded.";
  } catch (error) {
    setupError.textContent = "Saved setup is invalid. Clear and save again.";
  }
});

clearSetupBtn.addEventListener("click", () => {
  localStorage.removeItem(SAVED_SETUP_KEY);
  setupStatus.textContent = "Saved setup cleared.";
  setupError.textContent = "";
});

revealBtn.addEventListener("click", () => {
  const focalPoint = getRandomFocalPoint();
  roundImage.style.transformOrigin = `${focalPoint.x}% ${focalPoint.y}%`;
  zoomStage.classList.remove("zoomed");
  revealControls.classList.add("hidden");
  answerArea.classList.remove("hidden");
  renderCorrectAnswer();
});

nextRoundBtn.addEventListener("click", () => {
  gameState.currentRoundIndex += 1;

  if (gameState.currentRoundIndex < REQUIRED_ROUNDS) {
    renderCurrentRound();
    return;
  }

  showFinalResults();
});

addParticipantBtn.addEventListener("click", () => {
  addParticipantCard();
});

showChartBtn.addEventListener("click", () => {
  resultsError.textContent = "";
  const participants = collectParticipantsAndScores();
  if (!participants) {
    return;
  }

  renderBarChart(participants);
});

restartBtn.addEventListener("click", () => {
  gameState = null;
  resultsSection.classList.add("hidden");
  gameSection.classList.add("hidden");
  setupSection.classList.remove("hidden");
  roundsContainer.innerHTML = "";
  roundCards.length = 0;
  participantsContainer.innerHTML = "";
  participantCards.length = 0;
  resultsError.textContent = "";
  chartSection.classList.add("hidden");
  barChart.innerHTML = "";
  setupError.textContent = "";
  setupStatus.textContent = "";
  for (let i = 0; i < REQUIRED_ROUNDS; i += 1) {
    addRoundCard();
  }
  renderRoundLabels();
});

function addRoundCard() {
  const node = roundTemplate.content.firstElementChild.cloneNode(true);
  const removeBtn = node.querySelector(".remove-round");
  const imageInput = node.querySelector(".round-image-input");
  const imageStatus = node.querySelector(".image-status");
  const cardData = { node, savedImageUrl: "" };

  imageInput.addEventListener("change", () => {
    cardData.savedImageUrl = "";
    if (imageInput.files[0]) {
      imageStatus.textContent = `Loaded: ${imageInput.files[0].name}`;
    } else {
      imageStatus.textContent = "";
    }
  });

  roundCards.push(cardData);

  removeBtn.addEventListener("click", () => {
    const index = roundCards.indexOf(cardData);
    if (index >= 0) {
      roundCards.splice(index, 1);
      node.remove();
      renderRoundLabels();
    }
  });

  roundsContainer.appendChild(node);
}

function renderRoundLabels() {
  roundCards.forEach((card, index) => {
    const heading = card.node.querySelector(".round-name");
    heading.textContent = `Round ${index + 1}`;
  });
}

function addParticipantCard() {
  const node = participantTemplate.content.firstElementChild.cloneNode(true);
  const removeBtn = node.querySelector(".remove-participant");
  const cardData = { node };
  participantCards.push(cardData);

  removeBtn.addEventListener("click", () => {
    const index = participantCards.indexOf(cardData);
    if (index >= 0) {
      participantCards.splice(index, 1);
      node.remove();
    }
  });

  participantsContainer.appendChild(node);
}

async function parseRoundCard(card, index) {
  const node = card.node;
  const imageInput = node.querySelector(".round-image-input");
  const optionInputs = [...node.querySelectorAll(".option-input")];
  const correctOptionSelect = node.querySelector(".correct-option-select");
  const roundError = node.querySelector(".round-error");

  roundError.textContent = "";
  const file = imageInput.files[0];
  if (!file && !card.savedImageUrl) {
    roundError.textContent = "Upload an image.";
    return null;
  }

  const options = optionInputs.map((input) => input.value.trim());
  if (options.some((option) => !option)) {
    roundError.textContent = "Fill in all 5 options.";
    return null;
  }

  const correctIndex = Number(correctOptionSelect.value);
  if (Number.isNaN(correctIndex)) {
    roundError.textContent = "Select the correct option.";
    return null;
  }

  const imageUrl = file ? await readFileAsDataUrl(file) : card.savedImageUrl;
  return {
    roundNumber: index + 1,
    imageUrl,
    options,
    correctIndex
  };
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Could not read image file."));
    reader.readAsDataURL(file);
  });
}

async function collectSetupDataForStorage() {
  if (roundCards.length !== REQUIRED_ROUNDS) {
    setupError.textContent = `You need exactly ${REQUIRED_ROUNDS} rounds to save.`;
    return null;
  }

  const rounds = [];
  for (let i = 0; i < roundCards.length; i += 1) {
    const card = roundCards[i];
    const node = card.node;
    const optionInputs = [...node.querySelectorAll(".option-input")];
    const correctOptionSelect = node.querySelector(".correct-option-select");
    const roundError = node.querySelector(".round-error");
    const imageInput = node.querySelector(".round-image-input");

    roundError.textContent = "";
    const options = optionInputs.map((input) => input.value.trim());
    if (options.some((option) => !option)) {
      roundError.textContent = "Fill in all 5 options before saving.";
      return null;
    }

    const correctIndex = Number(correctOptionSelect.value);
    if (Number.isNaN(correctIndex)) {
      roundError.textContent = "Select the correct option before saving.";
      return null;
    }

    let imageUrl = card.savedImageUrl;
    if (imageInput.files[0]) {
      imageUrl = await readFileAsDataUrl(imageInput.files[0]);
    }

    if (!imageUrl) {
      roundError.textContent = "Upload an image before saving.";
      return null;
    }

    rounds.push({
      options,
      correctIndex,
      imageUrl
    });
  }

  return {
    savedAt: new Date().toISOString(),
    rounds
  };
}

function applySavedSetup(savedSetup) {
  if (!savedSetup || !Array.isArray(savedSetup.rounds) || savedSetup.rounds.length !== REQUIRED_ROUNDS) {
    throw new Error("Invalid saved setup.");
  }

  roundsContainer.innerHTML = "";
  roundCards.length = 0;
  savedSetup.rounds.forEach((roundData) => {
    addRoundCard();
    const card = roundCards[roundCards.length - 1];
    const node = card.node;
    const optionInputs = [...node.querySelectorAll(".option-input")];
    const correctOptionSelect = node.querySelector(".correct-option-select");
    const imageStatus = node.querySelector(".image-status");

    optionInputs.forEach((input, index) => {
      input.value = roundData.options[index] || "";
    });
    correctOptionSelect.value = String(roundData.correctIndex);
    card.savedImageUrl = roundData.imageUrl || "";
    imageStatus.textContent = card.savedImageUrl ? "Loaded from saved setup." : "";
  });
  renderRoundLabels();
}

function initializeGame(rounds) {
  gameState = {
    rounds,
    currentRoundIndex: 0
  };

  setupSection.classList.add("hidden");
  resultsSection.classList.add("hidden");
  gameSection.classList.remove("hidden");
}

function renderCurrentRound() {
  answerArea.classList.remove("hidden");
  revealControls.classList.remove("hidden");
  nextRoundBtn.classList.add("hidden");
  optionsContainer.innerHTML = "";

  const round = gameState.rounds[gameState.currentRoundIndex];
  roundTitle.textContent = `Round ${round.roundNumber} of ${REQUIRED_ROUNDS}`;
  roundProgress.textContent = "Zoomed image and options shown. Click reveal when ready.";

  roundImage.classList.add("loading");
  zoomStage.classList.add("zoomed");
  roundImage.src = round.imageUrl;

  const focalPoint = getRandomFocalPoint();
  roundImage.style.transformOrigin = `${focalPoint.x}% ${focalPoint.y}%`;
  roundImage.onload = () => {
    roundImage.classList.remove("loading");
  };

  renderOptions(false);
}

function renderCorrectAnswer() {
  roundProgress.textContent = "Full image and correct answer shown.";
  nextRoundBtn.classList.remove("hidden");
  renderOptions(true);
}

function renderOptions(showCorrectAnswer) {
  const round = gameState.rounds[gameState.currentRoundIndex];
  optionsContainer.innerHTML = "";

  round.options.forEach((optionText, optionIndex) => {
    const isCorrect = optionIndex === round.correctIndex;
    const shouldHighlight = showCorrectAnswer && isCorrect;
    const item = document.createElement("div");
    item.className = `answer-pill ${shouldHighlight ? "correct" : ""}`;
    item.textContent = optionText;
    optionsContainer.appendChild(item);
  });
}

function showFinalResults() {
  gameSection.classList.add("hidden");
  resultsSection.classList.remove("hidden");
  chartSection.classList.add("hidden");
  barChart.innerHTML = "";
  resultsError.textContent = "";
  participantsContainer.innerHTML = "";
  participantCards.length = 0;
  addParticipantCard();
}

function collectParticipantsAndScores() {
  if (participantCards.length < 1) {
    resultsError.textContent = "Add at least one participant.";
    return null;
  }

  const entries = [];
  for (let i = 0; i < participantCards.length; i += 1) {
    const node = participantCards[i].node;
    const name = node.querySelector(".participant-name-input").value.trim();
    const rawScore = node.querySelector(".participant-score-input").value.trim();
    const score = Number(rawScore);

    if (!name) {
      resultsError.textContent = "Every participant needs a name.";
      return null;
    }

    if (!Number.isFinite(score) || !Number.isInteger(score) || score < 0 || score > REQUIRED_ROUNDS) {
      resultsError.textContent = `Scores must be whole numbers between 0 and ${REQUIRED_ROUNDS}.`;
      return null;
    }

    entries.push({ name, score });
  }

  return entries.sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
}

function renderBarChart(ranking) {
  chartSection.classList.remove("hidden");
  barChart.innerHTML = "";

  const maxScore = Math.max(...ranking.map((entry) => entry.score), 1);
  const trophyMap = getTrophyMap(ranking);

  ranking.forEach((entry) => {
    const wrapper = document.createElement("article");
    wrapper.className = "bar-item";

    const trophies = document.createElement("div");
    trophies.className = "trophies";
    if (trophyMap.gold.has(entry.name)) {
      trophies.textContent += "🏆";
    }
    if (trophyMap.silver.has(entry.name)) {
      trophies.textContent += "🥈";
    }
    if (trophyMap.bronze.has(entry.name)) {
      trophies.textContent += "🥉";
    }

    const track = document.createElement("div");
    track.className = "bar-track";
    const fill = document.createElement("div");
    fill.className = "bar-fill";
    fill.style.height = `${(entry.score / maxScore) * 100}%`;
    fill.textContent = String(entry.score);
    track.appendChild(fill);

    const name = document.createElement("div");
    name.className = "bar-name";
    name.textContent = entry.name;

    wrapper.appendChild(trophies);
    wrapper.appendChild(track);
    wrapper.appendChild(name);
    barChart.appendChild(wrapper);
  });
}

function getTrophyMap(ranking) {
  const groupedScores = [...new Set(ranking.map((entry) => entry.score))];
  const medalsByRank = ["gold", "silver", "bronze"];
  const trophyMap = {
    gold: new Set(),
    silver: new Set(),
    bronze: new Set()
  };

  for (let i = 0; i < medalsByRank.length; i += 1) {
    const scoreAtRank = groupedScores[i];
    if (scoreAtRank === undefined) {
      continue;
    }
    const medalKey = medalsByRank[i];
    ranking
      .filter((entry) => entry.score === scoreAtRank)
      .forEach((entry) => trophyMap[medalKey].add(entry.name));
  }

  return trophyMap;
}

function getRandomFocalPoint() {
  return {
    x: randomBetween(25, 75),
    y: randomBetween(25, 75)
  };
}

function randomBetween(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

for (let i = 0; i < REQUIRED_ROUNDS; i += 1) {
  addRoundCard();
}
renderRoundLabels();
