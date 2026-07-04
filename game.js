const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const nextFruitCanvas = document.getElementById("nextFruitCanvas");
const nextCtx = nextFruitCanvas.getContext("2d");

const scoreElement = document.getElementById("score");
const bestScoreElement = document.getElementById("bestScore");
const nextFruitNameElement = document.getElementById("nextFruitName");

const restartButton = document.getElementById("restartButton");
const startButton = document.getElementById("startButton");
const playAgainButton = document.getElementById("playAgainButton");

const startOverlay = document.getElementById("startOverlay");
const gameOverOverlay = document.getElementById("gameOverOverlay");

const finalScoreElement = document.getElementById("finalScore");
const finalBestScoreElement = document.getElementById("finalBestScore");

const fruits = [
  { name: "Cherry", radius: 16, score: 5, skin: "#e84545", core: "#ff6b6b", type: "cherry" },
  { name: "Strawberry", radius: 22, score: 10, skin: "#e83e5a", core: "#ff6b7f", type: "strawberry" },
  { name: "Grape", radius: 28, score: 20, skin: "#7b4bc7", core: "#a883e8", type: "grape" },
  { name: "Orange", radius: 35, score: 40, skin: "#ff9a1f", core: "#ffc65c", type: "orange" },
  { name: "Apple", radius: 43, score: 80, skin: "#e94f64", core: "#ff7b8a", type: "apple" },
  { name: "Peach", radius: 52, score: 160, skin: "#ff9b6a", core: "#ffc48f", type: "peach" },
  { name: "Pineapple", radius: 62, score: 320, skin: "#f0b93a", core: "#ffd66b", type: "pineapple" },
  { name: "Watermelon", radius: 73, score: 640, skin: "#2fbf71", core: "#f2505e", type: "watermelon" },
  { name: "Coconut", radius: 85, score: 1280, skin: "#8a5a3b", core: "#f7f0df", type: "coconut" },
  { name: "Melon", radius: 98, score: 2560, skin: "#8bd66b", core: "#c6ef84", type: "melon" },
  { name: "Dragon Fruit", radius: 112, score: 5120, skin: "#f04e98", core: "#fff4f9", type: "dragonfruit" }
];

let balls = [];
let currentFruit;
let nextFruitLevel;

let mouseX = canvas.width / 2;
let score = 0;
let bestScore = Number(localStorage.getItem("fruitMergeBestScore")) || 0;

let isGameOver = false;
let isGameStarted = false;
let canDrop = true;

const gravity = 0.30;
const friction = 0.94;
const bounce = 0.12;
const dropLineY = 90;
const spawnY = 50;

function randomStartLevel() {
  const random = Math.random();

  if (random < 0.22) return 0;
  if (random < 0.44) return 1;
  if (random < 0.64) return 2;
  if (random < 0.80) return 3;
  if (random < 0.92) return 4;
  return 5;
}

function createFruit(x, y, level) {
  const fruit = fruits[level];

  return {
    x,
    y,
    vx: 0,
    vy: 0,
    level,
    radius: fruit.radius,
    dangerFrames: 0,
    age: 0
  };
}

function setupRound(showStartScreen = true) {
  balls = [];
  score = 0;
  isGameOver = false;
  isGameStarted = !showStartScreen;
  canDrop = true;
  mouseX = canvas.width / 2;

  scoreElement.textContent = score;
  bestScoreElement.textContent = bestScore;

  gameOverOverlay.classList.add("hidden");

  if (showStartScreen) {
    startOverlay.classList.remove("hidden");
  } else {
    startOverlay.classList.add("hidden");
  }

  nextFruitLevel = randomStartLevel();
  currentFruit = createFruit(mouseX, spawnY, randomStartLevel());
  updateNextFruit();
}

function startGame() {
  setupRound(false);
}

function restartGame() {
  setupRound(false);
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

function drawBackground() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "#fff3dc";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "rgba(255, 122, 26, 0.12)";
  ctx.fillRect(0, 0, canvas.width, dropLineY);

  ctx.strokeStyle = "#ff7a1a";
  ctx.lineWidth = 3;
  ctx.setLineDash([8, 8]);
  ctx.beginPath();
  ctx.moveTo(0, dropLineY);
  ctx.lineTo(canvas.width, dropLineY);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.fillStyle = "rgba(255, 122, 26, 0.82)";
  ctx.font = "12px Arial";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText("Danger Line", 10, dropLineY - 12);
}

function drawFruit(ball) {
  drawFruitIcon(ctx, ball.x, ball.y, ball.radius, ball.level);
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
    targetCtx.strokeStyle = "#4b8a3d";
    targetCtx.lineWidth = Math.max(2, radius * 0.08);
    targetCtx.beginPath();
    targetCtx.moveTo(x, y - radius * 0.35);
    targetCtx.quadraticCurveTo(x + radius * 0.2, y - radius * 0.7, x + radius * 0.45, y - radius * 0.82);
    targetCtx.stroke();
  }

  if (type === "strawberry") {
    drawLeaf(targetCtx, x, y - radius * 0.65, radius * 0.25);
    targetCtx.fillStyle = "#ffe7a3";
    for (let i = -1; i <= 1; i++) {
      for (let j = -1; j <= 1; j++) {
        targetCtx.beginPath();
        targetCtx.arc(x + i * radius * 0.25, y + j * radius * 0.22, radius * 0.035, 0, Math.PI * 2);
        targetCtx.fill();
      }
    }
  }

  if (type === "grape") {
    const grapeColor = "#6f42c1";
    targetCtx.fillStyle = grapeColor;
    const spots = [
      [0, -0.25], [-0.25, 0], [0.25, 0], [0, 0.25], [-0.18, 0.28], [0.18, 0.28]
    ];
    for (const [sx, sy] of spots) {
      targetCtx.beginPath();
      targetCtx.arc(x + sx * radius, y + sy * radius, radius * 0.22, 0, Math.PI * 2);
      targetCtx.fill();
      targetCtx.strokeStyle = "rgba(255,255,255,0.45)";
      targetCtx.lineWidth = 1;
      targetCtx.stroke();
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
    targetCtx.fillStyle = "rgba(255,255,255,0.45)";
    targetCtx.beginPath();
    targetCtx.ellipse(x - radius * 0.25, y - radius * 0.15, radius * 0.16, radius * 0.25, -0.4, 0, Math.PI * 2);
    targetCtx.fill();
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

    targetCtx.strokeStyle = "rgba(77,47,26,0.28)";
    targetCtx.lineWidth = radius * 0.08;
    targetCtx.stroke();

    targetCtx.fillStyle = "rgba(77,47,26,0.5)";
    for (let i = -1; i <= 1; i++) {
      targetCtx.beginPath();
      targetCtx.arc(x + i * radius * 0.18, y - radius * 0.15, radius * 0.035, 0, Math.PI * 2);
      targetCtx.fill();
    }
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
    for (let i = 0; i < 18; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = Math.random() * radius * 0.45;
      targetCtx.beginPath();
      targetCtx.arc(x + Math.cos(angle) * dist, y + Math.sin(angle) * dist, radius * 0.018, 0, Math.PI * 2);
      targetCtx.fill();
    }

    drawLeaf(targetCtx, x - radius * 0.42, y + radius * 0.12, radius * 0.18);
    drawLeaf(targetCtx, x + radius * 0.42, y - radius * 0.1, radius * 0.18);
  }

  targetCtx.restore();
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

  for (const ball of balls) {
    ball.age += 1;

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

  const newFruit = createFruit(
    (a.x + b.x) / 2,
    (a.y + b.y) / 2,
    newLevel
  );

  newFruit.vy = -1.2;
  newFruit.vx = (Math.random() - 0.5) * 0.5;

  balls.splice(indexB, 1);
  balls.splice(indexA, 1);
  balls.push(newFruit);

  score += fruits[newLevel].score;
  scoreElement.textContent = score;

  if (score > bestScore) {
    bestScore = score;
    localStorage.setItem("fruitMergeBestScore", bestScore);
    bestScoreElement.textContent = bestScore;
  }
}

function checkGameOver() {
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

    if (ball.dangerFrames > 35) {
      endGame();
      break;
    }
  }
}

function endGame() {
  if (isGameOver) return;

  isGameOver = true;
  isGameStarted = false;

  if (score > bestScore) {
    bestScore = score;
    localStorage.setItem("fruitMergeBestScore", bestScore);
  }

  bestScoreElement.textContent = bestScore;
  finalScoreElement.textContent = score;
  finalBestScoreElement.textContent = bestScore;

  gameOverOverlay.classList.remove("hidden");
}

function draw() {
  drawBackground();

  for (const ball of balls) {
    drawFruit(ball);
  }

  if (!isGameOver && isGameStarted && currentFruit) {
    currentFruit.x = mouseX;
    drawFruit(currentFruit);
  }
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
  }, 420);
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

setupRound(true);
gameLoop();
