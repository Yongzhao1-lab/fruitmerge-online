const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const GAME_WIDTH = Number(canvas.getAttribute("width")) || 420;
const GAME_HEIGHT = Number(canvas.getAttribute("height")) || 560;

function setupCanvasDpi() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);

  canvas.style.width = `${GAME_WIDTH}px`;
  canvas.style.maxWidth = "100%";
  canvas.style.height = "auto";

  canvas.width = Math.floor(GAME_WIDTH * dpr);
  canvas.height = Math.floor(GAME_HEIGHT * dpr);

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
}

setupCanvasDpi();
window.addEventListener("resize", setupCanvasDpi);

const scoreElement = document.getElementById("score");
const panelScoreElement = document.getElementById("panelScore");
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

const leaderboardList = document.getElementById("leaderboardList");
const gameOverLeaderboard = document.getElementById("gameOverLeaderboard");
const evolutionCircle = document.getElementById("evolutionCircle");

let nextFruitCanvases = [];
let nextFruitContexts = [];

const ASSET_VERSION = "v=20260706-arcade-layout-final";

const fruits = [
  {
    name: "Cherry",
    radius: 15,
    score: 5,
    type: "cherry",
    files: ["cherry.png"],
    color: "#ff4a42",
    visualScale: 1.40,
    drawOffsetY: 0
  },
  {
    name: "Strawberry",
    radius: 20,
    score: 10,
    type: "strawberry",
    files: ["strawberry.png"],
    color: "#ff5148",
    visualScale: 1.30,
    drawOffsetY: 0
  },
  {
    name: "Grape",
    radius: 25,
    score: 20,
    type: "grape",
    files: ["grape.png"],
    color: "#a65bff",
    visualScale: 1.18,
    drawOffsetY: 1
  },
  {
    name: "Orange",
    radius: 32,
    score: 40,
    type: "orange",
    files: ["orange.png"],
    color: "#ff9f2e",
    visualScale: 1.14,
    drawOffsetY: 0
  },
  {
    name: "Apple",
    radius: 39,
    score: 80,
    type: "apple",
    files: ["apple.png"],
    color: "#f64340",
    visualScale: 1.12,
    drawOffsetY: 0
  },
  {
    name: "Peach",
    radius: 48,
    score: 160,
    type: "peach",
    files: ["peach.png"],
    color: "#ff9872",
    visualScale: 1.10,
    drawOffsetY: 0
  },
  {
    name: "Pineapple",
    radius: 57,
    score: 320,
    type: "pineapple",
    files: ["pineapple.png"],
    color: "#ffc238",
    visualScale: 1.02,
    drawOffsetY: -2
  },
  {
    name: "Watermelon",
    radius: 68,
    score: 640,
    type: "watermelon",
    files: ["watermelon.png"],
    color: "#30c765",
    visualScale: 1.04,
    drawOffsetY: 0
  },
  {
    name: "Grapefruit",
    radius: 80,
    score: 1280,
    type: "grapefruit",
    files: ["grapefruit.png", "pomelo.png", "yuzu.png", "lemon.png"],
    color: "#ffe45b",
    visualScale: 1.02,
    drawOffsetY: 0
  },
  {
    name: "Melon",
    radius: 92,
    score: 2560,
    type: "melon",
    files: ["melon.png", "hami-melon.png", "honeydew.png", "cantaloupe.png"],
    color: "#d9e66d",
    visualScale: 1.00,
    drawOffsetY: 0
  },
  {
    name: "Dragon Fruit",
    radius: 106,
    score: 5120,
    type: "dragonfruit",
    files: ["dragonfruit.png", "dragon-fruit.png", "dragon_fruit.png", "pitaya.png"],
    color: "#ff5098",
    visualScale: 0.98,
    drawOffsetY: 0
  }
];

const fruitImages = new Map();

let balls = [];
let currentFruit;
let nextQueue = [];

let mouseX = GAME_WIDTH / 2;
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

const gravity = 0.60;
const friction = 0.965;
const floorFriction = 0.94;
const bounce = 0;

const dropLineY = 86;
const spawnY = 46;

const initialDropVelocity = 2.45;
const maxHorizontalSpeed = 0.28;
const maxVerticalSpeed = 7.2;

const collisionSolverIterations = 5;
const collisionRestitution = 0;
const collisionCorrection = 0.18;
const maxCorrectionPerFrame = 1.05;

const collisionTightness = 0.86;
const mergeDistanceFactor = 0.91;

const collisionSlop = 1.8;
const verticalCorrectionFactor = 0.42;

const sleepSpeedLimit = 0.18;
const sleepFramesRequired = 12;
const wakeSpeedThreshold = 1.25;

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
  const ids = ["nextFruitCanvas0", "nextFruitCanvas1", "nextFruitCanvas2"];

  nextFruitCanvases = ids
    .map((id) => document.getElementById(id))
    .filter(Boolean);

  nextFruitContexts = nextFruitCanvases.map((item) => {
    const context = item.getContext("2d");
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";
    return context;
  });
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

function loadFruitImage(index, fileIndex = 0) {
  const fruit = fruits[index];
  const file = fruit.files[fileIndex];

  if (!file) {
    fruitImages.set(index, {
      image: null,
      loaded: false,
      failed: true
    });
    updateEvolutionCircle();
    return;
  }

  const image = new Image();

  fruitImages.set(index, {
    image,
    loaded: false,
    failed: false
  });

  image.onload = () => {
    fruitImages.set(index, {
      image,
      loaded: true,
      failed: false
    });

    updateNextFruit();
    updateEvolutionCircle();
  };

  image.onerror = () => {
    loadFruitImage(index, fileIndex + 1);
  };

  image.src = `/assets/fruits/${file}?${ASSET_VERSION}`;
}

function preloadFruitImages() {
  fruits.forEach((_, index) => {
    loadFruitImage(index);
  });
}

function setupEvolutionCircle() {
  if (!evolutionCircle) return;

  evolutionCircle.innerHTML = "";

  fruits.forEach((fruit, index) => {
    const item = document.createElement("div");
    const angle = (360 / fruits.length) * index - 90;

    item.className = "evolution-item";
    item.dataset.level = String(index);
    item.style.setProperty("--angle", `${angle}deg`);
    item.title = fruit.name;

    const img = document.createElement("img");
    img.alt = fruit.name;
    img.dataset.level = String(index);

    item.appendChild(img);
    evolutionCircle.appendChild(item);
  });

  updateEvolutionCircle();
}

function updateEvolutionCircle(currentLevel = highestUnlocked) {
  if (!evolutionCircle) return;

  const items = evolutionCircle.querySelectorAll(".evolution-item");

  items.forEach((item) => {
    const level = Number(item.dataset.level);
    const img = item.querySelector("img");
    const record = fruitImages.get(level);

    item.classList.toggle("unlocked", level <= highestUnlocked);
    item.classList.toggle("current", level === currentLevel);

    if (img && record && record.loaded && record.image) {
      img.src = record.image.src;
    }
  });
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

  if (stage === 0) return 300;
  if (stage === 1) return 270;
  if (stage === 2) return 240;
  return 220;
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
    popFrames: 0,
    sleepFrames: 0,
    asleep: false
  };
}

function getFruitSpeed(ball) {
  return Math.abs(ball.vx) + Math.abs(ball.vy);
}

function wakeFruit(ball) {
  ball.asleep = false;
  ball.sleepFrames = 0;
}

function isFruitSupported(ball) {
  if (ball.y + ball.radius >= GAME_HEIGHT - 1.5) {
    return true;
  }

  let supportCount = 0;

  for (const other of balls) {
    if (other === ball) continue;

    const dx = other.x - ball.x;
    const dy = other.y - ball.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    const supportDistance = (ball.radius + other.radius) * 0.95;
    const isBelow = other.y > ball.y + ball.radius * 0.10;
    const isCloseEnough = distance < supportDistance;
    const otherStable = other.asleep || getFruitSpeed(other) < 0.18;

    if (isBelow && isCloseEnough && otherStable) {
      supportCount += 1;
    }
  }

  return supportCount >= 1;
}

function updateSleepStates() {
  for (const ball of balls) {
    if (ball.asleep) continue;
    if (ball.age < 32) continue;
    if (ball.popFrames > 0) continue;

    const speed = getFruitSpeed(ball);
    const stable = speed < sleepSpeedLimit;
    const supported = isFruitSupported(ball);

    if (stable && supported) {
      ball.sleepFrames += 1;
      ball.vx *= 0.45;
      ball.vy *= 0.45;

      if (Math.abs(ball.vx) < 0.035) ball.vx = 0;
      if (Math.abs(ball.vy) < 0.06) ball.vy = 0;
    } else {
      ball.sleepFrames = Math.max(0, ball.sleepFrames - 1);
    }

    if (ball.sleepFrames > sleepFramesRequired) {
      ball.asleep = true;
      ball.sleepFrames = sleepFramesRequired;
      ball.vx = 0;
      ball.vy = 0;

      if (ball.y + ball.radius > GAME_HEIGHT) {
        ball.y = GAME_HEIGHT - ball.radius;
      }
    }
  }
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
  mouseX = GAME_WIDTH / 2;
  screenShake = 0;

  setText(scoreElement, score);
  setText(panelScoreElement, score);
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
  updateEvolutionCircle();
  renderLeaderboard();
}

function updateNextFruit() {
  if (!nextQueue.length) return;

  const nextLevel = nextQueue[0];
  const fruit = fruits[nextLevel];

  setText(nextFruitNameElement, fruit.name);

  nextFruitCanvases.forEach((nextCanvas, index) => {
    const nextCtx = nextFruitContexts[index];
    if (!nextCtx) return;

    const level = nextQueue[index] ?? nextQueue[0];
    const size = index === 0 ? 28 : 19;

    nextCtx.clearRect(0, 0, nextCanvas.width, nextCanvas.height);
    drawFruitIcon(nextCtx, nextCanvas.width / 2, nextCanvas.height / 2, size, level, false);
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
      leaderboardList.innerHTML = `<div class="leaderboard-empty">No local runs yet.</div>`;
    } else {
      leaderboardList.innerHTML = list.slice(0, 3).map((item, index) => createLeaderboardRow(item, index)).join("");
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
        <span>${formatTime(item.time || 0)}</span>
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

  ctx.clearRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

  ctx.fillStyle = "rgba(255, 247, 191, 0.12)";
  ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

  ctx.fillStyle = "rgba(139, 238, 109, 0.12)";
  ctx.fillRect(0, GAME_HEIGHT - 76, GAME_WIDTH, 76);

  const warningAlpha = dangerActive
    ? 0.12 + dangerRatio * 0.26 + pulse * 0.06
    : 0.02 + dangerRatio * 0.10;

  ctx.fillStyle = `rgba(255, 92, 68, ${warningAlpha})`;
  ctx.fillRect(0, 0, GAME_WIDTH, dropLineY);

  ctx.strokeStyle = dangerActive
    ? `rgba(255, 76, 61, ${0.7 + pulse * 0.3})`
    : "rgba(255, 213, 91, 0.72)";

  ctx.lineWidth = dangerActive ? 4 + pulse * 1.2 : 3;
  ctx.setLineDash([8, 8]);

  ctx.beginPath();
  ctx.moveTo(0, dropLineY);
  ctx.lineTo(GAME_WIDTH, dropLineY);
  ctx.stroke();

  ctx.setLineDash([]);

  ctx.fillStyle = dangerActive ? "#ff4c3d" : "#b66e1f";
  ctx.font = dangerActive ? "bold 14px Arial" : "bold 13px Arial";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText(dangerActive ? "Warning!" : "Danger Line", 12, dropLineY - 14);

  ctx.textAlign = "right";
  ctx.fillText(getStageName(), GAME_WIDTH - 12, dropLineY - 14);

  if (dangerActive && !isGameOver) {
    drawDangerCountdown(dangerRatio);
  }
}

function drawDangerCountdown(dangerRatio) {
  let number = 3;

  if (dangerRatio > 0.66) number = 1;
  else if (dangerRatio > 0.5) number = 2;

  ctx.save();
  ctx.globalAlpha = 0.16 + dangerRatio * 0.34;
  ctx.fillStyle = "#ff4c3d";
  ctx.font = "bold 76px Arial";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(String(number), GAME_WIDTH / 2, dropLineY + 72);
  ctx.restore();
}

function drawAimLine() {
  if (!isGameStarted || isGameOver || !currentFruit) return;

  ctx.save();
  ctx.strokeStyle = "rgba(255, 213, 91, 0.55)";
  ctx.lineWidth = 2;
  ctx.setLineDash([6, 8]);

  ctx.beginPath();
  ctx.moveTo(mouseX, spawnY + currentFruit.radius + 8);
  ctx.lineTo(mouseX, GAME_HEIGHT - 10);
  ctx.stroke();

  ctx.setLineDash([]);
  ctx.restore();
}

function drawFruit(ball) {
  let scale = 1;

  if (ball.popFrames > 0) {
    scale = 1 + ball.popFrames / 130;
  }

  drawFruitIcon(ctx, ball.x, ball.y, ball.radius * scale, ball.level, true);
}

function drawFruitIcon(targetCtx, x, y, radius, level, showShadow = true) {
  const fruit = fruits[level];
  let record = fruitImages.get(level);

  if (!record || !record.loaded || !record.image) {
    for (let i = level - 1; i >= 0; i--) {
      const fallback = fruitImages.get(i);
      if (fallback && fallback.loaded && fallback.image) {
        record = fallback;
        break;
      }
    }
  }

  const isMainCanvas = targetCtx === ctx;
  const canvasW = isMainCanvas ? GAME_WIDTH : targetCtx.canvas.width;
  const canvasH = isMainCanvas ? GAME_HEIGHT : targetCtx.canvas.height;

  let visualSize = Math.round(radius * 2 * (fruit.visualScale || 1));

  if (!showShadow) {
    const maxPreviewSize = Math.floor(Math.min(canvasW, canvasH) * 0.86);
    visualSize = Math.min(visualSize, maxPreviewSize);
  }

  let drawX = Math.round(x - visualSize / 2 + (fruit.drawOffsetX || 0));
  let drawY = Math.round(y - visualSize / 2 + (fruit.drawOffsetY || 0));

  const padding = showShadow ? 4 : 1;

  if (drawX < padding) drawX = padding;
  if (drawX + visualSize > canvasW - padding) drawX = canvasW - padding - visualSize;
  if (drawY < padding) drawY = padding;
  if (drawY + visualSize > canvasH - padding) drawY = canvasH - padding - visualSize;

  if (showShadow) {
    targetCtx.save();
    targetCtx.globalAlpha = 0.02;
    targetCtx.fillStyle = "#9acb3b";
    targetCtx.beginPath();
    targetCtx.ellipse(
      Math.round(x),
      Math.round(y + radius * 0.68),
      Math.round(radius * 0.38),
      Math.max(2, Math.round(radius * 0.05)),
      0,
      0,
      Math.PI * 2
    );
    targetCtx.fill();
    targetCtx.restore();
  }

  if (record && record.loaded && record.image) {
    targetCtx.drawImage(record.image, drawX, drawY, visualSize, visualSize);
    return;
  }

  targetCtx.save();
  targetCtx.globalAlpha = 0.35;
  targetCtx.fillStyle = fruit.color || "#cccccc";
  targetCtx.beginPath();
  targetCtx.arc(Math.round(x), Math.round(y), Math.max(6, radius * 0.5), 0, Math.PI * 2);
  targetCtx.fill();
  targetCtx.restore();
}

function keepFruitInside(ball) {
  if (ball.x - ball.radius < 0) {
    ball.x = ball.radius;
    ball.vx = 0;
  }

  if (ball.x + ball.radius > GAME_WIDTH) {
    ball.x = GAME_WIDTH - ball.radius;
    ball.vx = 0;
  }

  if (ball.y + ball.radius > GAME_HEIGHT) {
    ball.y = GAME_HEIGHT - ball.radius;

    if (ball.vy > 0) {
      ball.vy = 0;
    }

    ball.vx *= floorFriction;

    if (Math.abs(ball.vx) < 0.025) {
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

    if (ball.asleep) {
      ball.vx = 0;
      ball.vy = 0;
      continue;
    }

    ball.vy += gravity;
    ball.x += ball.vx;
    ball.y += ball.vy;

    ball.vx *= friction;

    if (Math.abs(ball.vx) < 0.008) ball.vx = 0;
    if (Math.abs(ball.vy) < 0.008) ball.vy = 0;

    ball.vx = clamp(ball.vx, -maxHorizontalSpeed, maxHorizontalSpeed);
    ball.vy = clamp(ball.vy, -1.0, maxVerticalSpeed);

    keepFruitInside(ball);
  }

  updateEffects();
  handleCollisions();
  updateSleepStates();
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

        if (distance >= minDistance) continue;

        const overlap = minDistance - distance;
        if (overlap < collisionSlop) continue;

        const nx = dx / distance;
        const ny = dy / distance;
        const effectiveOverlap = overlap - collisionSlop;

        const aSpeed = getFruitSpeed(a);
        const bSpeed = getFruitSpeed(b);
        const totalSpeed = aSpeed + bSpeed;

        if (totalSpeed > wakeSpeedThreshold) {
          if (!a.asleep || bSpeed > wakeSpeedThreshold) wakeFruit(a);
          if (!b.asleep || aSpeed > wakeSpeedThreshold) wakeFruit(b);
        }

        const massA = a.radius * a.radius;
        const massB = b.radius * b.radius;
        const totalMass = massA + massB;

        let moveA = a.asleep ? 0 : massB / totalMass;
        let moveB = b.asleep ? 0 : massA / totalMass;

        if (a.asleep && !b.asleep) {
          moveA = 0;
          moveB = 1;
        }

        if (b.asleep && !a.asleep) {
          moveA = 1;
          moveB = 0;
        }

        if (a.asleep && b.asleep) continue;

        const moveTotal = moveA + moveB || 1;
        const correctionAmount = Math.min(
          effectiveOverlap * collisionCorrection,
          maxCorrectionPerFrame
        );

        const correctionX = nx * correctionAmount;
        const correctionY = ny * correctionAmount * verticalCorrectionFactor;

        a.x -= correctionX * (moveA / moveTotal);
        b.x += correctionX * (moveB / moveTotal);
        a.y -= correctionY * (moveA / moveTotal);
        b.y += correctionY * (moveB / moveTotal);

        const relativeVx = b.vx - a.vx;
        const relativeVy = b.vy - a.vy;
        const velocityAlongNormal = relativeVx * nx + relativeVy * ny;

        if (velocityAlongNormal < -0.18) {
          const impulse = -velocityAlongNormal;
          const impulseStrength = Math.min(impulse * 0.006, 0.035);

          if (!a.asleep) {
            a.vx -= nx * impulseStrength * moveA;
            a.vy -= ny * impulseStrength * moveA * 0.025;
          }

          if (!b.asleep) {
            b.vx += nx * impulseStrength * moveB;
            b.vy += ny * impulseStrength * moveB * 0.025;
          }
        }

        if (!a.asleep) {
          a.vx *= 0.54;
          a.vy *= 0.92;
        }

        if (!b.asleep) {
          b.vx *= 0.54;
          b.vy *= 0.92;
        }

        if (a.y + a.radius > GAME_HEIGHT - 6) {
          a.vx *= floorFriction;
          if (Math.abs(a.vx) < 0.03) a.vx = 0;
          if (Math.abs(a.vy) < 0.08) a.vy = 0;
        }

        if (b.y + b.radius > GAME_HEIGHT - 6) {
          b.vx *= floorFriction;
          if (Math.abs(b.vx) < 0.03) b.vx = 0;
          if (Math.abs(b.vy) < 0.08) b.vy = 0;
        }

        a.vx = clamp(a.vx, -maxHorizontalSpeed, maxHorizontalSpeed);
        b.vx = clamp(b.vx, -maxHorizontalSpeed, maxHorizontalSpeed);
        a.vy = clamp(a.vy, -1.0, maxVerticalSpeed);
        b.vy = clamp(b.vy, -1.0, maxVerticalSpeed);

        keepFruitInside(a);
        keepFruitInside(b);
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

  newFruit.vx = (a.vx + b.vx) * 0.03;
  newFruit.vy = Math.min((a.vy + b.vy) * 0.03, 0.06);
  newFruit.popFrames = 8;

  balls.splice(indexB, 1);
  balls.splice(indexA, 1);
  balls.push(newFruit);

  score += gainedScore;
  setText(scoreElement, score);
  setText(panelScoreElement, score);

  if (newLevel > highestUnlocked) {
    highestUnlocked = newLevel;
    localStorage.setItem("fruitMergeHighestUnlocked", highestUnlocked);
  }

  updateEvolutionCircle(newLevel);
  addFloatingText(newFruit.x, newFruit.y - newFruit.radius, `+${gainedScore}`);
  addMergeBurst(newFruit.x, newFruit.y, newFruit.radius, fruits[newLevel].color);

  playMergeSound(newLevel);

  if (newLevel >= 7) {
    addFloatingText(newFruit.x, newFruit.y - newFruit.radius - 24, "Cool Merge!");
    screenShake = 2;
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
  for (let i = 0; i < 8; i++) {
    const angle = (Math.PI * 2 / 8) * i;

    mergeBursts.push({
      x,
      y,
      vx: Math.cos(angle) * (0.60 + radius * 0.004),
      vy: Math.sin(angle) * (0.60 + radius * 0.004),
      radius: Math.max(2, radius * 0.034),
      color,
      life: 18,
      alpha: 0.68
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
    burst.alpha = Math.max(0, burst.life / 18);
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
    ctx.fillStyle = "#fff6b8";
    ctx.strokeStyle = "#9b5b1c";
    ctx.lineWidth = 3;
    ctx.font = "bold 18px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.strokeText(text.text, text.x, text.y);
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
  fruit.asleep = false;
  fruit.sleepFrames = 0;

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
  const scaleX = GAME_WIDTH / rect.width;

  mouseX = (clientX - rect.left) * scaleX;

  const radius = currentFruit ? currentFruit.radius : 24;
  const margin = 8;

  mouseX = Math.max(
    radius + margin,
    Math.min(GAME_WIDTH - radius - margin, mouseX)
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
setupEvolutionCircle();
preloadFruitImages();
setupRound(true);
gameLoop();
/* === Audio + Clean Canvas Background Upgrade === */

const musicToggleButton = document.getElementById("musicToggleButton");

let backgroundMusicEnabled = localStorage.getItem("fruitMergeMusic") !== "off";
let backgroundMusicTimer = null;
let backgroundMusicStep = 0;

function updateMusicButtonState() {
  if (!musicToggleButton) return;

  musicToggleButton.textContent = backgroundMusicEnabled ? "♪" : "♪";
  musicToggleButton.classList.toggle("music-off", !backgroundMusicEnabled);
  musicToggleButton.title = backgroundMusicEnabled ? "Music On" : "Music Off";
}

function playSoftMusicTone(frequency, duration, delay = 0, volume = 0.012) {
  if (!audioContext) return;

  const startTime = audioContext.currentTime + delay;

  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();

  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime(frequency, startTime);

  gain.gain.setValueAtTime(0.0001, startTime);
  gain.gain.exponentialRampToValueAtTime(volume, startTime + 0.04);
  gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

  oscillator.connect(gain);
  gain.connect(audioContext.destination);

  oscillator.start(startTime);
  oscillator.stop(startTime + duration + 0.04);
}

function playBackgroundMusicStep() {
  if (!backgroundMusicEnabled || !audioContext) return;

  const melody = [392, 440, 523.25, 440, 329.63, 392, 493.88, 392];
  const bass = [196, 220, 261.63, 220];

  const note = melody[backgroundMusicStep % melody.length];
  const bassNote = bass[Math.floor(backgroundMusicStep / 2) % bass.length];

  playSoftMusicTone(note, 0.42, 0, 0.010);
  playSoftMusicTone(bassNote, 0.55, 0.02, 0.006);

  backgroundMusicStep += 1;
}

function startBackgroundMusic() {
  if (!backgroundMusicEnabled) return;

  initAudio();

  if (!audioContext) return;

  if (audioContext.state === "suspended") {
    audioContext.resume().catch(() => {});
  }

  if (backgroundMusicTimer) return;

  playBackgroundMusicStep();

  backgroundMusicTimer = setInterval(() => {
    playBackgroundMusicStep();
  }, 680);
}

function stopBackgroundMusic() {
  if (backgroundMusicTimer) {
    clearInterval(backgroundMusicTimer);
    backgroundMusicTimer = null;
  }
}

function toggleBackgroundMusic() {
  backgroundMusicEnabled = !backgroundMusicEnabled;
  localStorage.setItem("fruitMergeMusic", backgroundMusicEnabled ? "on" : "off");

  if (backgroundMusicEnabled) {
    startBackgroundMusic();
  } else {
    stopBackgroundMusic();
  }

  updateMusicButtonState();
}

if (musicToggleButton) {
  musicToggleButton.addEventListener("click", () => {
    initAudio();
    toggleBackgroundMusic();
  });
}

[startButton, restartButton, playAgainButton, canvas].forEach((element) => {
  if (!element) return;

  element.addEventListener("pointerdown", () => {
    if (backgroundMusicEnabled) {
      startBackgroundMusic();
    }
  });
});

document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    stopBackgroundMusic();
  } else if (backgroundMusicEnabled && isGameStarted && !isGameOver) {
    startBackgroundMusic();
  }
});

updateMusicButtonState();

/*
  Override drop sound:
  More responsive click/drop feedback for desktop and mobile.
*/
function playDropSound() {
  if (!audioContext) return;

  playTone(620, 0.035, "triangle", 0.045);

  setTimeout(() => {
    playTone(320, 0.045, "sine", 0.026);
  }, 28);
}

/*
  Override merge sound:
  Softer, cleaner, less harsh.
*/
function playMergeSound(level) {
  const frequency = 460 + level * 38;

  playTone(frequency, 0.06, "sine", 0.040);

  setTimeout(() => {
    playTone(frequency * 1.24, 0.08, "triangle", 0.024);
  }, 42);
}

/*
  Override game background:
  Cleaner and higher contrast.
  Text no longer overlaps with a noisy yellow background.
*/
function drawBackground() {
  const dangerRatio = getMaxDangerRatio();
  const time = performance.now();
  const pulse = 0.5 + Math.sin(time / 120) * 0.5;
  const dangerActive = dangerRatio > 0.35;

  ctx.clearRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

  const bg = ctx.createLinearGradient(0, 0, 0, GAME_HEIGHT);
  bg.addColorStop(0, "#f7fffb");
  bg.addColorStop(0.42, "#effbf8");
  bg.addColorStop(1, "#e6f7f1");

  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

  ctx.fillStyle = "rgba(143, 219, 172, 0.15)";
  ctx.fillRect(0, GAME_HEIGHT - 72, GAME_WIDTH, 72);

  const topAlpha = dangerActive
    ? 0.12 + dangerRatio * 0.24 + pulse * 0.06
    : 0.045;

  ctx.fillStyle = `rgba(255, 112, 88, ${topAlpha})`;
  ctx.fillRect(0, 0, GAME_WIDTH, dropLineY);

  ctx.strokeStyle = dangerActive
    ? `rgba(255, 80, 65, ${0.78 + pulse * 0.22})`
    : "rgba(29, 190, 170, 0.86)";

  ctx.lineWidth = dangerActive ? 4 + pulse * 1.1 : 3;
  ctx.setLineDash([8, 8]);

  ctx.beginPath();
  ctx.moveTo(0, dropLineY);
  ctx.lineTo(GAME_WIDTH, dropLineY);
  ctx.stroke();

  ctx.setLineDash([]);

  drawCanvasLabel(
    dangerActive ? "Warning!" : "Danger Line",
    12,
    dropLineY - 18,
    "left",
    dangerActive
  );

  drawCanvasLabel(
    getStageName(),
    GAME_WIDTH - 12,
    dropLineY - 18,
    "right",
    dangerActive
  );

  if (dangerActive && !isGameOver) {
    drawDangerCountdown(dangerRatio);
  }
}

function drawCanvasLabel(text, x, y, align = "left", danger = false) {
  ctx.save();

  ctx.font = "bold 13px Arial";
  ctx.textBaseline = "middle";

  const textWidth = ctx.measureText(text).width;
  const paddingX = 8;
  const boxWidth = textWidth + paddingX * 2;
  const boxHeight = 22;

  let boxX = x;

  if (align === "right") {
    boxX = x - boxWidth;
    ctx.textAlign = "right";
  } else {
    ctx.textAlign = "left";
  }

  ctx.fillStyle = danger
    ? "rgba(255, 255, 255, 0.92)"
    : "rgba(255, 255, 255, 0.82)";

  ctx.fillRect(boxX, y - boxHeight / 2, boxWidth, boxHeight);

  ctx.fillStyle = danger ? "#ff4c3d" : "#078c83";

  if (align === "right") {
    ctx.fillText(text, x - paddingX, y);
  } else {
    ctx.fillText(text, x + paddingX, y);
  }

  ctx.restore();
}
