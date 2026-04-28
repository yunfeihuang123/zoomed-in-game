const REQUIRED_ROUNDS = 12;

const setupSection = document.getElementById("setupSection");
const gameSection = document.getElementById("gameSection");
const resultsSection = document.getElementById("resultsSection");

const roundsContainer = document.getElementById("roundsContainer");
const addRoundBtn = document.getElementById("addRoundBtn");
const startGameBtn = document.getElementById("startGameBtn");
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
});

startGameBtn.addEventListener("click", async () => {
  setupError.textContent = "";

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
  for (let i = 0; i < REQUIRED_ROUNDS; i += 1) {
    addRoundCard();
  }
  renderRoundLabels();
});

function addRoundCard() {
  const node = roundTemplate.content.firstElementChild.cloneNode(true);
  const removeBtn = node.querySelector(".remove-round");
  const cardData = { node };
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
  if (!file) {
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

  const imageUrl = await readFileAsDataUrl(file);
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
  answerArea.classList.add("hidden");
  revealControls.classList.remove("hidden");
  optionsContainer.innerHTML = "";

  const round = gameState.rounds[gameState.currentRoundIndex];
  roundTitle.textContent = `Round ${round.roundNumber} of ${REQUIRED_ROUNDS}`;
  roundProgress.textContent = "Zoomed image shown. Click reveal when ready.";

  roundImage.classList.add("loading");
  zoomStage.classList.add("zoomed");
  roundImage.src = round.imageUrl;

  const focalPoint = getRandomFocalPoint();
  roundImage.style.transformOrigin = `${focalPoint.x}% ${focalPoint.y}%`;
  roundImage.onload = () => {
    roundImage.classList.remove("loading");
  };
}

function renderCorrectAnswer() {
  const round = gameState.rounds[gameState.currentRoundIndex];
  roundProgress.textContent = "Full image and answer shown.";

  optionsContainer.innerHTML = "";
  round.options.forEach((optionText, optionIndex) => {
    const item = document.createElement("div");
    item.className = `answer-pill ${optionIndex === round.correctIndex ? "correct" : ""}`;
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
