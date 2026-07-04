const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const nextFruitCanvasIds = [
  "nextFruitCanvas",
  "nextFruitCanvas0",
  "nextFruitCanvas1",
  "nextFruitCanvas2"
];

const nextFruitCanvases = Array.from(
  new Set(
    nextFruitCanvasIds
      .map((id) => document.getElementById(id))
      .filter(Boolean)
  )
);

const nextFruitContexts = nextFruitCanvases.map((item) => item.getContext("2d"));

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

const ASSET_BASE = "/assets/fruits/";
const ASSET_VERSION = "v=20260704-trimmed-fruits-final";

const fruits = [
  {
    name: "Cherry",
    radius: 16,
    score: 5,
    type: "cherry",
    asset: "cherry.png",
    color: "#e93652",
    emoji: "🍒",
    visualScale: 0.88
  },
  {
    name: "Strawberry",
    radius: 21,
    score: 10,
    type: "strawberry",
    asset: "strawberry.png",
    color: "#ef3f5c",
    emoji: "🍓",
    visualScale: 0.90
  },
  {
    name: "Grape",
    radius: 27,
    score: 20,
    type: "grape",
    asset: "grape.png",
    color: "#7650d6",
    emoji: "🍇",
    visualScale: 0.86
  },
  {
    name: "Orange",
    radius: 34,
    score: 40,
    type: "orange",
    asset: "orange.png",
    color: "#ff9f20",
    emoji: "🍊",
    visualScale: 0.92
  },
  {
    name: "Apple",
    radius: 42,
    score: 80,
    type: "apple",
    asset: "apple.png",
    color: "#e6384f",
    emoji: "🍎",
    visualScale: 0.89
  },
  {
    name: "Peach",
    radius: 51,
    score: 160,
    type: "peach",
    asset: "peach.png",
    color: "#ffb07f",
    emoji: "🍑",
    visualScale: 0.90
  },
  {
    name: "Pineapple",
    radius: 61,
    score: 320,
    type: "pineapple",
    asset: "pineapple.png",
    color: "#f0bd3a",
    emoji: "🍍",
    visualScale: 0.88
  },
  {
    name: "Watermelon",
    radius: 72,
    score: 640,
    type: "watermelon",
    asset: "watermelon.png",
    color: "#31bd69",
    emoji: "🍉",
    visualScale: 0.91
  },
  {
    name: "Mango",
    radius: 84,
    score: 1280,
    type: "mango",
    asset: "mango.png",
    color: "#ff9f22",
    emoji: "🥭",
    visualScale: 0.91
  },
  {
    name: "Melon",
    radius: 96,
    score: 2560,
    type: "melon",
    asset: "melon.png",
    color: "#9bd66c",
    emoji: "🍈",
    visualScale: 0.93
  },
  {
    name: "Dragon Fruit",
    radius: 110,
    score: 5120,
    type: "dragonfruit",
    asset: "dragonfruit.png",
    color: "#f04e98",
    emoji: "🐉",
    visualScale: 0.92
  }
];

const fruitImages = new Map();

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

const gravity = 0.62;
const friction = 0.9;
const floorFriction = 0.68;
const bounce = 0.04;

const dropLineY = 98;
const spawnY = 54;

const initialDropVelocity = 2.35;
const maxHorizontalSpeed = 0.72;
const maxVerticalSpeed = 7.6;

const collisionSolverIterations = 8;
const collisionRestitution = 0.015;
const collisionCorrection = 0.78;
const maxCorrectionPerFrame = 6.2;

const collisionTightness = 0.96;
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

function preloadFruitImages() {
  fruits.forEach((fruit, index) => {
    const image = new Image();
    image.decoding = "async";

    fruitImages.set(index, {
      image,
      canvas: null,
      loaded: false,
      failed: false
    });

    image.onload = () => {
      const trimmedCanvas = createTrimmedFruitCanvas(image);

      fruitImages.set(index, {
        image,
        canvas: trimmedCanvas,
        loaded: true,
        failed: false
      });

      updateNextFruit();
    };

    image.onerror = () => {
      fruitImages.set(index, {
        image: null,
        canvas: null,
        loaded: false,
        failed: true
      });

      updateNextFruit();
    };

    image.src = `${ASSET_BASE}${fruit.asset}?${ASSET_VERSION}`;
  });
}

function createTrimmedFruitCanvas(image) {
  const sourceCanvas = document.createElement("canvas");
  sourceCanvas.width = image.naturalWidth;
  sourceCanvas.height = image.naturalHeight;

  const sourceCtx = sourceCanvas.getContext("2d", {
    willReadFrequently: true
  });

  sourceCtx.drawImage(image, 0, 0);

  const width = sourceCanvas.width;
  const height = sourceCanvas.height;
  const imageData = sourceCtx.getImageData(0, 0, width, height);
  const data = imageData.data;

  let minX = width;
  let minY = height;
  let maxX = 0;
  let maxY = 0;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const alpha = data[(y * width + x) * 4 + 3];

      if (alpha > 12) {
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
  }

  if (minX > maxX || minY > maxY) {
    return sourceCanvas;
  }

  const padding = 6;

  minX = Math.max(0, minX - padding);
  minY = Math.max(0, minY - padding);
  maxX = Math.min(width - 1, maxX + padding);
  maxY = Math.min(height - 1, maxY + padding);

  const trimmedWidth = maxX - minX + 1;
  const trimmedHeight = maxY - minY + 1;

  const trimmedCanvas = document.createElement("canvas");
  trimmedCanvas.width = trimmedWidth;
  trimmedCanvas.height = trimmedHeight;

  const trimmedCtx = trimmedCanvas.getContext("2d");

  trimmedCtx.drawImage(
    sourceCanvas,
    minX,
    minY,
    trimmedWidth,
    trimmedHeight,
    0,
    0,
    trimmedWidth,
    trimmedHeight
  );

  return trimmedCanvas;
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

  if (stage === 0) return 58;
  if (stage === 1) return 44;
  if (stage === 2) return 34;
  return 26;
}

function getDropCooldown() {
  const stage = getDifficultyStage();

  if (stage === 0) return 330;
  if (stage === 1) return 300;
  if (stage === 2) return 270;
  return 240;
}

function randomStartLevel() {
  const stage = getDifficultyStage();
  const random = Math.random();

  if (stage === 0) {
    if (random < 0.18) return 0;
    if (random < 0.46) return 1;
    if (random < 0.74) return 2;
    return 3;
  }

  if (stage === 1) {
    if (random < 0.12) return 0;
    if (random < 0.32) return 1;
    if (random < 0.56) return 2;
    if (random < 0.78) return 3;
    if (random < 0.92) return 4;
    return 5;
  }

  if (stage === 2) {
    if (random < 0.12) return 2;
    if (random < 0.36) return 3;
    if (random < 0.62) return 4;
    if (random < 0.84) return 5;
    return 6;
  }

  if (random < 0.16) return 3;
  if (random < 0.40) return 4;
  if (random < 0.64) return 5;
  if (random < 0.84) return 6;
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
    const size = index === 0 ? 21 : index === 1 ? 18 : 16;

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

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const warningAlpha = 0.08 + dangerRatio * 0.3;

  ctx.fillStyle = "#ecfbff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = `rgba(255, 80, 60, ${warningAlpha})`;
  ctx.fillRect(0, 0, canvas.width, dropLineY);

  ctx.strokeStyle = dangerRatio > 0.35 ? "#ff4c3d" : "#18c7b8";
  ctx.lineWidth = dangerRatio > 0.35 ? 4 : 3;
  ctx.setLineDash([8, 8]);

  ctx.beginPath();
  ctx.moveTo(0, dropLineY);
  ctx.lineTo(canvas.width, dropLineY);
  ctx.stroke();

  ctx.setLineDash([]);

  ctx.fillStyle = dangerRatio > 0.35 ? "#ff4c3d" : "#00a99d";
  ctx.font = dangerRatio > 0.35 ? "bold 13px Arial" : "13px Arial";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText(dangerRatio > 0.35 ? "Danger!" : "Danger Line", 12, dropLineY - 14);

  ctx.textAlign = "right";
  ctx.fillText(getStageName(), canvas.width - 12, dropLineY - 14);

  if (dangerRatio > 0.35 && !isGameOver) {
    drawDangerCountdown(dangerRatio);
  }
}

function drawDangerCountdown(dangerRatio) {
  let number = 3;

  if (dangerRatio > 0.66) number = 1;
  else if (dangerRatio > 0.5) number = 2;

  ctx.save();
  ctx.globalAlpha = 0.18 + dangerRatio * 0.38;
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
  const imageRecord = fruitImages.get(level);

  targetCtx.save();
  targetCtx.translate(x, y);

  drawFruitShadow(targetCtx, radius);

  if (imageRecord && imageRecord.loaded && imageRecord.canvas) {
    drawImageFruit(targetCtx, imageRecord.canvas, radius, fruit);
  } else {
    drawFallbackFruit(targetCtx, radius, fruit);
  }

  targetCtx.restore();
}

function drawImageFruit(targetCtx, imageCanvas, radius, fruit) {
  const maxSize = radius * 2 * fruit.visualScale;
  const aspect = imageCanvas.width / imageCanvas.height;

  let drawWidth;
  let drawHeight;

  if (aspect >= 1) {
    drawWidth = maxSize;
    drawHeight = maxSize / aspect;
  } else {
    drawHeight = maxSize;
    drawWidth = maxSize * aspect;
  }

  targetCtx.drawImage(
    imageCanvas,
    -drawWidth / 2,
    -drawHeight / 2,
    drawWidth,
    drawHeight
  );
}

function drawFruitShadow(targetCtx, radius) {
  targetCtx.save();
  targetCtx.globalAlpha = 0.14;
  targetCtx.fillStyle = "#4ed0e0";
  targetCtx.beginPath();
  targetCtx.ellipse(
    0,
    radius * 0.86,
    radius * 0.56,
    radius * 0.11,
    0,
    0,
    Math.PI * 2
  );
  targetCtx.fill();
  targetCtx.restore();
}

function drawFallbackFruit(targetCtx, radius, fruit) {
  const gradient = targetCtx.createRadialGradient(
    -radius * 0.35,
    -radius * 0.35,
    radius * 0.05,
    0,
    0,
    radius
  );

  gradient.addColorStop(0, "#ffffff");
  gradient.addColorStop(0.35, fruit.color);
  gradient.addColorStop(1, shadeColor(fruit.color, -28));

  targetCtx.fillStyle = gradient;
  targetCtx.beginPath();
  targetCtx.arc(0, 0, radius * 0.9, 0, Math.PI * 2);
  targetCtx.fill();

  targetCtx.font = `${Math.max(14, radius * 0.9)}px Arial`;
  targetCtx.textAlign = "center";
  targetCtx.textBaseline = "middle";
  targetCtx.fillText(fruit.emoji, 0, 1);
}

function shadeColor(hex, percent) {
  const number = parseInt(hex.replace("#", ""), 16);
  const amount = Math.round(2.55 * percent);

  const red = Math.max(0, Math.min(255, (number >> 16) + amount));
  const green = Math.max(0, Math.min(255, ((number >> 8) & 0x00ff) + amount));
  const blue = Math.max(0, Math.min(255, (number & 0x0000ff) + amount));

  return `#${(0x1000000 + red * 0x10000 + green * 0x100 + blue)
    .toString(16)
    .slice(1)}`;
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

preloadFruitImages();
setupEvolutionBar();
setupRound(true);
gameLoop();
