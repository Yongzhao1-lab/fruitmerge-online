const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const nextFruitCanvas = document.getElementById("nextFruitCanvas");
const nextCtx = nextFruitCanvas.getContext("2d");

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
const evolutionBar = document.getElementById("evolutionBar");

const fruits = [
  { name: "Cherry", radius: 16, score: 5, skin: "#e84545", core: "#ff6b6b", type: "cherry" },
  { name: "Strawberry", radius: 21, score: 10, skin: "#e83e5a", core: "#ff6b7f", type: "strawberry" },
  { name: "Grape", radius: 27, score: 20, skin: "#7b4bc7", core: "#a883e8", type: "grape" },
  { name: "Orange", radius: 34, score: 40, skin: "#ff9a1f", core: "#ffc65c", type: "orange" },
  { name: "Apple", radius: 42, score: 80, skin: "#e94f64", core: "#ff7b8a", type: "apple" },
  { name: "Peach", radius: 51, score: 160, skin: "#ff9b6a", core: "#ffc48f", type: "peach" },
  { name: "Pineapple", radius: 61, score: 320, skin: "#f0b93a", core: "#ffd66b", type: "pineapple" },
  { name: "Watermelon", radius: 72, score: 640, skin: "#2fbf71", core: "#f2505e", type: "watermelon" },
  { name: "Coconut", radius: 84, score: 1280, skin: "#8a5a3b", core: "#f7f0df", type: "coconut" },
  { name: "Melon", radius: 96, score: 2560, skin: "#8bd66b", core: "#c6ef84", type: "melon" },
  { name: "Dragon Fruit", radius: 110, score: 5120, skin: "#f04e98", core: "#fff4f9", type: "dragonfruit" }
];

let balls = [];
let currentFruit;
let nextFruitLevel;

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

const gravity = 0.31;
const friction = 0.94;
const bounce = 0.12;
const dropLineY = 98;
const spawnY = 54;

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
  if (stage === 0) return 50;
  if (stage === 1) return 42;
  if (stage === 2) return 34;
  return 26;
}

function getDropCooldown() {
  const stage = getDifficultyStage();
  if (stage === 0) return 420;
  if (stage === 1) return 380;
  if (stage === 2) return 340;
  return 300;
}

function randomStartLevel() {
  const stage = getDifficultyStage();
  const random = Math.random();

  if (stage === 0) {
    if (random < 0.30) return 0;
    if (random < 0.58) return 1;
    if (random < 0.82) return 2;
    return 3;
  }

  if (stage === 1) {
    if (random < 0.20) return 0;
    if (random < 0.40) return 1;
    if (random < 0.60) return 2;
    if (random < 0.78) return 3;
    if (random < 0.92) return 4;
    return 5;
  }

  if (stage === 2) {
    if (random < 0.18) return 2;
    if (random < 0.40) return 3;
    if (random < 0.62) return 4;
    if (random < 0.82) return 5;
    return 6;
  }

  if (random < 0.18) return 3;
  if (random < 0.40) return 4;
  if (random < 0.62) return 5;
  if (random < 0.82) return 6;
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

  scoreElement.textContent = score;
  timeElement.textContent = "00:00";
  bestScoreElement.textContent = bestScore;

  gameOverOverlay.classList.add("hidden");

  if (showStartScreen) {
    startOverlay.classList.remove("hidden");
  } else {
    startOverlay.classList.add("hidden");
    gameStartTime = performance.now();
  }

  nextFruitLevel = randomStartLevel();
  currentFruit = createFruit(mouseX, spawnY, randomStartLevel());

  updateNextFruit();
  updateEvolutionBar();
}

function updateNextFruit() {
  const fruit = fruits[nextFruitLevel];

  nextFruitNameElement.textContent = fruit.name;
  nextCtx.clearRect(0, 0, nextFruitCanvas.width, nextFruitCanvas.height);

  drawFruitIcon(
    nextCtx,
    nextFruitCanvas.width / 2,
    nextFruitCanvas.height / 2,
    18,
    nextFruitLevel
  );
}

function updateSurvivalTime() {
  if (!isGameStarted || isGameOver) return;

  survivalTime = (performance.now() - gameStartTime) / 1000;
  timeElement.textContent = formatTime(survivalTime);
}

function formatTime(seconds) {
  const total = Math.floor(seconds);
  const min = String(Math.floor(total / 60)).padStart(2, "0");
  const sec = String(total % 60).padStart(2, "0");
  return `${min}:${sec}`;
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

  const warningAlpha = 0.12 + dangerRatio * 0.28;

  ctx.fillStyle = "#fff3dc";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = `rgba(255, 80, 40, ${warningAlpha})`;
  ctx.fillRect(0, 0, canvas.width, dropLineY);

  ctx.strokeStyle = dangerRatio > 0.35 ? "#ff3b1f" : "#ff7a1a";
  ctx.lineWidth = dangerRatio > 0.35 ? 4 : 3;
  ctx.setLineDash([8, 8]);

  ctx.beginPath();
  ctx.moveTo(0, dropLineY);
  ctx.lineTo(canvas.width, dropLineY);
  ctx.stroke();

  ctx.setLineDash([]);

  ctx.fillStyle = dangerRatio > 0.35 ? "#ff3b1f" : "rgba(255, 122, 26, 0.82)";
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
  ctx.globalAlpha = 0.18 + dangerRatio * 0.4;
  ctx.fillStyle = "#ff3b1f";
  ctx.font = "bold 78px Arial";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(String(number), canvas.width / 2, dropLineY + 72);
  ctx.restore();
}

function drawAimLine() {
  if (!isGameStarted || isGameOver || !currentFruit) return;

  ctx.save();
  ctx.strokeStyle = "rgba(255, 122, 26, 0.45)";
  ctx.lineWidth = 2;
  ctx.setLineDash([6, 8]);

  ctx.beginPath();
  ctx.moveTo(mouseX, spawnY + currentFruit.radius + 8);
  ctx.lineTo(mouseX, canvas.height - 8);
  ctx.stroke();

  ctx.setLineDash([]);

  ctx.fillStyle = "rgba(255, 122, 26, 0.18)";
  ctx.beginPath();
  ctx.arc(mouseX, canvas.height - 16, 12, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function drawFruit(ball) {
  let scale = 1;

  if (ball.popFrames > 0) {
    scale = 1 + ball.popFrames / 80;
  }

  drawFruitIcon(ctx, ball.x, ball.y, ball.radius * scale, ball.level);
}

function drawFruitIcon(targetCtx, x, y, radius, level) {
  const fruit = fruits[level];

  targetCtx.save();

  targetCtx.beginPath();
  targetCtx.arc(x, y, radius, 0, Math.PI * 2);

  const gradient = targetCtx.createRadialGradient(
    x - radius * 0.35,
    y - radius * 0.35,
    radius * 0.1,
    x,
    y,
    radius
  );

  gradient.addColorStop(0, "#ffffff");
  gradient.addColorStop(0.18, fruit.core);
  gradient.addColorStop(1, fruit.skin);

  targetCtx.fillStyle = gradient;
  targetCtx.fill();

  targetCtx.strokeStyle = "#ffffff";
  targetCtx.lineWidth = Math.max(3, radius * 0.08);
  targetCtx.stroke();

  drawFruitDetails(targetCtx, x, y, radius, fruit.type);

  targetCtx.restore();
}

function drawFruitDetails(targetCtx, x, y, radius, type) {
  targetCtx.save();

  if (type === "cherry") {
    drawLeaf(targetCtx, x + radius * 0.2, y - radius * 0.75, radius * 0.22);
  }

  if (type === "strawberry") {
    drawLeaf(targetCtx, x, y - radius * 0.65, radius * 0.25);
    drawSeeds(targetCtx, x, y, radius, "#ffe7a3");
  }

  if (type === "grape") {
    targetCtx.fillStyle = "#6f42c1";
    const spots = [[0, -0.25], [-0.25, 0], [0.25, 0], [0, 0.25], [-0.18, 0.28], [0.18, 0.28]];

    for (const [sx, sy] of spots) {
      targetCtx.beginPath();
      targetCtx.arc(x + sx * radius, y + sy * radius, radius * 0.22, 0, Math.PI * 2);
      targetCtx.fill();
    }

    drawLeaf(targetCtx, x + radius * 0.18, y - radius * 0.68, radius * 0.2);
  }

  if (type === "orange") {
    targetCtx.strokeStyle = "rgba(255,255,255,0.6)";
    targetCtx.lineWidth = Math.max(1, radius * 0.04);

    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI * 2 / 6) * i;
      targetCtx.beginPath();
      targetCtx.moveTo(x, y);
      targetCtx.lineTo(x + Math.cos(angle) * radius * 0.65, y + Math.sin(angle) * radius * 0.65);
      targetCtx.stroke();
    }
  }

  if (type === "apple") {
    drawLeaf(targetCtx, x + radius * 0.18, y - radius * 0.72, radius * 0.25);
  }

  if (type === "peach") {
    drawLeaf(targetCtx, x + radius * 0.15, y - radius * 0.72, radius * 0.24);
    targetCtx.strokeStyle = "rgba(204,99,70,0.45)";
    targetCtx.lineWidth = Math.max(2, radius * 0.04);
    targetCtx.beginPath();
    targetCtx.moveTo(x + radius * 0.12, y - radius * 0.55);
    targetCtx.quadraticCurveTo(x - radius * 0.2, y, x + radius * 0.1, y + radius * 0.55);
    targetCtx.stroke();
  }

  if (type === "pineapple") {
    targetCtx.strokeStyle = "rgba(128,89,19,0.28)";
    targetCtx.lineWidth = Math.max(1, radius * 0.025);

    for (let i = -3; i <= 3; i++) {
      targetCtx.beginPath();
      targetCtx.moveTo(x - radius * 0.55, y + i * radius * 0.18);
      targetCtx.lineTo(x + radius * 0.55, y + (i + 2) * radius * 0.18);
      targetCtx.stroke();

      targetCtx.beginPath();
      targetCtx.moveTo(x + radius * 0.55, y + i * radius * 0.18);
      targetCtx.lineTo(x - radius * 0.55, y + (i + 2) * radius * 0.18);
      targetCtx.stroke();
    }

    drawLeaf(targetCtx, x, y - radius * 0.78, radius * 0.32);
  }

  if (type === "watermelon") {
    targetCtx.beginPath();
    targetCtx.arc(x, y, radius * 0.72, 0, Math.PI * 2);
    targetCtx.fillStyle = "#f2505e";
    targetCtx.fill();

    targetCtx.strokeStyle = "#f8ffd9";
    targetCtx.lineWidth = radius * 0.08;
    targetCtx.stroke();

    targetCtx.fillStyle = "#263238";

    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI * 2 / 6) * i;
      targetCtx.beginPath();
      targetCtx.ellipse(
        x + Math.cos(angle) * radius * 0.35,
        y + Math.sin(angle) * radius * 0.35,
        radius * 0.035,
        radius * 0.065,
        angle,
        0,
        Math.PI * 2
      );
      targetCtx.fill();
    }
  }

  if (type === "coconut") {
    targetCtx.beginPath();
    targetCtx.arc(x, y, radius * 0.65, 0, Math.PI * 2);
    targetCtx.fillStyle = "#f7f0df";
    targetCtx.fill();
  }

  if (type === "melon") {
    targetCtx.strokeStyle = "rgba(255,255,255,0.65)";
    targetCtx.lineWidth = Math.max(2, radius * 0.035);

    for (let i = -3; i <= 3; i++) {
      targetCtx.beginPath();
      targetCtx.moveTo(x + i * radius * 0.18, y - radius * 0.65);
      targetCtx.quadraticCurveTo(x, y, x - i * radius * 0.18, y + radius * 0.65);
      targetCtx.stroke();
    }
  }

  if (type === "dragonfruit") {
    targetCtx.beginPath();
    targetCtx.arc(x, y, radius * 0.68, 0, Math.PI * 2);
    targetCtx.fillStyle = "#fff4f9";
    targetCtx.fill();

    targetCtx.fillStyle = "#202020";

    for (let i = 0; i < 16; i++) {
      const angle = (Math.PI * 2 / 16) * i;
      const dist = radius * (0.18 + (i % 4) * 0.09);
      targetCtx.beginPath();
      targetCtx.arc(
        x + Math.cos(angle) * dist,
        y + Math.sin(angle) * dist,
        radius * 0.018,
        0,
        Math.PI * 2
      );
      targetCtx.fill();
    }

    drawLeaf(targetCtx, x - radius * 0.42, y + radius * 0.12, radius * 0.18);
    drawLeaf(targetCtx, x + radius * 0.42, y - radius * 0.1, radius * 0.18);
  }

  targetCtx.restore();
}

function drawSeeds(targetCtx, x, y, radius, color) {
  targetCtx.fillStyle = color;

  for (let i = -1; i <= 1; i++) {
    for (let j = -1; j <= 1; j++) {
      targetCtx.beginPath();
      targetCtx.arc(x + i * radius * 0.25, y + j * radius * 0.22, radius * 0.035, 0, Math.PI * 2);
      targetCtx.fill();
    }
  }
}

function drawLeaf(targetCtx, x, y, size) {
  targetCtx.save();
  targetCtx.fillStyle = "#6fbd44";
  targetCtx.beginPath();
  targetCtx.ellipse(x, y, size * 0.55, size, -0.7, 0, Math.PI * 2);
  targetCtx.fill();
  targetCtx.restore();
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
    ball.vx = clamp(ball.vx, -1.2, 1.2);

    if (ball.x - ball.radius < 0) {
      ball.x = ball.radius;
      ball.vx *= -bounce;
    }

    if (ball.x + ball.radius > canvas.width) {
      ball.x = canvas.width - ball.radius;
      ball.vx *= -bounce;
    }

    if (ball.y + ball.radius > canvas.height) {
      ball.y = canvas.height - ball.radius;
      ball.vy *= -bounce;
      ball.vx *= 0.85;

      if (Math.abs(ball.vy) < 0.5) {
        ball.vy = 0;
      }
    }

    ball.vy = clamp(ball.vy, -1.5, 4);
  }

  updateEffects();
  handleCollisions();
  checkGameOver();
}

function handleCollisions() {
  for (let i = 0; i < balls.length; i++) {
    for (let j = i + 1; j < balls.length; j++) {
      const a = balls[i];
      const b = balls[j];

      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const minDistance = a.radius + b.radius;

      if (distance > 0 && distance < minDistance) {
        if (a.level === b.level && a.level < fruits.length - 1 && distance < minDistance - 2) {
          mergeFruits(i, j, a, b);
          return;
        }

        const overlap = minDistance - distance;
        const nx = dx / distance;
        const ny = dy / distance;

        a.x -= nx * overlap * 0.18;
        a.y -= ny * overlap * 0.08;
        b.x += nx * overlap * 0.18;
        b.y += ny * overlap * 0.08;

        const push = 0.025;

        a.vx -= nx * push;
        b.vx += nx * push;

        a.vy -= ny * push * 0.25;
        b.vy += ny * push * 0.25;

        a.vx = clamp(a.vx, -1.2, 1.2);
        b.vx = clamp(b.vx, -1.2, 1.2);
        a.vy = clamp(a.vy, -1.5, 1.5);
        b.vy = clamp(b.vy, -1.5, 1.5);
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

  newFruit.vy = -1.2;
  newFruit.vx = (Math.random() - 0.5) * 0.5;
  newFruit.popFrames = 14;

  balls.splice(indexB, 1);
  balls.splice(indexA, 1);
  balls.push(newFruit);

  score += gainedScore;
  scoreElement.textContent = score;

  if (newLevel > highestUnlocked) {
    highestUnlocked = newLevel;
    localStorage.setItem("fruitMergeHighestUnlocked", highestUnlocked);
  }

  updateEvolutionBar(newLevel);
  addFloatingText(newFruit.x, newFruit.y - newFruit.radius, `+${gainedScore}`);
  addMergeBurst(newFruit.x, newFruit.y, newFruit.radius, fruits[newLevel].skin);

  if (newLevel >= 7) {
    addFloatingText(newFruit.x, newFruit.y - newFruit.radius - 24, "Great Merge!");
    screenShake = 6;
  }

  if (score > bestScore) {
    bestScore = score;
    localStorage.setItem("fruitMergeBestScore", bestScore);
    bestScoreElement.textContent = bestScore;
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
    ctx.fillStyle = "#ff7a1a";
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

  if (score > bestScore) {
    bestScore = score;
    localStorage.setItem("fruitMergeBestScore", bestScore);
  }

  if (survivalTime > bestTime) {
    bestTime = survivalTime;
    localStorage.setItem("fruitMergeBestTime", bestTime);
  }

  bestScoreElement.textContent = bestScore;
  finalScoreElement.textContent = score;
  finalTimeElement.textContent = formatTime(survivalTime);
  finalBestScoreElement.textContent = bestScore;

  if (score > oldBest) {
    gameOverMessageElement.textContent = `New Best! You beat your record by ${score - oldBest} points.`;
  } else if (survivalTime > oldBestTime) {
    gameOverMessageElement.textContent = `New survival record: ${formatTime(survivalTime)}!`;
  } else if (survivalTime >= 180) {
    gameOverMessageElement.textContent = "Expert run! You survived more than 3 minutes.";
  } else {
    gameOverMessageElement.textContent = `Only ${Math.max(0, bestScore - score)} points away from your best score.`;
  }

  gameOverOverlay.classList.remove("hidden");
}

function draw() {
  const shakeX = screenShake > 0 ? (Math.random() - 0.5) * screenShake : 0;
  const shakeY = screenShake > 0 ? (Math.random() - 0.5) * screenShake : 0;

  ctx.save();
  ctx.translate(shakeX, shakeY);

  drawBackground();
  drawAimLine();

  for (const ball of balls) {
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
  if (isGameOver || !isGameStarted || !canDrop) return;

  canDrop = false;

  const fruit = createFruit(mouseX, spawnY, currentFruit.level);
  balls.push(fruit);

  currentFruit = createFruit(mouseX, spawnY, nextFruitLevel);
  nextFruitLevel = randomStartLevel();
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
  const margin = 10;

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

  navigator.clipboard.writeText(text).then(() => {
    gameOverMessageElement.textContent = "Score copied! Share it with your friends.";
  }).catch(() => {
    gameOverMessageElement.textContent = text;
  });
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

startButton.addEventListener("click", () => {
  setupRound(false);
});

restartButton.addEventListener("click", () => {
  setupRound(false);
});

playAgainButton.addEventListener("click", () => {
  setupRound(false);
});

shareScoreButton.addEventListener("click", shareScore);

setupEvolutionBar();
setupRound(true);
gameLoop();
