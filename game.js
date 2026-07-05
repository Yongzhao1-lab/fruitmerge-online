const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const scoreElement = document.getElementById("score");
const timeElement = document.getElementById("time");
const bestScoreElement = document.getElementById("bestScore");
const nextFruitNameElement = document.getElementById("nextFruitName");

const restartButton = document.getElementById("restartButton");
const startButton = document.getElementById("startButton");
const playAgainButton = document.getElementById("playAgainButton");
const shareScoreButton = document.getElementById("shareScoreButton");

const startOverlay = document.getElementById("startOverlay");
const gameOverOverlay = document.getElementById("gameOverOverlay");

const finalScoreElement = document.getElementById("finalScore");
const finalTimeElement = document.getElementById("finalTime");
const finalBestScoreElement = document.getElementById("finalBestScore");
const gameOverMessageElement = document.getElementById("gameOverMessage");
const runTitleElement = document.getElementById("runTitle");

const evolutionBar = document.getElementById("evolutionBar");
const leaderboardList = document.getElementById("leaderboardList");
const gameOverLeaderboard = document.getElementById("gameOverLeaderboard");

let nextFruitCanvases = [];
let nextFruitContexts = [];

const fruits = [
  {
    name: "Cherry",
    radius: 16,
    score: 5,
    type: "cherry",
    color: "#f83446",
    light: "#ff7a84",
    dark: "#b91b2d",
    visualScale: 1.22,
    drawOffsetX: 0,
    drawOffsetY: 0
  },
  {
    name: "Strawberry",
    radius: 21,
    score: 10,
    type: "strawberry",
    color: "#f8473f",
    light: "#ff8a78",
    dark: "#bd1d2d",
    visualScale: 1.14,
    drawOffsetX: 0,
    drawOffsetY: 0
  },
  {
    name: "Grape",
    radius: 27,
    score: 20,
    type: "grape",
    color: "#8f45e8",
    light: "#c67bff",
    dark: "#532091",
    visualScale: 1.08,
    drawOffsetX: 0,
    drawOffsetY: 2
  },
  {
    name: "Orange",
    radius: 34,
    score: 40,
    type: "orange",
    color: "#ff9e22",
    light: "#ffd05d",
    dark: "#cb6100",
    visualScale: 1.02,
    drawOffsetX: 0,
    drawOffsetY: 0
  },
  {
    name: "Apple",
    radius: 42,
    score: 80,
    type: "apple",
    color: "#f5343c",
    light: "#ff7668",
    dark: "#a91624",
    visualScale: 1.00,
    drawOffsetX: 0,
    drawOffsetY: 0
  },
  {
    name: "Peach",
    radius: 51,
    score: 160,
    type: "peach",
    color: "#ff8b63",
    light: "#ffc48c",
    dark: "#dc5143",
    visualScale: 1.00,
    drawOffsetX: 0,
    drawOffsetY: 0
  },
  {
    name: "Pineapple",
    radius: 61,
    score: 320,
    type: "pineapple",
    color: "#f5b72e",
    light: "#ffe36c",
    dark: "#b96803",
    visualScale: 0.98,
    drawOffsetX: 0,
    drawOffsetY: 0
  },
  {
    name: "Watermelon",
    radius: 72,
    score: 640,
    type: "watermelon",
    color: "#28b85b",
    light: "#83df67",
    dark: "#087232",
    visualScale: 0.94,
    drawOffsetX: 0,
    drawOffsetY: 0
  },
  {
    name: "Mango",
    radius: 84,
    score: 1280,
    type: "mango",
    color: "#ffae22",
    light: "#ffdc6e",
    dark: "#d76d06",
    visualScale: 0.92,
    drawOffsetX: 0,
    drawOffsetY: 0
  },
  {
    name: "Melon",
    radius: 96,
    score: 2560,
    type: "melon",
    color: "#d6d36b",
    light: "#f7f2a0",
    dark: "#879133",
    visualScale: 0.90,
    drawOffsetX: 0,
    drawOffsetY: 0
  },
  {
    name: "Dragon Fruit",
    radius: 110,
    score: 5120,
    type: "dragonfruit",
    color: "#ff3f8f",
    light: "#ff8ac0",
    dark: "#ba155e",
    visualScale: 0.90,
    drawOffsetX: 0,
    drawOffsetY: 0
  }
];

let balls = [];
let currentFruit;
let nextQueue = [];

let mouseX = canvas.width / 2;
let score = 0;
let bestScore = Number(localStorage.getItem("fruitMergeBestScore")) || 0;
let bestTime = Number(localStorage.getItem("fruitMergeBestTime")) || 0;
let highestUnlocked = Number(localStorage.getItem("fruitMergeHighestUnlocked")) || 0;

let isGameOver = false;
let isGameStarted = false;
let canDrop = true;

let gameStartTime = 0;
let survivalTime = 0;

let floatingTexts = [];
let mergeBursts = [];
let screenShake = 0;

let audioContext = null;
let soundReady = false;

const gravity = 0.64;
const friction = 0.9;
const floorFriction = 0.68;
const bounce = 0.04;

const dropLineY = 98;
const spawnY = 54;

const initialDropVelocity = 2.45;
const maxHorizontalSpeed = 0.72;
const maxVerticalSpeed = 7.8;

const collisionSolverIterations = 8;
const collisionRestitution = 0.015;
const collisionCorrection = 0.78;
const maxCorrectionPerFrame = 6.2;

const collisionTightness = 0.99;
const mergeDistanceFactor = 1.01;

function setText(element, value) {
  if (element) element.textContent = value;
}

function showElement(element) {
  if (element) element.classList.remove("hidden");
}

function hideElement(element) {
  if (element) element.classList.add("hidden");
}

function setupNextPreviewUi() {
  const existingNext0 = document.getElementById("nextFruitCanvas0");
  const legacyNext = document.getElementById("nextFruitCanvas");

  if (!existingNext0 && legacyNext) {
    const wrapper = document.createElement("div");
    wrapper.className = "next-preview auto-next-preview";

    const sizes = [42, 36, 32];
    const labels = ["Next", "2nd", "3rd"];

    for (let i = 0; i < 3; i++) {
      const item = document.createElement("div");

      const previewCanvas = document.createElement("canvas");
      previewCanvas.id = `nextFruitCanvas${i}`;
      previewCanvas.width = sizes[i];
      previewCanvas.height = sizes[i];
      previewCanvas.style.width = `${sizes[i]}px`;
      previewCanvas.style.height = `${sizes[i]}px`;

      const label = document.createElement("small");
      label.textContent = labels[i];

      item.appendChild(previewCanvas);
      item.appendChild(label);
      wrapper.appendChild(item);
    }

    legacyNext.replaceWith(wrapper);
  }

  const ids = [
    "nextFruitCanvas0",
    "nextFruitCanvas1",
    "nextFruitCanvas2",
    "nextFruitCanvas"
  ];

  nextFruitCanvases = Array.from(
    new Set(
      ids
        .map((id) => document.getElementById(id))
        .filter(Boolean)
    )
  );

  nextFruitContexts = nextFruitCanvases.map((item) => item.getContext("2d"));
}

function polishRestartButton() {
  if (!restartButton) return;

  restartButton.style.width = "auto";
  restartButton.style.height = "auto";
  restartButton.style.minWidth = "92px";
  restartButton.style.minHeight = "44px";
  restartButton.style.padding = "12px 18px";
  restartButton.style.borderRadius = "999px";
  restartButton.style.fontSize = "14px";
  restartButton.style.fontWeight = "800";
  restartButton.style.boxShadow = "0 8px 20px rgba(255, 122, 80, 0.22)";
  restartButton.style.transform = "none";
}

function initAudio() {
  if (soundReady) {
    if (audioContext && audioContext.state === "suspended") {
      audioContext.resume().catch(() => {});
    }
    return;
  }

  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return;

  audioContext = new AudioContextClass();

  if (audioContext.state === "suspended") {
    audioContext.resume().catch(() => {});
  }

  soundReady = true;
}

function playTone(frequency, duration, type = "sine", volume = 0.04) {
  if (!audioContext) return;

  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();

  oscillator.type = type;
  oscillator.frequency.value = frequency;

  gain.gain.setValueAtTime(volume, audioContext.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + duration);

  oscillator.connect(gain);
  gain.connect(audioContext.destination);

  oscillator.start();
  oscillator.stop(audioContext.currentTime + duration);
}

function playDropSound() {
  playTone(280, 0.055, "triangle", 0.025);
}

function playMergeSound(level) {
  const frequency = 430 + level * 42;
  playTone(frequency, 0.075, "sine", 0.042);
  playTone(frequency * 1.3, 0.09, "triangle", 0.025);
}

function playBigMergeSound() {
  playTone(620, 0.09, "sine", 0.045);
  setTimeout(() => playTone(820, 0.12, "sine", 0.038), 70);
}

function playGameOverSound() {
  playTone(240, 0.14, "sawtooth", 0.028);
  setTimeout(() => playTone(160, 0.18, "sawtooth", 0.022), 120);
}

function vibrate(ms) {
  if (navigator.vibrate) navigator.vibrate(ms);
}

function getDifficultyStage() {
  if (survivalTime < 30) return 0;
  if (survivalTime < 60) return 1;
  if (survivalTime < 90) return 2;
  return 3;
}

function getStageName() {
  const stage = getDifficultyStage();
  if (stage === 0) return "Warm Up";
  if (stage === 1) return "Pressure";
  if (stage === 2) return "Hard";
  return "Expert";
}

function getDangerLimit() {
  const stage = getDifficultyStage();

  if (stage === 0) return 56;
  if (stage === 1) return 42;
  if (stage === 2) return 32;
  return 24;
}

function getDropCooldown() {
  const stage = getDifficultyStage();

  if (stage === 0) return 320;
  if (stage === 1) return 290;
  if (stage === 2) return 260;
  return 230;
}

function randomStartLevel() {
  const stage = getDifficultyStage();
  const random = Math.random();

  if (stage === 0) {
    if (random < 0.20) return 0;
    if (random < 0.45) return 1;
    if (random < 0.74) return 2;
    return 3;
  }

  if (stage === 1) {
    if (random < 0.08) return 0;
    if (random < 0.25) return 1;
    if (random < 0.50) return 2;
    if (random < 0.75) return 3;
    if (random < 0.92) return 4;
    return 5;
  }

  if (stage === 2) {
    if (random < 0.18) return 2;
    if (random < 0.42) return 3;
    if (random < 0.67) return 4;
    if (random < 0.88) return 5;
    return 6;
  }

  if (random < 0.16) return 3;
  if (random < 0.39) return 4;
  if (random < 0.63) return 5;
  if (random < 0.85) return 6;
  return 7;
}

function createFruit(x, y, level) {
  return {
    x,
    y,
    vx: 0,
    vy: 0,
    level,
    radius: fruits[level].radius,
    dangerFrames: 0,
    age: 0,
    popFrames: 0
  };
}

function setupEvolutionBar() {
  if (!evolutionBar) return;

  evolutionBar.innerHTML = "";

  fruits.forEach((fruit, index) => {
    const item = document.createElement("span");
    item.className = "evolution-item";
    item.dataset.level = index;
    item.textContent = fruit.name;
    evolutionBar.appendChild(item);
  });

  updateEvolutionBar();
}

function updateEvolutionBar(currentLevel = highestUnlocked) {
  if (!evolutionBar) return;

  const items = evolutionBar.querySelectorAll(".evolution-item");

  items.forEach((item) => {
    const level = Number(item.dataset.level);
    item.classList.toggle("unlocked", level <= highestUnlocked);
    item.classList.toggle("current", level === currentLevel);
  });
}

function setupRound(showStartScreen = true) {
  balls = [];
  floatingTexts = [];
  mergeBursts = [];

  score = 0;
  survivalTime = 0;
  isGameOver = false;
  isGameStarted = !showStartScreen;
  canDrop = true;
  mouseX = canvas.width / 2;
  screenShake = 0;

  setText(scoreElement, score);
  setText(timeElement, "00:00");
  setText(bestScoreElement, bestScore);

  hideElement(gameOverOverlay);

  if (showStartScreen) {
    showElement(startOverlay);
  } else {
    hideElement(startOverlay);
    gameStartTime = performance.now();
  }

  currentFruit = createFruit(mouseX, spawnY, randomStartLevel());
  nextQueue = [randomStartLevel(), randomStartLevel(), randomStartLevel()];

  updateNextFruit();
  updateEvolutionBar();
  renderLeaderboard();
}

function updateNextFruit() {
  if (!nextQueue.length) return;

  const nextLevel = nextQueue[0];
  const fruit = fruits[nextLevel];

  setText(nextFruitNameElement, fruit.name);

  if (!nextFruitCanvases.length) return;

  nextFruitCanvases.forEach((nextCanvas, index) => {
    const nextCtx = nextFruitContexts[index];
    if (!nextCtx) return;

    const level = nextQueue[index] ?? nextQueue[0];
    const size = index === 0 ? 20 : index === 1 ? 17 : 15;

    nextCtx.clearRect(0, 0, nextCanvas.width, nextCanvas.height);
    drawFruitIcon(nextCtx, nextCanvas.width / 2, nextCanvas.height / 2, size, level);
  });
}

function updateSurvivalTime() {
  if (!isGameStarted || isGameOver) return;

  survivalTime = (performance.now() - gameStartTime) / 1000;
  setText(timeElement, formatTime(survivalTime));
}

function formatTime(seconds) {
  const total = Math.floor(seconds);
  const min = String(Math.floor(total / 60)).padStart(2, "0");
  const sec = String(total % 60).padStart(2, "0");
  return `${min}:${sec}`;
}

function getRunTitle(seconds) {
  if (seconds >= 180) return "Expert Run";
  if (seconds >= 120) return "Pro Run";
  if (seconds >= 60) return "Strong Run";
  if (seconds >= 30) return "Casual Run";
  return "Quick Try";
}

function getLeaderboard() {
  try {
    return JSON.parse(localStorage.getItem("fruitMergeLeaderboard")) || [];
  } catch {
    return [];
  }
}

function saveLeaderboard(list) {
  localStorage.setItem("fruitMergeLeaderboard", JSON.stringify(list));
}

function updateLeaderboard() {
  if (score <= 0 && survivalTime <= 0) return;

  const list = getLeaderboard();

  list.push({
    score,
    time: survivalTime,
    title: getRunTitle(survivalTime),
    date: new Date().toISOString()
  });

  list.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return b.time - a.time;
  });

  saveLeaderboard(list.slice(0, 5));
}

function renderLeaderboard() {
  const list = getLeaderboard();

  if (leaderboardList) {
    if (!list.length) {
      leaderboardList.innerHTML = `<div class="leaderboard-empty">No local runs yet. Play a round to create your first record.</div>`;
    } else {
      leaderboardList.innerHTML = list.map((item, index) => createLeaderboardRow(item, index)).join("");
    }
  }

  if (gameOverLeaderboard) {
    if (!list.length) {
      gameOverLeaderboard.innerHTML = "";
    } else {
      gameOverLeaderboard.innerHTML = list.slice(0, 3).map((item, index) => createLeaderboardRow(item, index)).join("");
    }
  }
}

function createLeaderboardRow(item, index) {
  return `
    <div class="leaderboard-row">
      <span class="leaderboard-rank">${index + 1}</span>
      <span class="leaderboard-main">
        <strong>${item.title || "Quick Run"}</strong>
        <span>Time ${formatTime(item.time || 0)}</span>
      </span>
      <span class="leaderboard-score">${item.score || 0}</span>
    </div>
  `;
}

function getMaxDangerRatio() {
  let maxDangerFrames = 0;

  for (const ball of balls) {
    if (ball.dangerFrames > maxDangerFrames) {
      maxDangerFrames = ball.dangerFrames;
    }
  }

  return Math.min(1, maxDangerFrames / getDangerLimit());
}

function drawBackground() {
  const dangerRatio = getMaxDangerRatio();
  const time = performance.now();
  const pulse = 0.5 + Math.sin(time / 120) * 0.5;
  const dangerActive = dangerRatio > 0.35;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "#ecfbff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const warningAlpha = dangerActive
    ? 0.14 + dangerRatio * 0.34 + pulse * 0.08
    : 0.08 + dangerRatio * 0.22;

  ctx.fillStyle = `rgba(255, 80, 60, ${warningAlpha})`;
  ctx.fillRect(0, 0, canvas.width, dropLineY);

  ctx.strokeStyle = dangerActive
    ? `rgba(255, 76, 61, ${0.7 + pulse * 0.3})`
    : "#18c7b8";

  ctx.lineWidth = dangerActive ? 4 + pulse * 1.2 : 3;
  ctx.setLineDash([8, 8]);

  ctx.beginPath();
  ctx.moveTo(0, dropLineY);
  ctx.lineTo(canvas.width, dropLineY);
  ctx.stroke();

  ctx.setLineDash([]);

  ctx.fillStyle = dangerActive ? "#ff4c3d" : "#00a99d";
  ctx.font = dangerActive ? "bold 14px Arial" : "13px Arial";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText(dangerActive ? "Warning!" : "Danger Line", 12, dropLineY - 14);

  ctx.textAlign = "right";
  ctx.fillText(getStageName(), canvas.width - 12, dropLineY - 14);

  if (dangerActive && !isGameOver) {
    drawDangerCountdown(dangerRatio);
  }
}

function drawDangerCountdown(dangerRatio) {
  let number = 3;

  if (dangerRatio > 0.66) number = 1;
  else if (dangerRatio > 0.5) number = 2;

  ctx.save();
  ctx.globalAlpha = 0.18 + dangerRatio * 0.42;
  ctx.fillStyle = "#ff4c3d";
  ctx.font = "bold 78px Arial";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(String(number), canvas.width / 2, dropLineY + 72);
  ctx.restore();
}

function drawAimLine() {
  if (!isGameStarted || isGameOver || !currentFruit) return;

  ctx.save();
  ctx.strokeStyle = "rgba(24, 199, 184, 0.45)";
  ctx.lineWidth = 2;
  ctx.setLineDash([6, 8]);

  ctx.beginPath();
  ctx.moveTo(mouseX, spawnY + currentFruit.radius + 8);
  ctx.lineTo(mouseX, canvas.height - 8);
  ctx.stroke();

  ctx.setLineDash([]);

  ctx.fillStyle = "rgba(24, 199, 184, 0.18)";
  ctx.beginPath();
  ctx.arc(mouseX, canvas.height - 16, 12, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function drawFruit(ball) {
  let scale = 1;

  if (ball.popFrames > 0) {
    scale = 1 + ball.popFrames / 85;
  }

  drawFruitIcon(ctx, ball.x, ball.y, ball.radius * scale, ball.level);
}

function drawFruitIcon(targetCtx, x, y, radius, level) {
  const fruit = fruits[level];
  const visualRadius = radius * (fruit.visualScale || 1);
  const offsetX = fruit.drawOffsetX || 0;
  const offsetY = fruit.drawOffsetY || 0;

  targetCtx.save();
  targetCtx.translate(Math.round(x + offsetX), Math.round(y + offsetY));

  drawFruitShadow(targetCtx, visualRadius);
  drawCuteFruit(targetCtx, visualRadius, fruit);

  targetCtx.restore();
}

function drawCuteFruit(targetCtx, radius, fruit) {
  targetCtx.save();
  targetCtx.lineJoin = "round";
  targetCtx.lineCap = "round";

  switch (fruit.type) {
    case "cherry":
      drawCherry(targetCtx, radius, fruit);
      break;
    case "strawberry":
      drawStrawberry(targetCtx, radius, fruit);
      break;
    case "grape":
      drawGrape(targetCtx, radius, fruit);
      break;
    case "orange":
      drawOrange(targetCtx, radius, fruit);
      break;
    case "apple":
      drawApple(targetCtx, radius, fruit);
      break;
    case "peach":
      drawPeach(targetCtx, radius, fruit);
      break;
    case "pineapple":
      drawPineapple(targetCtx, radius, fruit);
      break;
    case "watermelon":
      drawWatermelon(targetCtx, radius, fruit);
      break;
    case "mango":
      drawMango(targetCtx, radius, fruit);
      break;
    case "melon":
      drawMelon(targetCtx, radius, fruit);
      break;
    case "dragonfruit":
      drawDragonFruit(targetCtx, radius, fruit);
      break;
    default:
      drawRoundBody(targetCtx, radius, fruit, 1, 1);
  }

  targetCtx.restore();
}

function drawFruitShadow(targetCtx, radius) {
  targetCtx.save();
  targetCtx.globalAlpha = 0.16;
  targetCtx.fillStyle = "#52cfd7";
  targetCtx.beginPath();
  targetCtx.ellipse(
    0,
    radius * 0.88,
    radius * 0.58,
    radius * 0.13,
    0,
    0,
    Math.PI * 2
  );
  targetCtx.fill();
  targetCtx.restore();
}

function createFruitGradient(targetCtx, radius, fruit) {
  const gradient = targetCtx.createRadialGradient(
    -radius * 0.38,
    -radius * 0.42,
    radius * 0.08,
    radius * 0.08,
    radius * 0.12,
    radius * 1.1
  );

  gradient.addColorStop(0, "#fff6c6");
  gradient.addColorStop(0.20, fruit.light);
  gradient.addColorStop(0.64, fruit.color);
  gradient.addColorStop(1, fruit.dark);

  return gradient;
}

function drawRoundBody(targetCtx, radius, fruit, scaleX = 1, scaleY = 1) {
  targetCtx.save();

  targetCtx.fillStyle = createFruitGradient(targetCtx, radius, fruit);
  targetCtx.strokeStyle = "#6d3315";
  targetCtx.lineWidth = Math.max(2, radius * 0.085);

  targetCtx.beginPath();
  targetCtx.ellipse(0, 0, radius * scaleX, radius * scaleY, 0, 0, Math.PI * 2);
  targetCtx.fill();
  targetCtx.stroke();

  drawGloss(targetCtx, radius, -0.34, -0.38, scaleX, scaleY);

  targetCtx.restore();
}

function drawGloss(targetCtx, radius, xFactor = -0.35, yFactor = -0.4, scaleX = 1, scaleY = 1) {
  targetCtx.save();

  targetCtx.globalAlpha = 0.56;
  targetCtx.fillStyle = "#ffffff";
  targetCtx.translate(radius * xFactor * scaleX, radius * yFactor * scaleY);
  targetCtx.rotate(-0.65);
  targetCtx.beginPath();
  targetCtx.ellipse(0, 0, radius * 0.22, radius * 0.10, 0, 0, Math.PI * 2);
  targetCtx.fill();

  targetCtx.globalAlpha = 0.38;
  targetCtx.beginPath();
  targetCtx.arc(radius * 0.34, radius * 0.22, radius * 0.075, 0, Math.PI * 2);
  targetCtx.fill();

  targetCtx.restore();
}

function drawStem(targetCtx, x, y, length, angle, width = 4) {
  targetCtx.save();
  targetCtx.translate(x, y);
  targetCtx.rotate(angle);

  targetCtx.strokeStyle = "#7b3b13";
  targetCtx.lineWidth = Math.max(2, width);
  targetCtx.lineCap = "round";

  targetCtx.beginPath();
  targetCtx.moveTo(0, 0);
  targetCtx.quadraticCurveTo(length * 0.18, -length * 0.5, length * 0.1, -length);
  targetCtx.stroke();

  targetCtx.strokeStyle = "#c87324";
  targetCtx.lineWidth = Math.max(1, width * 0.45);
  targetCtx.beginPath();
  targetCtx.moveTo(-width * 0.25, -length * 0.05);
  targetCtx.quadraticCurveTo(length * 0.12, -length * 0.48, length * 0.06, -length * 0.92);
  targetCtx.stroke();

  targetCtx.restore();
}

function drawLeaf(targetCtx, x, y, size, angle = 0) {
  targetCtx.save();
  targetCtx.translate(x, y);
  targetCtx.rotate(angle);

  const gradient = targetCtx.createLinearGradient(-size, -size, size, size);
  gradient.addColorStop(0, "#c9f767");
  gradient.addColorStop(0.45, "#61ce30");
  gradient.addColorStop(1, "#23891d");

  targetCtx.fillStyle = gradient;
  targetCtx.strokeStyle = "#2d6f16";
  targetCtx.lineWidth = Math.max(1.4, size * 0.12);

  targetCtx.beginPath();
  targetCtx.moveTo(0, 0);
  targetCtx.bezierCurveTo(size * 0.65, -size * 0.85, size * 1.15, -size * 0.25, size * 0.95, size * 0.16);
  targetCtx.bezierCurveTo(size * 0.38, size * 0.36, size * 0.12, size * 0.18, 0, 0);
  targetCtx.fill();
  targetCtx.stroke();

  targetCtx.restore();
}

function drawCherry(targetCtx, radius, fruit) {
  const r = radius * 0.48;

  drawStem(targetCtx, -radius * 0.30, -radius * 0.42, radius * 0.9, -0.35, radius * 0.12);
  drawStem(targetCtx, radius * 0.22, -radius * 0.42, radius * 0.85, 0.34, radius * 0.12);
  drawLeaf(targetCtx, radius * 0.05, -radius * 1.15, radius * 0.34, -0.1);

  targetCtx.save();
  targetCtx.translate(-radius * 0.32, radius * 0.10);
  drawRoundBody(targetCtx, r, fruit, 1, 1);
  targetCtx.restore();

  targetCtx.save();
  targetCtx.translate(radius * 0.28, radius * 0.13);
  drawRoundBody(targetCtx, r * 0.95, fruit, 1, 1);
  targetCtx.restore();
}

function drawStrawberry(targetCtx, radius, fruit) {
  targetCtx.save();

  targetCtx.fillStyle = createFruitGradient(targetCtx, radius, fruit);
  targetCtx.strokeStyle = "#6d3315";
  targetCtx.lineWidth = Math.max(2, radius * 0.085);

  targetCtx.beginPath();
  targetCtx.moveTo(0, radius * 0.95);
  targetCtx.bezierCurveTo(-radius * 0.95, radius * 0.35, -radius * 0.88, -radius * 0.72, 0, -radius * 0.82);
  targetCtx.bezierCurveTo(radius * 0.88, -radius * 0.72, radius * 0.95, radius * 0.35, 0, radius * 0.95);
  targetCtx.closePath();
  targetCtx.fill();
  targetCtx.stroke();

  drawGloss(targetCtx, radius, -0.28, -0.36);

  targetCtx.fillStyle = "#ffd95a";
  const seeds = [
    [-0.38, -0.25], [0, -0.34], [0.36, -0.25],
    [-0.48, 0.08], [-0.12, 0.02], [0.25, 0.08],
    [-0.28, 0.40], [0.12, 0.38]
  ];

  seeds.forEach(([sx, sy]) => {
    targetCtx.save();
    targetCtx.translate(radius * sx, radius * sy);
    targetCtx.rotate(0.4);
    targetCtx.beginPath();
    targetCtx.ellipse(0, 0, radius * 0.055, radius * 0.105, 0, 0, Math.PI * 2);
    targetCtx.fill();
    targetCtx.restore();
  });

  for (let i = -2; i <= 2; i++) {
    drawLeaf(targetCtx, radius * i * 0.13, -radius * 0.78, radius * 0.25, i * 0.35 - Math.PI / 2);
  }

  targetCtx.restore();
}

function drawGrape(targetCtx, radius, fruit) {
  const positions = [
    [0, -0.55, 0.34],
    [-0.35, -0.30, 0.36],
    [0.32, -0.30, 0.36],
    [-0.52, 0.05, 0.34],
    [0, 0.05, 0.38],
    [0.52, 0.05, 0.34],
    [-0.25, 0.42, 0.34],
    [0.28, 0.42, 0.34]
  ];

  positions.forEach(([px, py, pr]) => {
    targetCtx.save();
    targetCtx.translate(radius * px, radius * py);
    drawRoundBody(targetCtx, radius * pr, fruit, 1, 1);
    targetCtx.restore();
  });

  drawStem(targetCtx, radius * 0.15, -radius * 0.70, radius * 0.55, 0.55, radius * 0.11);
  drawLeaf(targetCtx, radius * 0.36, -radius * 0.82, radius * 0.32, -0.15);
}

function drawOrange(targetCtx, radius, fruit) {
  drawRoundBody(targetCtx, radius, fruit, 1, 1);

  targetCtx.save();
  targetCtx.globalAlpha = 0.3;
  targetCtx.fillStyle = "#c76600";

  const dots = [
    [-0.35, -0.15], [-0.05, -0.28], [0.26, -0.12],
    [-0.22, 0.18], [0.18, 0.24], [0.42, 0.05]
  ];

  dots.forEach(([dx, dy]) => {
    targetCtx.beginPath();
    targetCtx.arc(radius * dx, radius * dy, Math.max(1.3, radius * 0.035), 0, Math.PI * 2);
    targetCtx.fill();
  });

  targetCtx.restore();

  drawStem(targetCtx, radius * 0.05, -radius * 0.72, radius * 0.38, 0.1, radius * 0.11);
  drawLeaf(targetCtx, radius * 0.22, -radius * 0.78, radius * 0.28, -0.1);
}

function drawApple(targetCtx, radius, fruit) {
  targetCtx.save();

  targetCtx.fillStyle = createFruitGradient(targetCtx, radius, fruit);
  targetCtx.strokeStyle = "#6d3315";
  targetCtx.lineWidth = Math.max(2, radius * 0.08);

  targetCtx.beginPath();
  targetCtx.moveTo(0, -radius * 0.82);
  targetCtx.bezierCurveTo(-radius * 0.75, -radius * 1.02, -radius * 1.05, -radius * 0.28, -radius * 0.90, radius * 0.35);
  targetCtx.bezierCurveTo(-radius * 0.74, radius * 0.92, -radius * 0.25, radius * 0.98, 0, radius * 0.76);
  targetCtx.bezierCurveTo(radius * 0.25, radius * 0.98, radius * 0.74, radius * 0.92, radius * 0.90, radius * 0.35);
  targetCtx.bezierCurveTo(radius * 1.05, -radius * 0.28, radius * 0.75, -radius * 1.02, 0, -radius * 0.82);
  targetCtx.closePath();

  targetCtx.fill();
  targetCtx.stroke();

  drawGloss(targetCtx, radius, -0.34, -0.34);
  drawStem(targetCtx, radius * 0.08, -radius * 0.80, radius * 0.45, 0.18, radius * 0.11);
  drawLeaf(targetCtx, radius * 0.30, -radius * 0.86, radius * 0.28, -0.1);

  targetCtx.restore();
}

function drawPeach(targetCtx, radius, fruit) {
  drawRoundBody(targetCtx, radius, fruit, 1.05, 0.96);

  targetCtx.save();
  targetCtx.strokeStyle = "rgba(196, 82, 62, 0.38)";
  targetCtx.lineWidth = Math.max(1.5, radius * 0.05);
  targetCtx.beginPath();
  targetCtx.moveTo(radius * 0.03, -radius * 0.75);
  targetCtx.bezierCurveTo(radius * 0.18, -radius * 0.25, radius * 0.16, radius * 0.45, radius * 0.02, radius * 0.78);
  targetCtx.stroke();
  targetCtx.restore();

  drawStem(targetCtx, -radius * 0.08, -radius * 0.72, radius * 0.36, -0.2, radius * 0.10);
  drawLeaf(targetCtx, radius * 0.26, -radius * 0.78, radius * 0.32, -0.05);
}

function drawPineapple(targetCtx, radius, fruit) {
  const bodyRadius = radius * 0.86;

  targetCtx.save();

  targetCtx.fillStyle = createFruitGradient(targetCtx, bodyRadius, fruit);
  targetCtx.strokeStyle = "#6d3315";
  targetCtx.lineWidth = Math.max(2, radius * 0.075);

  targetCtx.beginPath();
  targetCtx.ellipse(0, radius * 0.10, bodyRadius * 0.82, bodyRadius, 0, 0, Math.PI * 2);
  targetCtx.fill();
  targetCtx.stroke();

  targetCtx.save();
  targetCtx.clip();

  targetCtx.strokeStyle = "rgba(137, 80, 5, 0.42)";
  targetCtx.lineWidth = Math.max(1, radius * 0.035);

  for (let i = -5; i <= 5; i++) {
    targetCtx.beginPath();
    targetCtx.moveTo(-radius, i * radius * 0.22);
    targetCtx.lineTo(radius, i * radius * 0.22 + radius);
    targetCtx.stroke();

    targetCtx.beginPath();
    targetCtx.moveTo(-radius, i * radius * 0.22 + radius);
    targetCtx.lineTo(radius, i * radius * 0.22);
    targetCtx.stroke();
  }

  targetCtx.restore();

  for (let i = -3; i <= 3; i++) {
    drawLeaf(targetCtx, radius * i * 0.12, -radius * 0.78, radius * 0.32, i * 0.28 - Math.PI / 2);
  }

  drawGloss(targetCtx, radius, -0.24, -0.18);

  targetCtx.restore();
}

function drawWatermelon(targetCtx, radius, fruit) {
  drawRoundBody(targetCtx, radius, fruit, 1, 1);

  targetCtx.save();
  targetCtx.clip();

  targetCtx.strokeStyle = "rgba(9, 94, 32, 0.55)";
  targetCtx.lineWidth = Math.max(3, radius * 0.09);

  for (let i = -2; i <= 2; i++) {
    targetCtx.beginPath();
    targetCtx.moveTo(radius * i * 0.35, -radius);
    targetCtx.bezierCurveTo(
      radius * (i * 0.25 - 0.2),
      -radius * 0.35,
      radius * (i * 0.25 + 0.2),
      radius * 0.35,
      radius * i * 0.35,
      radius
    );
    targetCtx.stroke();
  }

  targetCtx.restore();

  drawStem(targetCtx, radius * 0.06, -radius * 0.78, radius * 0.38, 0.35, radius * 0.11);
}

function drawMango(targetCtx, radius, fruit) {
  targetCtx.save();

  targetCtx.fillStyle = createFruitGradient(targetCtx, radius, fruit);
  targetCtx.strokeStyle = "#6d3315";
  targetCtx.lineWidth = Math.max(2, radius * 0.075);

  targetCtx.beginPath();
  targetCtx.moveTo(-radius * 0.12, -radius * 0.88);
  targetCtx.bezierCurveTo(radius * 0.66, -radius * 0.88, radius * 0.98, -radius * 0.18, radius * 0.72, radius * 0.48);
  targetCtx.bezierCurveTo(radius * 0.42, radius * 1.12, -radius * 0.44, radius * 0.98, -radius * 0.76, radius * 0.35);
  targetCtx.bezierCurveTo(-radius * 1.04, -radius * 0.25, -radius * 0.70, -radius * 0.78, -radius * 0.12, -radius * 0.88);
  targetCtx.closePath();

  targetCtx.fill();
  targetCtx.stroke();

  drawGloss(targetCtx, radius, -0.35, -0.35);
  drawStem(targetCtx, radius * 0.10, -radius * 0.80, radius * 0.34, 0.2, radius * 0.10);
  drawLeaf(targetCtx, radius * 0.32, -radius * 0.78, radius * 0.34, -0.05);

  targetCtx.restore();
}

function drawMelon(targetCtx, radius, fruit) {
  drawRoundBody(targetCtx, radius, fruit, 1, 1);

  targetCtx.save();
  targetCtx.clip();

  targetCtx.strokeStyle = "rgba(255, 255, 190, 0.78)";
  targetCtx.lineWidth = Math.max(1.4, radius * 0.035);

  for (let i = -5; i <= 5; i++) {
    targetCtx.beginPath();
    targetCtx.moveTo(-radius, i * radius * 0.22);
    targetCtx.quadraticCurveTo(0, i * radius * 0.22 + radius * 0.20, radius, i * radius * 0.22);
    targetCtx.stroke();

    targetCtx.beginPath();
    targetCtx.moveTo(i * radius * 0.22, -radius);
    targetCtx.quadraticCurveTo(i * radius * 0.22 + radius * 0.18, 0, i * radius * 0.22, radius);
    targetCtx.stroke();
  }

  targetCtx.restore();

  drawStem(targetCtx, 0, -radius * 0.82, radius * 0.32, 0, radius * 0.12);
}

function drawDragonFruit(targetCtx, radius, fruit) {
  targetCtx.save();

  targetCtx.fillStyle = createFruitGradient(targetCtx, radius, fruit);
  targetCtx.strokeStyle = "#6d3315";
  targetCtx.lineWidth = Math.max(2, radius * 0.07);

  targetCtx.beginPath();
  targetCtx.moveTo(0, -radius * 0.95);
  targetCtx.bezierCurveTo(radius * 0.86, -radius * 0.82, radius * 0.95, radius * 0.15, radius * 0.55, radius * 0.78);
  targetCtx.bezierCurveTo(radius * 0.05, radius * 1.08, -radius * 0.72, radius * 0.84, -radius * 0.86, radius * 0.15);
  targetCtx.bezierCurveTo(-radius * 0.98, -radius * 0.52, -radius * 0.62, -radius * 0.94, 0, -radius * 0.95);
  targetCtx.closePath();
  targetCtx.fill();
  targetCtx.stroke();

  const spikes = [
    [-0.55, -0.45, -2.3],
    [-0.1, -0.78, -1.6],
    [0.45, -0.48, -0.8],
    [0.70, 0.10, -0.1],
    [0.28, 0.72, 0.7],
    [-0.42, 0.60, 1.3],
    [-0.82, 0.10, 2.4]
  ];

  spikes.forEach(([x, y, angle]) => {
    drawLeaf(targetCtx, radius * x, radius * y, radius * 0.30, angle);
  });

  drawGloss(targetCtx, radius, -0.32, -0.38);

  targetCtx.restore();
}

function keepFruitInside(ball) {
  if (ball.x - ball.radius < 0) {
    ball.x = ball.radius;
    ball.vx = Math.max(0, ball.vx) * bounce;
  }

  if (ball.x + ball.radius > canvas.width) {
    ball.x = canvas.width - ball.radius;
    ball.vx = Math.min(0, ball.vx) * bounce;
  }

  if (ball.y + ball.radius > canvas.height) {
    ball.y = canvas.height - ball.radius;

    if (ball.vy > 0) {
      ball.vy *= -bounce;
    }

    ball.vx *= floorFriction;

    if (Math.abs(ball.vy) < 0.55) {
      ball.vy = 0;
    }

    if (Math.abs(ball.vx) < 0.04) {
      ball.vx = 0;
    }
  }
}

function updatePhysics() {
  if (isGameOver || !isGameStarted) return;

  updateSurvivalTime();

  for (const ball of balls) {
    ball.age += 1;

    if (ball.popFrames > 0) {
      ball.popFrames -= 1;
    }

    ball.vy += gravity;
    ball.x += ball.vx;
    ball.y += ball.vy;

    ball.vx *= friction;

    if (Math.abs(ball.vx) < 0.012) {
      ball.vx = 0;
    }

    if (Math.abs(ball.vy) < 0.012) {
      ball.vy = 0;
    }

    ball.vx = clamp(ball.vx, -maxHorizontalSpeed, maxHorizontalSpeed);
    ball.vy = clamp(ball.vy, -1.2, maxVerticalSpeed);

    keepFruitInside(ball);
  }

  updateEffects();
  handleCollisions();
  checkGameOver();
}

function handleCollisions() {
  for (let pass = 0; pass < collisionSolverIterations; pass++) {
    for (let i = 0; i < balls.length; i++) {
      for (let j = i + 1; j < balls.length; j++) {
        const a = balls[i];
        const b = balls[j];

        let dx = b.x - a.x;
        let dy = b.y - a.y;
        let distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < 0.001) {
          distance = 0.001;
          dx = 0.001;
          dy = 0;
        }

        const realDistance = a.radius + b.radius;
        const minDistance = realDistance * collisionTightness;
        const mergeDistance = realDistance * mergeDistanceFactor;

        if (
          pass === 0 &&
          a.level === b.level &&
          a.level < fruits.length - 1 &&
          distance < mergeDistance
        ) {
          mergeFruits(i, j, a, b);
          return;
        }

        if (distance < minDistance) {
          const overlap = minDistance - distance;
          const nx = dx / distance;
          const ny = dy / distance;

          const massA = a.radius * a.radius;
          const massB = b.radius * b.radius;
          const totalMass = massA + massB;

          const moveA = massB / totalMass;
          const moveB = massA / totalMass;

          const correctionAmount = Math.min(
            overlap * collisionCorrection,
            maxCorrectionPerFrame
          );

          a.x -= nx * correctionAmount * moveA;
          b.x += nx * correctionAmount * moveB;

          a.y -= ny * correctionAmount * moveA * 0.86;
          b.y += ny * correctionAmount * moveB * 0.86;

          const relativeVx = b.vx - a.vx;
          const relativeVy = b.vy - a.vy;
          const velocityAlongNormal = relativeVx * nx + relativeVy * ny;

          if (velocityAlongNormal < 0) {
            const impulse = -(1 + collisionRestitution) * velocityAlongNormal;
            const impulseStrength = Math.min(impulse * 0.035, 0.22);

            a.vx -= nx * impulseStrength * moveA;
            b.vx += nx * impulseStrength * moveB;

            a.vy -= ny * impulseStrength * moveA * 0.18;
            b.vy += ny * impulseStrength * moveB * 0.18;
          }

          a.vx *= 0.72;
          b.vx *= 0.72;

          if (a.y + a.radius > canvas.height - 6) {
            a.vx *= floorFriction;
          }

          if (b.y + b.radius > canvas.height - 6) {
            b.vx *= floorFriction;
          }

          a.vx = clamp(a.vx, -maxHorizontalSpeed, maxHorizontalSpeed);
          b.vx = clamp(b.vx, -maxHorizontalSpeed, maxHorizontalSpeed);

          a.vy = clamp(a.vy, -1.2, maxVerticalSpeed);
          b.vy = clamp(b.vy, -1.2, maxVerticalSpeed);

          keepFruitInside(a);
          keepFruitInside(b);
        }
      }
    }
  }
}

function mergeFruits(indexA, indexB, a, b) {
  const newLevel = a.level + 1;
  const gainedScore = fruits[newLevel].score;

  const newFruit = createFruit(
    (a.x + b.x) / 2,
    (a.y + b.y) / 2,
    newLevel
  );

  newFruit.vx = (a.vx + b.vx) * 0.12;
  newFruit.vy = Math.min((a.vy + b.vy) * 0.08, 0.15);
  newFruit.popFrames = 10;

  balls.splice(indexB, 1);
  balls.splice(indexA, 1);
  balls.push(newFruit);

  score += gainedScore;
  setText(scoreElement, score);

  if (newLevel > highestUnlocked) {
    highestUnlocked = newLevel;
    localStorage.setItem("fruitMergeHighestUnlocked", highestUnlocked);
  }

  updateEvolutionBar(newLevel);
  addFloatingText(newFruit.x, newFruit.y - newFruit.radius, `+${gainedScore}`);
  addMergeBurst(newFruit.x, newFruit.y, newFruit.radius, fruits[newLevel].color);

  playMergeSound(newLevel);

  if (newLevel >= 7) {
    addFloatingText(newFruit.x, newFruit.y - newFruit.radius - 24, "Cool Merge!");
    screenShake = 4;
    playBigMergeSound();
    vibrate(25);
  }

  if (score > bestScore) {
    bestScore = score;
    localStorage.setItem("fruitMergeBestScore", bestScore);
    setText(bestScoreElement, bestScore);
  }
}

function addFloatingText(x, y, text) {
  floatingTexts.push({
    x,
    y,
    text,
    life: 42,
    alpha: 1
  });
}

function addMergeBurst(x, y, radius, color) {
  for (let i = 0; i < 12; i++) {
    const angle = (Math.PI * 2 / 12) * i;

    mergeBursts.push({
      x,
      y,
      vx: Math.cos(angle) * (1.1 + radius * 0.01),
      vy: Math.sin(angle) * (1.1 + radius * 0.01),
      radius: Math.max(2, radius * 0.055),
      color,
      life: 28,
      alpha: 0.9
    });
  }
}

function updateEffects() {
  for (const text of floatingTexts) {
    text.y -= 0.55;
    text.life -= 1;
    text.alpha = Math.max(0, text.life / 42);
  }

  floatingTexts = floatingTexts.filter((text) => text.life > 0);

  for (const burst of mergeBursts) {
    burst.x += burst.vx;
    burst.y += burst.vy;
    burst.vy += 0.02;
    burst.life -= 1;
    burst.alpha = Math.max(0, burst.life / 28);
  }

  mergeBursts = mergeBursts.filter((burst) => burst.life > 0);

  if (screenShake > 0) {
    screenShake -= 1;
  }
}

function drawEffects() {
  for (const burst of mergeBursts) {
    ctx.save();
    ctx.globalAlpha = burst.alpha;
    ctx.fillStyle = burst.color;
    ctx.beginPath();
    ctx.arc(burst.x, burst.y, burst.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  for (const text of floatingTexts) {
    ctx.save();
    ctx.globalAlpha = text.alpha;
    ctx.fillStyle = "#00a99d";
    ctx.font = "bold 18px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text.text, text.x, text.y);
    ctx.restore();
  }
}

function checkGameOver() {
  const dangerLimit = getDangerLimit();

  for (const ball of balls) {
    const fruitTop = ball.y - ball.radius;
    const fruitCenter = ball.y;

    const isOldEnough = ball.age > 45;
    const isAboveDangerLine = fruitTop < dropLineY - 2;
    const isCenterNearTop = fruitCenter < dropLineY + 34;

    if (isOldEnough && (isAboveDangerLine || isCenterNearTop)) {
      ball.dangerFrames += 1;
    } else {
      ball.dangerFrames = Math.max(0, ball.dangerFrames - 3);
    }

    if (ball.dangerFrames > dangerLimit) {
      endGame();
      break;
    }
  }
}

function endGame() {
  if (isGameOver) return;

  isGameOver = true;
  isGameStarted = false;

  const oldBest = bestScore;
  const oldBestTime = bestTime;
  const runTitle = getRunTitle(survivalTime);

  if (score > bestScore) {
    bestScore = score;
    localStorage.setItem("fruitMergeBestScore", bestScore);
  }

  if (survivalTime > bestTime) {
    bestTime = survivalTime;
    localStorage.setItem("fruitMergeBestTime", bestTime);
  }

  updateLeaderboard();
  renderLeaderboard();

  setText(bestScoreElement, bestScore);
  setText(finalScoreElement, score);
  setText(finalTimeElement, formatTime(survivalTime));
  setText(finalBestScoreElement, bestScore);
  setText(runTitleElement, runTitle);

  if (score > oldBest) {
    setText(gameOverMessageElement, `New Best! You beat your record by ${score - oldBest} points.`);
  } else if (survivalTime > oldBestTime) {
    setText(gameOverMessageElement, `New survival record: ${formatTime(survivalTime)}!`);
  } else if (survivalTime >= 180) {
    setText(gameOverMessageElement, "Expert run! You survived more than 3 minutes.");
  } else {
    setText(gameOverMessageElement, `Only ${Math.max(0, bestScore - score)} points away from your best score.`);
  }

  playGameOverSound();
  vibrate(60);

  showElement(gameOverOverlay);
}

function draw() {
  const shakeX = screenShake > 0 ? (Math.random() - 0.5) * screenShake : 0;
  const shakeY = screenShake > 0 ? (Math.random() - 0.5) * screenShake : 0;

  ctx.save();
  ctx.translate(shakeX, shakeY);

  drawBackground();
  drawAimLine();

  const sortedBalls = balls.slice().sort((a, b) => a.y - b.y);

  for (const ball of sortedBalls) {
    drawFruit(ball);
  }

  if (!isGameOver && isGameStarted && currentFruit) {
    currentFruit.x = mouseX;
    drawFruit(currentFruit);
  }

  drawEffects();

  ctx.restore();
}

function gameLoop() {
  updatePhysics();
  draw();
  requestAnimationFrame(gameLoop);
}

function dropFruit() {
  if (isGameOver || !isGameStarted || !canDrop || !currentFruit) return;

  initAudio();
  canDrop = false;

  const fruit = createFruit(mouseX, spawnY, currentFruit.level);
  fruit.vy = initialDropVelocity;
  balls.push(fruit);

  playDropSound();

  const nextLevel = nextQueue.shift();
  currentFruit = createFruit(mouseX, spawnY, nextLevel);
  nextQueue.push(randomStartLevel());

  updateNextFruit();

  setTimeout(() => {
    canDrop = true;
  }, getDropCooldown());
}

function updateMousePosition(clientX) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;

  mouseX = (clientX - rect.left) * scaleX;

  const radius = currentFruit ? currentFruit.radius : 24;
  const margin = 8;

  mouseX = Math.max(
    radius + margin,
    Math.min(canvas.width - radius - margin, mouseX)
  );
}

function shareScore() {
  const text = `I scored ${score} and survived ${formatTime(survivalTime)} in Fruit Merge Online! Can you beat me? https://fruitmerge.online`;

  if (navigator.share) {
    navigator.share({
      title: "Fruit Merge Online",
      text,
      url: "https://fruitmerge.online"
    }).catch(() => {});
    return;
  }

  if (navigator.clipboard) {
    navigator.clipboard.writeText(text).then(() => {
      setText(gameOverMessageElement, "Score copied! Share it with your friends.");
    }).catch(() => {
      setText(gameOverMessageElement, text);
    });
  } else {
    setText(gameOverMessageElement, text);
  }
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

canvas.addEventListener("mousemove", (event) => {
  updateMousePosition(event.clientX);
});

canvas.addEventListener("click", () => {
  dropFruit();
});

canvas.addEventListener(
  "touchmove",
  (event) => {
    event.preventDefault();
    updateMousePosition(event.touches[0].clientX);
  },
  { passive: false }
);

canvas.addEventListener(
  "touchend",
  (event) => {
    event.preventDefault();
    dropFruit();
  },
  { passive: false }
);

if (startButton) {
  startButton.addEventListener("click", () => {
    initAudio();
    setupRound(false);
  });
}

if (restartButton) {
  restartButton.addEventListener("click", () => {
    initAudio();
    setupRound(false);
  });
}

if (playAgainButton) {
  playAgainButton.addEventListener("click", () => {
    initAudio();
    setupRound(false);
  });
}

if (shareScoreButton) {
  shareScoreButton.addEventListener("click", shareScore);
}

setupNextPreviewUi();
polishRestartButton();
setupEvolutionBar();
setupRound(true);
gameLoop();
