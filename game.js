const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const GAME_WIDTH = Number(canvas.getAttribute("width")) || 420;
const GAME_HEIGHT = Number(canvas.getAttribute("height")) || 560;

function setupCanvasDpi() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);

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
const timeElement = document.getElementById("time");
const bestScoreElement = document.getElementById("bestScore");
const nextFruitNameElement = document.getElementById("nextFruitName");

const restartButton = document.getElementById("restartButton");
const startButton = document.getElementById("startButton");
const playAgainButton = document.getElementById("playAgainButton");
const shareScoreButton = document.getElementById("shareScoreButton");
const shareCurrentButton = document.getElementById("shareCurrentButton");
const musicToggleButton = document.getElementById("musicToggleButton");
const fullscreenButton = document.getElementById("fullscreenButton");

const startOverlay = document.getElementById("startOverlay");
const gameOverPanel = document.getElementById("gameOverPanel");
const gameOverBadge = document.getElementById("gameOverBadge");
const gameOverScore = document.getElementById("gameOverScore");
const gameOverTime = document.getElementById("gameOverTime");
const gameOverBest = document.getElementById("gameOverBest");
const gameOverTip = document.getElementById("gameOverTip");

const leaderboardList = document.getElementById("leaderboardList");
const evolutionBar = document.getElementById("evolutionBar");

const nextCanvases = [
  document.getElementById("nextFruitCanvas0"),
  document.getElementById("nextFruitCanvas1"),
  document.getElementById("nextFruitCanvas2")
].filter(Boolean);

const nextContexts = nextCanvases.map((item) => {
  const c = item.getContext("2d");
  c.imageSmoothingEnabled = true;
  c.imageSmoothingQuality = "high";
  return c;
});

const ASSET_VERSION = "v=20260706-clean-fruit-arcade-final";

const fruits = [
  { name: "Cherry", radius: 15, score: 5, type: "cherry", files: ["cherry.png"], color: "#ff4a42", visualScale: 1.4 },
  { name: "Strawberry", radius: 20, score: 10, type: "strawberry", files: ["strawberry.png"], color: "#ff5148", visualScale: 1.3 },
  { name: "Grape", radius: 25, score: 20, type: "grape", files: ["grape.png"], color: "#a65bff", visualScale: 1.18 },
  { name: "Orange", radius: 32, score: 40, type: "orange", files: ["orange.png"], color: "#ff9f2e", visualScale: 1.14 },
  { name: "Apple", radius: 39, score: 80, type: "apple", files: ["apple.png"], color: "#f64340", visualScale: 1.12 },
  { name: "Peach", radius: 48, score: 160, type: "peach", files: ["peach.png"], color: "#ff9872", visualScale: 1.1 },
  { name: "Pineapple", radius: 57, score: 320, type: "pineapple", files: ["pineapple.png"], color: "#ffc238", visualScale: 1.02 },
  { name: "Watermelon", radius: 68, score: 640, type: "watermelon", files: ["watermelon.png"], color: "#30c765", visualScale: 1.04 },
  { name: "Grapefruit", radius: 80, score: 1280, type: "grapefruit", files: ["grapefruit.png", "pomelo.png", "yuzu.png", "lemon.png"], color: "#ffe45b", visualScale: 1.02 },
  { name: "Melon", radius: 92, score: 2560, type: "melon", files: ["melon.png", "hami-melon.png", "honeydew.png", "cantaloupe.png"], color: "#d9e66d", visualScale: 1 },
  { name: "Dragon Fruit", radius: 106, score: 5120, type: "dragonfruit", files: ["dragonfruit.png", "dragon-fruit.png", "dragon_fruit.png", "pitaya.png"], color: "#ff5098", visualScale: 0.98 }
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

let isGameStarted = false;
let isGameOver = false;
let canDrop = true;
let gameStartTime = 0;
let survivalTime = 0;

let floatingTexts = [];
let mergeBursts = [];
let screenShake = 0;

let audioContext = null;
let soundReady = false;
let musicEnabled = localStorage.getItem("fruitMergeMusic") !== "off";
let musicTimer = null;
let musicStep = 0;

const gravity = 0.6;
const friction = 0.965;
const floorFriction = 0.94;

const dropLineY = 86;
const spawnY = 46;

const initialDropVelocity = 2.45;
const maxHorizontalSpeed = 0.28;
const maxVerticalSpeed = 7.2;

const collisionSolverIterations = 5;
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
  audioContext.resume().catch(() => {});
  soundReady = true;
}

function playTone(frequency, duration, type = "sine", volume = 0.04, delay = 0) {
  if (!audioContext) return;

  const startAt = audioContext.currentTime + delay;
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();

  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, startAt);

  gain.gain.setValueAtTime(0.0001, startAt);
  gain.gain.exponentialRampToValueAtTime(volume, startAt + 0.025);
  gain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);

  oscillator.connect(gain);
  gain.connect(audioContext.destination);

  oscillator.start(startAt);
  oscillator.stop(startAt + duration + 0.03);
}

function playDropSound() {
  playTone(620, 0.04, "triangle", 0.042);
  playTone(320, 0.06, "sine", 0.022, 0.03);
}

function playMergeSound(level) {
  const frequency = 460 + level * 38;
  playTone(frequency, 0.065, "sine", 0.04);
  playTone(frequency * 1.24, 0.08, "triangle", 0.024, 0.04);
}

function playBigMergeSound() {
  playTone(640, 0.08, "sine", 0.045);
  playTone(850, 0.12, "sine", 0.034, 0.07);
}

function playGameOverSound() {
  playTone(240, 0.14, "sawtooth", 0.025);
  playTone(160, 0.18, "sawtooth", 0.018, 0.12);
}

function startMusic() {
  if (!musicEnabled) return;
  initAudio();
  if (!audioContext) return;
  if (musicTimer) return;

  const melody = [392, 440, 523.25, 440, 329.63, 392, 493.88, 392];
  const bass = [196, 220, 261.63, 220];

  musicTimer = setInterval(() => {
    if (!musicEnabled || !audioContext || document.hidden) return;

    const note = melody[musicStep % melody.length];
    const bassNote = bass[Math.floor(musicStep / 2) % bass.length];

    playTone(note, 0.42, "sine", 0.009);
    playTone(bassNote, 0.52, "sine", 0.005, 0.02);

    musicStep += 1;
  }, 680);
}

function stopMusic() {
  if (musicTimer) {
    clearInterval(musicTimer);
    musicTimer = null;
  }
}

function updateMusicButton() {
  if (!musicToggleButton) return;
  musicToggleButton.textContent = musicEnabled ? "Music On" : "Music Off";
  musicToggleButton.classList.toggle("music-off", !musicEnabled);
}

function toggleMusic() {
  musicEnabled = !musicEnabled;
  localStorage.setItem("fruitMergeMusic", musicEnabled ? "on" : "off");
  updateMusicButton();

  if (musicEnabled) {
    startMusic();
  } else {
    stopMusic();
  }
}

function vibrate(ms) {
  if (navigator.vibrate) navigator.vibrate(ms);
}

function loadFruitImage(index, fileIndex = 0) {
  const fruit = fruits[index];
  const file = fruit.files[fileIndex];

  if (!file) {
    fruitImages.set(index, { image: null, loaded: false, failed: true });
    return;
  }

  const image = new Image();

  fruitImages.set(index, { image, loaded: false, failed: false });

  image.onload = () => {
    fruitImages.set(index, { image, loaded: true, failed: false });
    updateNextFruit();
    updateEvolutionBar();
  };

  image.onerror = () => {
    loadFruitImage(index, fileIndex + 1);
  };

  image.src = `/assets/fruits/${file}?${ASSET_VERSION}`;
}

function preloadFruitImages() {
  fruits.forEach((_, index) => loadFruitImage(index));
}

function randomStartLevel() {
  const stage = getDifficultyStage();
  const random = Math.random();

  if (stage === 0) {
    if (random < 0.2) return 0;
    if (random < 0.45) return 1;
    if (random < 0.74) return 2;
    return 3;
  }

  if (stage === 1) {
    if (random < 0.08) return 0;
    if (random < 0.25) return 1;
    if (random < 0.5) return 2;
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
  if (ball.y + ball.radius >= GAME_HEIGHT - 1.5) return true;

  let supportCount = 0;

  for (const other of balls) {
    if (other === ball) continue;

    const dx = other.x - ball.x;
    const dy = other.y - ball.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    const supportDistance = (ball.radius + other.radius) * 0.95;
    const isBelow = other.y > ball.y + ball.radius * 0.1;
    const isClose = distance < supportDistance;
    const stable = other.asleep || getFruitSpeed(other) < 0.18;

    if (isBelow && isClose && stable) supportCount += 1;
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

function setupEvolutionBar() {
  if (!evolutionBar) return;

  evolutionBar.innerHTML = "";

  fruits.forEach((fruit, index) => {
    const item = document.createElement("div");
    item.className = "evolution-item";
    item.dataset.level = String(index);
    item.title = fruit.name;

    const img = document.createElement("img");
    img.alt = fruit.name;

    item.appendChild(img);
    evolutionBar.appendChild(item);
  });

  updateEvolutionBar();
}

function updateEvolutionBar(currentLevel = highestUnlocked) {
  if (!evolutionBar) return;

  const items = evolutionBar.querySelectorAll(".evolution-item");

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
  setText(timeElement, "00:00");
  setText(bestScoreElement, bestScore);

  hideElement(gameOverPanel);

  if (showStartScreen) {
    showElement(startOverlay);
  } else {
    hideElement(startOverlay);
    gameStartTime = performance.now();
    startMusic();
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
  setText(nextFruitNameElement, fruits[nextLevel].name);

  nextCanvases.forEach((nextCanvas, index) => {
    const nextCtx = nextContexts[index];
    const level = nextQueue[index] ?? nextQueue[0];
    const size = index === 0 ? 25 : 17;

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
  const total = Math.floor(seconds || 0);
  const min = String(Math.floor(total / 60)).padStart(2, "0");
  const sec = String(total % 60).padStart(2, "0");
  return `${min}:${sec}`;
}

function getRunTitle(value) {
  if (value >= 50000) return "Legend Run";
  if (value >= 35000) return "Strong Run";
  if (value >= 20000) return "Great Run";
  if (value >= 10000) return "Nice Run";
  return "Warm Up";
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

function addRunToLeaderboard() {
  if (!score && !survivalTime) return;

  const list = getLeaderboard();

  list.push({
    score,
    time: survivalTime,
    title: getRunTitle(score),
    date: new Date().toISOString()
  });

  list.sort((a, b) => {
    if ((b.score || 0) !== (a.score || 0)) return (b.score || 0) - (a.score || 0);
    return (a.time || 0) - (b.time || 0);
  });

  saveLeaderboard(list.slice(0, 8));
}

function renderLeaderboard() {
  if (!leaderboardList) return;

  const list = getLeaderboard().slice(0, 5);

  if (!list.length) {
    leaderboardList.innerHTML = `
      <div class="leaderboard-item">
        <div class="leaderboard-rank">1</div>
        <div class="leaderboard-main">
          <strong>No run yet</strong>
          <span>Start your first game</span>
        </div>
        <div class="leaderboard-score">0</div>
      </div>
    `;
    return;
  }

  leaderboardList.innerHTML = list.map((item, index) => `
    <div class="leaderboard-item">
      <div class="leaderboard-rank">${index + 1}</div>
      <div class="leaderboard-main">
        <strong>${item.title || getRunTitle(item.score || 0)}</strong>
        <span>${formatTime(item.time || 0)}</span>
      </div>
      <div class="leaderboard-score">${item.score || 0}</div>
    </div>
  `).join("");
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

  const bg = ctx.createLinearGradient(0, 0, 0, GAME_HEIGHT);
  bg.addColorStop(0, "#f7fffb");
  bg.addColorStop(0.44, "#edf9f6");
  bg.addColorStop(1, "#e3f6ef");

  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

  ctx.fillStyle = "rgba(143, 219, 172, 0.16)";
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

  drawCanvasLabel(dangerActive ? "Warning!" : "Danger Line", 12, dropLineY - 18, "left", dangerActive);
  drawCanvasLabel(getStageName(), GAME_WIDTH - 12, dropLineY - 18, "right", dangerActive);

  if (dangerActive && !isGameOver) {
    drawDangerCountdown(dangerRatio);
  }
}

function drawCanvasLabel(text, x, y, align = "left", danger = false) {
  ctx.save();

  ctx.font = "bold 13px Arial";
  ctx.textBaseline = "middle";

  const width = ctx.measureText(text).width;
  const paddingX = 8;
  const boxWidth = width + paddingX * 2;
  const boxHeight = 22;

  let boxX = x;

  if (align === "right") {
    boxX = x - boxWidth;
    ctx.textAlign = "right";
  } else {
    ctx.textAlign = "left";
  }

  ctx.fillStyle = danger ? "rgba(255,255,255,0.94)" : "rgba(255,255,255,0.84)";
  ctx.fillRect(boxX, y - boxHeight / 2, boxWidth, boxHeight);

  ctx.fillStyle = danger ? "#ff4c3d" : "#078c83";

  if (align === "right") {
    ctx.fillText(text, x - paddingX, y);
  } else {
    ctx.fillText(text, x + paddingX, y);
  }

  ctx.restore();
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
  ctx.strokeStyle = "rgba(255, 213, 91, 0.65)";
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

  let drawX = Math.round(x - visualSize / 2);
  let drawY = Math.round(y - visualSize / 2);

  const padding = showShadow ? 4 : 1;

  if (drawX < padding) drawX = padding;
  if (drawX + visualSize > canvasW - padding) drawX = canvasW - padding - visualSize;
  if (drawY < padding) drawY = padding;
  if (drawY + visualSize > canvasH - padding) drawY = canvasH - padding - visualSize;

  if (showShadow) {
    targetCtx.save();
    targetCtx.globalAlpha = 0.025;
    targetCtx.fillStyle = "#0ea5a2";
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

    if (ball.vy > 0) ball.vy = 0;

    ball.vx *= floorFriction;

    if (Math.abs(ball.vx) < 0.025) ball.vx = 0;
  }
}

function updatePhysics() {
  if (isGameOver || !isGameStarted) return;

  updateSurvivalTime();

  for (const ball of balls) {
    ball.age += 1;

    if (ball.popFrames > 0) ball.popFrames -= 1;

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

  const newFruit = createFruit((a.x + b.x) / 2, (a.y + b.y) / 2, newLevel);

  newFruit.vx = (a.vx + b.vx) * 0.03;
  newFruit.vy = Math.min((a.vy + b.vy) * 0.03, 0.06);
  newFruit.popFrames = 8;

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
  floatingTexts.push({ x, y, text, life: 42, alpha: 1 });
}

function addMergeBurst(x, y, radius, color) {
  for (let i = 0; i < 8; i++) {
    const angle = (Math.PI * 2 / 8) * i;

    mergeBursts.push({
      x,
      y,
      vx: Math.cos(angle) * (0.6 + radius * 0.004),
      vy: Math.sin(angle) * (0.6 + radius * 0.004),
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

  if (screenShake > 0) screenShake -= 1;
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
    ctx.fillStyle = "#0f766e";
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

  if (score > bestScore) {
    bestScore = score;
    localStorage.setItem("fruitMergeBestScore", bestScore);
  }

  if (survivalTime > bestTime) {
    bestTime = survivalTime;
    localStorage.setItem("fruitMergeBestTime", bestTime);
  }

  addRunToLeaderboard();
  renderLeaderboard();

  setText(bestScoreElement, bestScore);
  setText(gameOverBadge, getRunTitle(score));
  setText(gameOverScore, score);
  setText(gameOverTime, formatTime(survivalTime));
  setText(gameOverBest, bestScore);

  const gap = Math.max(0, bestScore - score);

  if (score > oldBest) {
    setText(gameOverTip, `New personal best! You beat your record by ${score - oldBest} points.`);
  } else if (gap > 0) {
    setText(gameOverTip, `Only ${gap} points away from your best score.`);
  } else {
    setText(gameOverTip, "Great run! Keep merging to beat your best score.");
  }

  showElement(gameOverPanel);
  stopMusic();
  playGameOverSound();
  vibrate(60);
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
  startMusic();

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
  const scaleX = GAME_WIDTH / rect.width;

  mouseX = (clientX - rect.left) * scaleX;

  const radius = currentFruit ? currentFruit.radius : 24;
  const margin = 8;

  mouseX = Math.max(radius + margin, Math.min(GAME_WIDTH - radius - margin, mouseX));
}

function shareScore() {
  const text = `I scored ${score || 0} in Fruit Merge Online! Can you beat me? https://fruitmerge.online`;

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
      alert("Score copied!");
    }).catch(() => {
      alert(text);
    });
  } else {
    alert(text);
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

startButton?.addEventListener("click", () => {
  initAudio();
  setupRound(false);
});

restartButton?.addEventListener("click", () => {
  initAudio();
  setupRound(false);
});

playAgainButton?.addEventListener("click", () => {
  initAudio();
  setupRound(false);
});

shareScoreButton?.addEventListener("click", shareScore);
shareCurrentButton?.addEventListener("click", shareScore);

musicToggleButton?.addEventListener("click", () => {
  initAudio();
  toggleMusic();
});

fullscreenButton?.addEventListener("click", () => {
  const target = document.querySelector(".game-shell") || document.documentElement;

  if (!document.fullscreenElement) {
    target.requestFullscreen?.();
  } else {
    document.exitFullscreen?.();
  }
});

document.addEventListener("visibilitychange", () => {
  if (document.hidden) stopMusic();
  else if (musicEnabled && isGameStarted && !isGameOver) startMusic();
});

updateMusicButton();
preloadFruitImages();
setupEvolutionBar();
setupRound(true);
gameLoop();
/* =========================================================
   Cover Start Screen
   类似小游戏站封面：封面图 + 暗色蒙版 + PLAY NOW
   ========================================================= */

.cover-start-screen {
  inset: 6px !important;
  z-index: 30;
  display: grid !important;
  place-items: center;
  padding: 0 !important;
  overflow: hidden;
  border-radius: 14px 14px 18px 18px;
  background: #14171f !important;
  backdrop-filter: none !important;
}

.cover-art {
  position: absolute;
  inset: 0;
  overflow: hidden;
  background:
    radial-gradient(circle at 28% 18%, rgba(255,255,255,0.22), transparent 22%),
    radial-gradient(circle at 70% 18%, rgba(255,255,255,0.16), transparent 22%),
    linear-gradient(180deg, #ffe17d 0%, #ffbd54 42%, #ff8b58 100%);
}

.cover-art::before {
  content: "";
  position: absolute;
  inset: 0;
  background:
    linear-gradient(180deg, rgba(255,255,255,0.18), transparent 35%),
    radial-gradient(circle at center, transparent 0 30%, rgba(86, 46, 13, 0.22) 100%);
}

.cover-fruit-row {
  position: absolute;
  left: 50%;
  top: 6%;
  width: 110%;
  display: flex;
  justify-content: center;
  gap: 12px;
  transform: translateX(-50%);
  opacity: 0.98;
}

.cover-fruit-row img {
  width: 78px;
  height: 78px;
  object-fit: contain;
  filter: drop-shadow(0 8px 8px rgba(80, 42, 8, 0.26));
}

.cover-fruit-row img:nth-child(1) {
  transform: rotate(-10deg) translateY(4px);
}

.cover-fruit-row img:nth-child(2) {
  transform: rotate(8deg) translateY(-4px);
}

.cover-fruit-row img:nth-child(3) {
  transform: rotate(-5deg) translateY(2px);
}

.cover-fruit-row img:nth-child(4) {
  transform: rotate(10deg) translateY(8px);
}

.cover-title {
  position: absolute;
  left: 50%;
  top: 28%;
  width: 120%;
  transform: translateX(-50%) rotate(-2deg);
  text-align: center;
  font-family: "Trebuchet MS", "Segoe UI", Arial, sans-serif;
  line-height: 0.86;
  letter-spacing: -0.05em;
  text-shadow:
    0 8px 0 rgba(95, 49, 9, 0.22),
    0 14px 26px rgba(77, 35, 4, 0.30);
}

.cover-title span,
.cover-title strong {
  display: block;
  font-weight: 1000;
}

.cover-title span {
  color: #76db36;
  font-size: clamp(70px, 8vw, 128px);
  -webkit-text-stroke: 4px #5b3512;
}

.cover-title strong {
  color: #ffd33f;
  font-size: clamp(64px, 7.5vw, 116px);
  -webkit-text-stroke: 4px #5b3512;
}

.cover-fruit-bottom {
  position: absolute;
  left: 50%;
  bottom: 3%;
  width: 110%;
  display: flex;
  justify-content: center;
  align-items: end;
  gap: 4px;
  transform: translateX(-50%);
}

.cover-fruit-bottom img {
  width: 92px;
  height: 92px;
  object-fit: contain;
  filter: drop-shadow(0 10px 10px rgba(70, 35, 6, 0.28));
}

.cover-fruit-bottom img:nth-child(1) {
  width: 116px;
  height: 116px;
  transform: rotate(-7deg);
}

.cover-fruit-bottom img:nth-child(2) {
  width: 102px;
  height: 102px;
  transform: rotate(5deg) translateY(6px);
}

.cover-fruit-bottom img:nth-child(3) {
  width: 110px;
  height: 110px;
  transform: rotate(8deg);
}

.cover-mask {
  position: absolute;
  inset: 0;
  z-index: 2;
  background:
    radial-gradient(circle at center, rgba(0, 0, 0, 0.18), rgba(0, 0, 0, 0.52)),
    rgba(0, 0, 0, 0.25);
}

.cover-play-button {
  position: relative;
  z-index: 3;
  min-width: 164px;
  height: 56px;
  padding: 0 24px;
  border: 0;
  border-radius: 14px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: #fff;
  background: linear-gradient(180deg, #25d969 0%, #12b956 100%);
  box-shadow:
    0 16px 34px rgba(0, 0, 0, 0.26),
    inset 0 4px 10px rgba(255, 255, 255, 0.22);
  font-size: 20px;
  font-weight: 1000;
  letter-spacing: 0.01em;
  transition: transform 0.14s ease, box-shadow 0.14s ease, filter 0.14s ease;
}

.cover-play-button span {
  font-size: 20px;
  line-height: 1;
}

.cover-play-button:hover {
  transform: translateY(-2px) scale(1.03);
  filter: brightness(1.04);
  box-shadow:
    0 20px 38px rgba(0, 0, 0, 0.30),
    inset 0 4px 10px rgba(255, 255, 255, 0.28);
}

.cover-play-button:active {
  transform: scale(0.96);
}

/* mobile cover */
@media (max-width: 880px) {
  .cover-fruit-row {
    top: 5%;
    gap: 5px;
  }

  .cover-fruit-row img {
    width: 38px;
    height: 38px;
  }

  .cover-title {
    top: 29%;
  }

  .cover-title span {
    font-size: 48px;
    -webkit-text-stroke: 2px #5b3512;
  }

  .cover-title strong {
    font-size: 44px;
    -webkit-text-stroke: 2px #5b3512;
  }

  .cover-fruit-bottom {
    bottom: 4%;
    gap: 0;
  }

  .cover-fruit-bottom img {
    width: 42px;
    height: 42px;
  }

  .cover-fruit-bottom img:nth-child(1) {
    width: 52px;
    height: 52px;
  }

  .cover-fruit-bottom img:nth-child(2) {
    width: 46px;
    height: 46px;
  }

  .cover-fruit-bottom img:nth-child(3) {
    width: 48px;
    height: 48px;
  }

  .cover-play-button {
    min-width: 112px;
    height: 40px;
    padding: 0 15px;
    border-radius: 11px;
    font-size: 13px;
  }

  .cover-play-button span {
    font-size: 13px;
  }
}
