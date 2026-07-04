const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const scoreElement = document.getElementById("score");
const nextFruitElement = document.getElementById("nextFruit");
const restartButton = document.getElementById("restartButton");
const playAgainButton = document.getElementById("playAgainButton");
const gameOverOverlay = document.getElementById("gameOverOverlay");
const finalScoreElement = document.getElementById("finalScore");

const fruits = [
  { name: "Cherry", emoji: "🍒", radius: 18, score: 5 },
  { name: "Strawberry", emoji: "🍓", radius: 24, score: 10 },
  { name: "Grape", emoji: "🍇", radius: 30, score: 20 },
  { name: "Orange", emoji: "🍊", radius: 36, score: 40 },
  { name: "Apple", emoji: "🍎", radius: 44, score: 80 },
  { name: "Peach", emoji: "🍑", radius: 52, score: 160 },
  { name: "Pineapple", emoji: "🍍", radius: 62, score: 320 },
  { name: "Watermelon", emoji: "🍉", radius: 74, score: 640 }
];

let balls = [];
let currentFruit;
let nextFruitLevel;
let mouseX = canvas.width / 2;
let score = 0;
let isGameOver = false;
let canDrop = true;

const gravity = 0.32;
const friction = 0.985;
const bounce = 0.35;
const dropLineY = 90;
const spawnY = 48;

function randomStartLevel() {
  return Math.floor(Math.random() * 4);
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
    settledTime: 0
  };
}

function initGame() {
  balls = [];
  score = 0;
  isGameOver = false;
  canDrop = true;
  mouseX = canvas.width / 2;

  scoreElement.textContent = score;
  gameOverOverlay.classList.add("hidden");

  nextFruitLevel = randomStartLevel();
  currentFruit = createFruit(mouseX, spawnY, randomStartLevel());
  updateNextFruit();
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

  ctx.font = `${Math.max(20, ball.radius * 1.15)}px Arial`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(ball.emoji, ball.x, ball.y + 2);
}

function updatePhysics() {
  if (isGameOver) return;

  for (const ball of balls) {
    ball.vy += gravity;
    ball.x += ball.vx;
    ball.y += ball.vy;

    ball.vx *= friction;

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
      ball.vx *= 0.95;

      if (Math.abs(ball.vy) < 0.6) {
        ball.vy = 0;
      }
    }
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

        a.x -= nx * overlap * 0.5;
        a.y -= ny * overlap * 0.5;
        b.x += nx * overlap * 0.5;
        b.y += ny * overlap * 0.5;

        const push = 0.18;
        a.vx -= nx * push;
        a.vy -= ny * push;
        b.vx += nx * push;
        b.vy += ny * push;
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

  newFruit.vy = -3;
  newFruit.vx = (Math.random() - 0.5) * 1.5;

  balls.splice(indexB, 1);
  balls.splice(indexA, 1);
  balls.push(newFruit);

  score += fruits[newLevel].score;
  scoreElement.textContent = score;
}

function checkGameOver() {
  for (const ball of balls) {
    const fruitTop = ball.y - ball.radius;
    const isAboveDangerLine = fruitTop < dropLineY;
    const isAlmostStill = Math.abs(ball.vx) < 0.8 && Math.abs(ball.vy) < 0.8;

    if (isAboveDangerLine && isAlmostStill) {
      ball.settledTime += 1;
    } else {
      ball.settledTime = 0;
    }

    if (ball.settledTime > 45) {
      endGame();
      break;
    }
  }
}

function endGame() {
  isGameOver = true;
  finalScoreElement.textContent = score;
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
  if (isGameOver || !canDrop) return;

  canDrop = false;

  const fruit = createFruit(mouseX, spawnY, currentFruit.level);
  balls.push(fruit);

  currentFruit = createFruit(mouseX, spawnY, nextFruitLevel);
  nextFruitLevel = randomStartLevel();
  updateNextFruit();

  setTimeout(() => {
    canDrop = true;
  }, 450);
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

restartButton.addEventListener("click", initGame);
playAgainButton.addEventListener("click", initGame);

initGame();
gameLoop();
