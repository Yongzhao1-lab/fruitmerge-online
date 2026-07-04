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
const runTitleElement = document.getElementById("runTitle");

const evolutionBar = document.getElementById("evolutionBar");
const leaderboardList = document.getElementById("leaderboardList");
const gameOverLeaderboard = document.getElementById("gameOverLeaderboard");

const fruits = [
  { name: "Cherry", radius: 16, score: 5, skin: "#e84545", core: "#ff7f8b", type: "cherry" },
  { name: "Strawberry", radius: 21, score: 10, skin: "#e83e5a", core: "#ff8a9c", type: "strawberry" },
  { name: "Grape", radius: 27, score: 20, skin: "#7b4bc7", core: "#b694ff", type: "grape" },
  { name: "Orange", radius: 34, score: 40, skin: "#ff9a1f", core: "#ffd36b", type: "orange" },
  { name: "Apple", radius: 42, score: 80, skin: "#e94f64", core: "#ff8b98", type: "apple" },
  { name: "Peach", radius: 51, score: 160, skin: "#ff9b6a", core: "#ffc7a1", type: "peach" },
  { name: "Pineapple", radius: 61, score: 320, skin: "#f0b93a", core: "#ffe17a", type: "pineapple" },
  { name: "Watermelon", radius: 72, score: 640, skin: "#2fbf71", core: "#ff6070", type: "watermelon" },
  { name: "Coconut", radius: 84, score: 1280, skin: "#8a5a3b", core: "#fff3df", type: "coconut" },
  { name: "Melon", radius: 96, score: 2560, skin: "#8bd66b", core: "#d7f59d", type: "melon" },
  { name: "Dragon Fruit", radius: 110, score: 5120, skin: "#f04e98", core: "#fff4f9", type: "dragonfruit" }
];

let fruitImages = [];
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

let audioContext = null;
let soundReady = false;

const gravity = 0.31;
const friction = 0.94;
const bounce = 0.12;
const dropLineY = 98;
const spawnY = 54;

function initAudio() {
  if (soundReady) return;

  const AudioContextClass = window.AudioContext || window.webkitAudioContext;

  if (!AudioContextClass) return;

  audioContext = new AudioContextClass();
  soundReady = true;
}

function playTone(frequency, duration, type = "sine", volume = 0.045) {
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
  const frequency = 420 + level * 42;
  playTone(frequency, 0.075, "sine", 0.045);
  playTone(frequency * 1.32, 0.09, "triangle", 0.025);
}

function playBigMergeSound() {
  playTone(620, 0.09, "sine", 0.045);
  setTimeout(() => playTone(820, 0.12, "sine", 0.04), 70);
}

function playGameOverSound() {
  playTone(240, 0.14, "sawtooth", 0.03);
  setTimeout(() => playTone(160, 0.18, "sawtooth", 0.025), 120);
}

function vibrate(ms) {
  if (navigator.vibrate) {
    navigator.vibrate(ms);
  }
}

function makeFruitSvg(fruit) {
  const detail = getFruitDetailSvg(fruit.type);

  return `
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256">
    <defs>
      <radialGradient id="g" cx="35%" cy="28%" r="75%">
        <stop offset="0%" stop-color="#ffffff"/>
        <stop offset="18%" stop-color="${fruit.core}"/>
        <stop offset="100%" stop-color="${fruit.skin}"/>
      </radialGradient>
      <filter id="shadow" x="-30%" y="-30%" width="160%" height="160%">
        <feDropShadow dx="0" dy="12" stdDeviation="12" flood-color="#29a8b8" flood-opacity="0.18"/>
      </filter>
    </defs>

    <ellipse cx="128" cy="224" rx="70" ry="13" fill="#38cfd8" opacity="0.15"/>
    <circle cx="128" cy="128" r="92" fill="url(#g)" filter="url(#shadow)"/>
    <circle cx="96" cy="84" r="22" fill="#ffffff" opacity="0.52"/>
    <circle cx="85" cy="112" r="8" fill="#ffffff" opacity="0.35"/>

    ${detail}

    <circle cx="101" cy="137" r="7" fill="#263238"/>
    <circle cx="155" cy="137" r="7" fill="#263238"/>
    <path d="M112 161 Q128 174 144 161" fill="none" stroke="#263238" stroke-width="5" stroke-linecap="round"/>
    <circle cx="83" cy="154" r="10" fill="#ffffff" opacity="0.26"/>
    <circle cx="173" cy="154" r="10" fill="#ffffff" opacity="0.26"/>

    <path d="M57 73 C72 45 106 31 139 36" fill="none" stroke="#ffffff" stroke-width="9" stroke-linecap="round" opacity="0.32"/>
    <path d="M193 76 C215 102 221 132 212 164" fill="none" stroke="#bdfaff" stroke-width="7" stroke-linecap="round" opacity="0.36"/>
  </svg>`;
}

function getFruitDetailSvg(type) {
  if (type === "cherry") {
    return `
      <path d="M130 57 C136 34 156 25 174 32" fill="none" stroke="#4b8a3d" stroke-width="8" stroke-linecap="round"/>
      <ellipse cx="176" cy="32" rx="19" ry="10" fill="#6fbd44" transform="rotate(-25 176 32)"/>
    `;
  }

  if (type === "strawberry") {
    return `
      <path d="M82 50 L105 68 L128 48 L151 68 L174 50 L164 82 L92 82 Z" fill="#6fbd44"/>
      <g fill="#fff3b0" opacity="0.9">
        <circle cx="96" cy="109" r="4"/><circle cx="128" cy="104" r="4"/><circle cx="160" cy="109" r="4"/>
        <circle cx="106" cy="143" r="4"/><circle cx="148" cy="143" r="4"/>
        <circle cx="128" cy="176" r="4"/>
      </g>
    `;
  }

  if (type === "grape") {
    return `
      <g fill="#6f42c1" opacity="0.85" stroke="#d7c8ff" stroke-width="3">
        <circle cx="104" cy="109" r="24"/><circle cx="137" cy="106" r="24"/><circle cx="154" cy="134" r="24"/>
        <circle cx="119" cy="139" r="24"/><circle cx="101" cy="166" r="23"/><circle cx="139" cy="168" r="23"/>
      </g>
      <ellipse cx="148" cy="53" rx="22" ry="11" fill="#6fbd44" transform="rotate(-25 148 53)"/>
    `;
  }

  if (type === "orange") {
    return `
      <circle cx="128" cy="128" r="62" fill="#ffb733" opacity="0.72"/>
      <g stroke="#fff7c7" stroke-width="5" opacity="0.72">
        <line x1="128" y1="128" x2="128" y2="72"/>
        <line x1="128" y1="128" x2="178" y2="100"/>
        <line x1="128" y1="128" x2="178" y2="158"/>
        <line x1="128" y1="128" x2="128" y2="184"/>
        <line x1="128" y1="128" x2="78" y2="158"/>
        <line x1="128" y1="128" x2="78" y2="100"/>
      </g>
    `;
  }

  if (type === "apple") {
    return `
      <path d="M128 68 C119 51 108 44 94 47" fill="none" stroke="#7b4f2f" stroke-width="8" stroke-linecap="round"/>
      <ellipse cx="151" cy="50" rx="25" ry="13" fill="#6fbd44" transform="rotate(-24 151 50)"/>
    `;
  }

  if (type === "peach") {
    return `
      <ellipse cx="151" cy="55" rx="25" ry="13" fill="#6fbd44" transform="rotate(-24 151 55)"/>
      <path d="M139 67 C104 98 103 156 134 191" fill="none" stroke="#d26d58" stroke-width="6" stroke-linecap="round" opacity="0.45"/>
    `;
  }

  if (type === "pineapple") {
    return `
      <path d="M100 57 L112 25 L128 59 L144 25 L156 57 L176 35 L164 85 L92 85 L80 35 Z" fill="#6fbd44"/>
      <g stroke="#b78322" stroke-width="4" opacity="0.42">
        <path d="M78 104 L178 202"/><path d="M78 138 L145 206"/><path d="M106 86 L190 170"/>
        <path d="M178 104 L78 202"/><path d="M178 138 L111 206"/><path d="M150 86 L66 170"/>
      </g>
    `;
  }

  if (type === "watermelon") {
    return `
      <circle cx="128" cy="132" r="66" fill="#ff6070"/>
      <circle cx="128" cy="132" r="74" fill="none" stroke="#eaffc8" stroke-width="10"/>
      <g fill="#263238">
        <ellipse cx="105" cy="120" rx="5" ry="8" transform="rotate(-20 105 120)"/>
        <ellipse cx="137" cy="113" rx="5" ry="8" transform="rotate(10 137 113)"/>
        <ellipse cx="153" cy="150" rx="5" ry="8" transform="rotate(25 153 150)"/>
        <ellipse cx="112" cy="158" rx="5" ry="8" transform="rotate(-10 112 158)"/>
      </g>
    `;
  }

  if (type === "coconut") {
    return `
      <circle cx="128" cy="128" r="61" fill="#fff3df"/>
      <circle cx="128" cy="128" r="72" fill="none" stroke="#70442c" stroke-width="12" opacity="0.42"/>
      <g fill="#70442c" opacity="0.55">
        <circle cx="107" cy="112" r="5"/><circle cx="128" cy="105" r="5"/><circle cx="149" cy="112" r="5"/>
      </g>
    `;
  }

  if (type === "melon") {
    return `
      <g stroke="#ffffff" stroke-width="6" opacity="0.65">
        <path d="M83 70 C116 106 116 150 83 190"/>
        <path d="M110 58 C136 104 136 150 110 202"/>
        <path d="M146 58 C120 104 120 150 146 202"/>
        <path d="M173 70 C140 106 140 150 173 190"/>
      </g>
    `;
  }

  if (type === "dragonfruit") {
    return `
      <circle cx="128" cy="128" r="63" fill="#fff4f9"/>
      <g fill="#202020">
        <circle cx="103" cy="107" r="3"/><circle cx="132" cy="101" r="3"/><circle cx="159" cy="118" r="3"/>
        <circle cx="111" cy="143" r="3"/><circle cx="145" cy="151" r="3"/><circle cx="128" cy="178" r="3"/>
      </g>
      <ellipse cx="74" cy="141" rx="22" ry="10" fill="#6fbd44" transform="rotate(-35 74 141)"/>
      <ellipse cx="183" cy="112" rx="22" ry="10" fill="#6fbd44" transform="rotate(35 183 112)"/>
    `;
  }

  return "";
}

function preloadFruitImages() {
  fruitImages = fruits.map((fruit) => {
    const img = new Image();
    img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(makeFruitSvg(fruit));
    img.onload = () => updateNextFruit();
    return img;
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
  renderLeaderboard();
}

function updateNextFruit() {
  if (typeof nextFruitLevel !== "number") return;

  const fruit = fruits[nextFruitLevel];
  nextFruitNameElement.textContent = fruit.name;
  nextCtx.clearRect(0, 0, nextFruitCanvas.width, nextFruitCanvas.height);

  drawFruitIcon(
    nextCtx,
    nextFruitCanvas.width / 2,
    nextFruitCanvas.height / 2,
    21,
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

  if (!leaderboardList) return;

  if (!list.length) {
    leaderboardList.innerHTML = `<div class="leaderboard-empty">No local runs yet. Play a round to create your first record.</div>`;
  } else {
    leaderboardList.innerHTML = list.map((item, index) => createLeaderboardRow(item, index)).join("");
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
    scale = 1 + ball.popFrames / 80;
  }

  drawFruitIcon(ctx, ball.x, ball.y, ball.radius * scale, ball.level);
}

function drawFruitIcon(targetCtx, x, y, radius, level) {
  const img = fruitImages[level];

  if (img && img.complete) {
    targetCtx.drawImage(img, x - radius, y - radius, radius * 2, radius * 2);
    return;
  }

  const fruit = fruits[level];

  targetCtx.save();
  targetCtx.beginPath();
  targetCtx.arc(x, y, radius, 0, Math.PI * 2);
  targetCtx.fillStyle = fruit.skin;
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

  playMergeSound(newLevel);

  if (newLevel >= 7) {
    addFloatingText(newFruit.x, newFruit.y - newFruit.radius - 24, "Cool Merge!");
    screenShake = 6;
    playBigMergeSound();
    vibrate(35);
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

  bestScoreElement.textContent = bestScore;
  finalScoreElement.textContent = score;
  finalTimeElement.textContent = formatTime(survivalTime);
  finalBestScoreElement.textContent = bestScore;
  runTitleElement.textContent = runTitle;

  if (score > oldBest) {
    gameOverMessageElement.textContent = `New Best! You beat your record by ${score - oldBest} points.`;
  } else if (survivalTime > oldBestTime) {
    gameOverMessageElement.textContent = `New survival record: ${formatTime(survivalTime)}!`;
  } else if (survivalTime >= 180) {
    gameOverMessageElement.textContent = "Expert run! You survived more than 3 minutes.";
  } else {
    gameOverMessageElement.textContent = `Only ${Math.max(0, bestScore - score)} points away from your best score.`;
  }

  playGameOverSound();
  vibrate(60);

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

  initAudio();
  canDrop = false;

  const fruit = createFruit(mouseX, spawnY, currentFruit.level);
  balls.push(fruit);

  playDropSound();

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

  if (navigator.clipboard) {
    navigator.clipboard.writeText(text).then(() => {
      gameOverMessageElement.textContent = "Score copied! Share it with your friends.";
    }).catch(() => {
      gameOverMessageElement.textContent = text;
    });
  } else {
    gameOverMessageElement.textContent = text;
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

startButton.addEventListener("click", () => {
  initAudio();
  setupRound(false);
});

restartButton.addEventListener("click", () => {
  initAudio();
  setupRound(false);
});

playAgainButton.addEventListener("click", () => {
  initAudio();
  setupRound(false);
});

shareScoreButton.addEventListener("click", shareScore);

preloadFruitImages();
setupEvolutionBar();
setupRound(true);
gameLoop();
