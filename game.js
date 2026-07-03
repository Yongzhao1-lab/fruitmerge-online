const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const scoreElement = document.getElementById("score");

let score = 0;

const fruits = [
  { name: "Cherry", radius: 16, color: "#ff3b3b" },
  { name: "Orange", radius: 22, color: "#ff9f1a" },
  { name: "Lemon", radius: 28, color: "#ffd93d" },
  { name: "Apple", radius: 36, color: "#7ed957" },
  { name: "Peach", radius: 44, color: "#ffb3c6" },
  { name: "Watermelon", radius: 56, color: "#2ecc71" }
];

let balls = [];
let currentFruit = createFruit(canvas.width / 2, 40, 0);
let mouseX = canvas.width / 2;

function createFruit(x, y, level) {
  const fruit = fruits[level];
  return {
    x,
    y,
    vx: 0,
    vy: 0,
    level,
    radius: fruit.radius,
    color: fruit.color,
    dropped: false
  };
}

function drawFruit(fruit) {
  ctx.beginPath();
  ctx.arc(fruit.x, fruit.y, fruit.radius, 0, Math.PI * 2);
  ctx.fillStyle = fruit.color;
  ctx.fill();
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 3;
  ctx.stroke();

  ctx.fillStyle = "#222";
  ctx.font = "12px Arial";
  ctx.textAlign = "center";
  ctx.fillText(fruits[fruit.level].name[0], fruit.x, fruit.y + 4);
}

function updatePhysics() {
  balls.forEach(ball => {
    ball.vy += 0.35;
    ball.x += ball.vx;
    ball.y += ball.vy;

    if (ball.x - ball.radius < 0) {
      ball.x = ball.radius;
      ball.vx *= -0.4;
    }

    if (ball.x + ball.radius > canvas.width) {
      ball.x = canvas.width - ball.radius;
      ball.vx *= -0.4;
    }

    if (ball.y + ball.radius > canvas.height) {
      ball.y = canvas.height - ball.radius;
      ball.vy *= -0.35;
      ball.vx *= 0.95;
    }
  });

  for (let i = 0; i < balls.length; i++) {
    for (let j = i + 1; j < balls.length; j++) {
      const a = balls[i];
      const b = balls[j];

      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const minDistance = a.radius + b.radius;

      if (distance < minDistance) {
        if (a.level === b.level && a.level < fruits.length - 1) {
          const newLevel = a.level + 1;
          const newFruit = createFruit((a.x + b.x) / 2, (a.y + b.y) / 2, newLevel);
          newFruit.dropped = true;
          newFruit.vy = -2;

          balls.splice(j, 1);
          balls.splice(i, 1);
          balls.push(newFruit);

          score += (newLevel + 1) * 10;
          scoreElement.textContent = score;
          return;
        }

        const overlap = minDistance - distance;
        const nx = dx / distance;
        const ny = dy / distance;

        a.x -= nx * overlap / 2;
        a.y -= ny * overlap / 2;
        b.x += nx * overlap / 2;
        b.y += ny * overlap / 2;

        a.vx -= nx * 0.2;
        b.vx += nx * 0.2;
      }
    }
  }
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "#fff3dc";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.strokeStyle = "#ff7a1a";
  ctx.setLineDash([8, 8]);
  ctx.beginPath();
  ctx.moveTo(0, 90);
  ctx.lineTo(canvas.width, 90);
  ctx.stroke();
  ctx.setLineDash([]);

  balls.forEach(drawFruit);

  currentFruit.x = mouseX;
  drawFruit(currentFruit);
}

function loop() {
  updatePhysics();
  draw();
  requestAnimationFrame(loop);
}

function dropFruit() {
  const fruit = createFruit(mouseX, 40, Math.floor(Math.random() * 3));
  fruit.dropped = true;
  balls.push(fruit);
  currentFruit = createFruit(mouseX, 40, Math.floor(Math.random() * 3));
}

canvas.addEventListener("mousemove", (event) => {
  const rect = canvas.getBoundingClientRect();
  mouseX = event.clientX - rect.left;
  mouseX = Math.max(currentFruit.radius, Math.min(canvas.width - currentFruit.radius, mouseX));
});

canvas.addEventListener("click", dropFruit);

canvas.addEventListener("touchmove", (event) => {
  event.preventDefault();
  const rect = canvas.getBoundingClientRect();
  const touch = event.touches[0];
  mouseX = touch.clientX - rect.left;
  mouseX = Math.max(currentFruit.radius, Math.min(canvas.width - currentFruit.radius, mouseX));
});

canvas.addEventListener("touchend", dropFruit);

loop();
