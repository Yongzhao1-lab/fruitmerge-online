const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const scoreElement = document.getElementById("score");
const bestScoreElement = document.getElementById("bestScore");
const nextFruitElement = document.getElementById("nextFruit");
const restartButton = document.getElementById("restartButton");
const startButton = document.getElementById("startButton");
const playAgainButton = document.getElementById("playAgainButton");
const startOverlay = document.getElementById("startOverlay");
const gameOverOverlay = document.getElementById("gameOverOverlay");
const finalScoreElement = document.getElementById("finalScore");
const finalBestScoreElement = document.getElementById("finalBestScore");

const fruits = [
  { name: "Cherry", emoji: "🍒", radius: 16, score: 5 },
  { name: "Strawberry", emoji: "🍓", radius: 22, score: 10 },
  { name: "Grape", emoji: "🍇", radius: 28, score: 20 },
  { name: "Orange", emoji: "🍊", radius: 35, score: 40 },
  { name: "Apple", emoji: "🍎", radius: 43, score: 80 },
  { name: "Peach", emoji: "🍑", radius: 52, score: 160 },
  { name: "Pineapple", emoji: "🍍", radius: 62, score: 320 },
  { name: "Watermelon", emoji: "🍉", radius: 73, score: 640 },
  { name: "Coconut", emoji: "🥥", radius: 85, score: 1280 },
  { name: "Melon", emoji: "🍈", radius: 98, score: 2560 },
  { name: "Mega Fruit", emoji: "🌟", radius: 112, score: 5120 }
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
    emoji: fruit.emoji,
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
  nextFruitElement.textContent = fruits[nextFruitLevel].emoji;
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

  ctx.fillStyle = "rgba(255, 122, 26, 0.78)";
  ctx.font = "12px Arial";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText("Danger Line", 10, dropLineY - 12);
}

function drawFruit(ball) {
  ctx.beginPath();
  ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);

  const gradient = ctx.createRadialGradient(
    ball.x - ball.radius / 3,
    ball.y - ball.radius / 3,
    ball.radius / 5,
    ball.x,
    ball.y,
    ball.radius
  );

  gradient.addColorStop(0, "#ffffff");
  gradient.addColorStop(1, "#ffd27a");

  ctx.fillStyle = gradient;
  ctx.fill();

  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 4;
  ctx.stroke();

  ctx.font = `${Math.max(18, ball.radius * 1.05)}px Arial`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(ball.emoji, ball.x, ball.y + 2);
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
        if (a.level === b.level && a.level < fruits.length - 1) {
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

  if (!isGameOver && currentFruit) {
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

startButton.addEventListener("click", startGame);
restartButton.addEventListener("click", restartGame);
playAgainButton.addEventListener("click", restartGame);

setupRound(true);
gameLoop();
