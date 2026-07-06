(() => {
  "use strict";

  const canvas = document.getElementById("gameCanvas");
  const ctx = canvas.getContext("2d");

  const scoreEl = document.getElementById("score");
  const panelScoreEl = document.getElementById("panelScore");
  const bestScoreEl = document.getElementById("bestScore");
  const timeEl = document.getElementById("time");
  const leaderboardListEl = document.getElementById("leaderboardList");

  const mobileScoreEl = document.getElementById("mobileScore");
  const mobileBestScoreEl = document.getElementById("mobileBestScore");
  const mobileTimeEl = document.getElementById("mobileTime");

  const startButton = document.getElementById("startButton");
  const startOverlay = document.getElementById("startOverlay");
  const restartButton = document.getElementById("restartButton");
  const playAgainButton = document.getElementById("playAgainButton");

  const gameOverPanel = document.getElementById("gameOverPanel");
  const gameOverBadge = document.getElementById("gameOverBadge");
  const gameOverScore = document.getElementById("gameOverScore");
  const gameOverTime = document.getElementById("gameOverTime");
  const gameOverBest = document.getElementById("gameOverBest");
  const gameOverTip = document.getElementById("gameOverTip");

  const nextFruitNameEl = document.getElementById("nextFruitName");
  const nextFruitCanvas0 = document.getElementById("nextFruitCanvas0");
  const nextFruitCanvas1 = document.getElementById("nextFruitCanvas1");
  const nextFruitCanvas2 = document.getElementById("nextFruitCanvas2");
  const mobileNextFruitCanvas = document.getElementById("mobileNextFruitCanvas");
  const evolutionBar = document.getElementById("evolutionBar");

  const musicToggleButton = document.getElementById("musicToggleButton");

  const DESKTOP_SIZE = { width: 420, height: 560 };
  const MOBILE_SIZE = { width: 420, height: 850 };

  const BEST_KEY = "fruitMergeBestScore";
  const RUNS_KEY = "fruitMergeTopRuns";
  const MUSIC_KEY = "fruitMergeMusicEnabled";

  const fruits = [
    {
      name: "Cherry",
      radius: 15,
      score: 5,
      color: "#ff4a42",
      files: ["cherry.png"],
      visualScale: 1.36
    },
    {
      name: "Strawberry",
      radius: 20,
      score: 10,
      color: "#ff5148",
      files: ["strawberry.png"],
      visualScale: 1.28
    },
    {
      name: "Grape",
      radius: 25,
      score: 20,
      color: "#a65bff",
      files: ["grape.png"],
      visualScale: 1.16
    },
    {
      name: "Orange",
      radius: 32,
      score: 40,
      color: "#ff9f2e",
      files: ["orange.png"],
      visualScale: 1.12
    },
    {
      name: "Apple",
      radius: 39,
      score: 80,
      color: "#f64340",
      files: ["apple.png"],
      visualScale: 1.1
    },
    {
      name: "Peach",
      radius: 48,
      score: 160,
      color: "#ff9872",
      files: ["peach.png"],
      visualScale: 1.08
    },
    {
      name: "Pineapple",
      radius: 57,
      score: 320,
      color: "#ffc238",
      files: ["pineapple.png"],
      visualScale: 1.02
    },
    {
      name: "Watermelon",
      radius: 68,
      score: 640,
      color: "#30c765",
      files: ["watermelon.png"],
      visualScale: 1.03
    },
    {
      name: "Grapefruit",
      radius: 80,
      score: 1280,
      color: "#ffe45b",
      files: ["grapefruit.png", "pomelo.png", "yuzu.png", "lemon.png"],
      visualScale: 1.02
    },
    {
      name: "Melon",
      radius: 92,
      score: 2560,
      color: "#d9e66d",
      files: ["melon.png", "hami-melon.png", "honeydew.png", "cantaloupe.png"],
      visualScale: 1
    },
    {
      name: "Dragon Fruit",
      radius: 106,
      score: 5120,
      color: "#ff5098",
      files: ["dragonfruit.png", "dragon-fruit.png", "dragon_fruit.png", "pitaya.png"],
      visualScale: 0.98
    }
  ];

  let logicalWidth = DESKTOP_SIZE.width;
  let logicalHeight = DESKTOP_SIZE.height;
  let dpr = Math.max(1, Math.min(window.devicePixelRatio || 1, 2));

  let objects = [];
  let score = 0;
  let bestScore = Number(localStorage.getItem(BEST_KEY) || 0);
  let startTime = 0;
  let elapsedSeconds = 0;
  let running = false;
  let gameOver = false;
  let aimX = logicalWidth / 2;
  let currentFruitIndex = 0;
  let nextQueue = [];
  let lastDropAt = 0;
  let dangerStartAt = 0;
  let mobileModeForced = false;

  let audioCtx = null;
  let musicEnabled = localStorage.getItem(MUSIC_KEY) !== "off";
  let musicTimer = null;

  const images = new Map();

  function isMobileMode() {
    return mobileModeForced || document.body.classList.contains("mobile-playing");
  }

  function getTargetSize() {
    return isMobileMode() ? MOBILE_SIZE : DESKTOP_SIZE;
  }

  function formatTime(seconds) {
    const mins = Math.floor(seconds / 60).toString().padStart(2, "0");
    const secs = Math.floor(seconds % 60).toString().padStart(2, "0");
    return `${mins}:${secs}`;
  }

  function randomFruitIndex() {
    return Math.floor(Math.random() * 5);
  }

  function loadFruitImages() {
    fruits.forEach((fruit, index) => {
      const candidates = fruit.files || [];
      let loaded = false;

      candidates.forEach((file) => {
        const img = new Image();
        img.onload = () => {
          if (!loaded) {
            loaded = true;
            images.set(index, img);
          }
        };
        img.src = `/assets/fruits/${file}`;
      });
    });
  }

  function configureCanvas() {
    const target = getTargetSize();
    const oldWidth = logicalWidth;
    const oldHeight = logicalHeight;

    logicalWidth = target.width;
    logicalHeight = target.height;

    dpr = Math.max(1, Math.min(window.devicePixelRatio || 1, 2));

    canvas.width = Math.round(logicalWidth * dpr);
    canvas.height = Math.round(logicalHeight * dpr);
    canvas.setAttribute("width", String(logicalWidth));
    canvas.setAttribute("height", String(logicalHeight));

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    if (oldWidth && oldHeight && objects.length) {
      const scaleX = logicalWidth / oldWidth;
      const scaleY = logicalHeight / oldHeight;

      objects.forEach((item) => {
        item.x *= scaleX;
        item.y *= scaleY;
        item.x = Math.max(item.radius, Math.min(logicalWidth - item.radius, item.x));
        item.y = Math.max(item.radius, Math.min(getFloorY() - item.radius, item.y));
      });

      aimX *= scaleX;
      aimX = clamp(aimX, 32, logicalWidth - 32);
    }

    draw();
  }

  function getDangerLineY() {
    return isMobileMode() ? 160 : 96;
  }

  function getSpawnY() {
    return getDangerLineY() - 44;
  }

  function getFloorY() {
    return logicalHeight - 22;
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function createNextQueue() {
    nextQueue = [randomFruitIndex(), randomFruitIndex(), randomFruitIndex()];
    currentFruitIndex = randomFruitIndex();
  }

  function pullNextFruit() {
    currentFruitIndex = nextQueue.shift();
    nextQueue.push(randomFruitIndex());
    updateNextCanvases();
  }

  function startGame() {
    configureCanvas();

    startOverlay?.classList.add("hidden");

    if (!running || gameOver) {
      resetGame();
    }

    running = true;
    gameOver = false;
    startTime = performance.now();
    dangerStartAt = 0;

    if (musicEnabled) {
      startMusic();
    }
  }

  function resetGame() {
    configureCanvas();

    objects = [];
    score = 0;
    elapsedSeconds = 0;
    running = true;
    gameOver = false;
    startTime = performance.now();
    lastDropAt = 0;
    dangerStartAt = 0;
    aimX = logicalWidth / 2;

    createNextQueue();
    updateUI();
    updateNextCanvases();

    gameOverPanel?.classList.add("hidden");
  }

  function restartGame() {
    startOverlay?.classList.add("hidden");
    resetGame();
  }

  function endGame() {
    if (gameOver) return;

    gameOver = true;
    running = false;
    stopMusic();

    bestScore = Math.max(bestScore, score);
    localStorage.setItem(BEST_KEY, String(bestScore));

    saveRun(score, elapsedSeconds);

    if (gameOverScore) gameOverScore.textContent = String(score);
    if (gameOverTime) gameOverTime.textContent = formatTime(elapsedSeconds);
    if (gameOverBest) gameOverBest.textContent = String(bestScore);

    if (gameOverBadge) {
      gameOverBadge.textContent = score >= bestScore ? "Best Run" : "Game Over";
    }

    if (gameOverTip) {
      gameOverTip.textContent =
        score >= bestScore
          ? "New best score! Try another run and build an even bigger fruit."
          : "Keep larger fruits near the sides and leave the center open for clean merges.";
    }

    gameOverPanel?.classList.remove("hidden");

    updateUI();
    renderLeaderboard();
  }

  function saveRun(finalScore, seconds) {
    const oldRuns = readRuns();

    oldRuns.push({
      score: finalScore,
      time: seconds,
      date: Date.now()
    });

    const nextRuns = oldRuns
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);

    localStorage.setItem(RUNS_KEY, JSON.stringify(nextRuns));
  }

  function readRuns() {
    try {
      const value = JSON.parse(localStorage.getItem(RUNS_KEY) || "[]");
      return Array.isArray(value) ? value : [];
    } catch (error) {
      return [];
    }
  }

  function renderLeaderboard() {
    const runs = readRuns();

    if (!leaderboardListEl) return;

    if (!runs.length) {
      leaderboardListEl.innerHTML = `
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

    leaderboardListEl.innerHTML = runs
      .map((run, index) => {
        return `
          <div class="leaderboard-item">
            <div class="leaderboard-rank">${index + 1}</div>
            <div class="leaderboard-main">
              <strong>${formatTime(run.time || 0)}</strong>
              <span>${new Date(run.date || Date.now()).toLocaleDateString()}</span>
            </div>
            <div class="leaderboard-score">${run.score || 0}</div>
          </div>
        `;
      })
      .join("");
  }

  function updateUI() {
    if (scoreEl) scoreEl.textContent = String(score);
    if (panelScoreEl) panelScoreEl.textContent = String(score);
    if (bestScoreEl) bestScoreEl.textContent = String(bestScore);
    if (timeEl) timeEl.textContent = formatTime(elapsedSeconds);

    if (mobileScoreEl) mobileScoreEl.textContent = String(score);
    if (mobileBestScoreEl) mobileBestScoreEl.textContent = String(bestScore);
    if (mobileTimeEl) mobileTimeEl.textContent = formatTime(elapsedSeconds);
  }

  function drawFruitShape(targetCtx, fruitIndex, x, y, radius, alpha = 1) {
    const fruit = fruits[fruitIndex];
    const img = images.get(fruitIndex);
    const size = radius * 2 * (fruit.visualScale || 1);

    targetCtx.save();
    targetCtx.globalAlpha = alpha;

    if (img && img.complete) {
      targetCtx.drawImage(img, x - size / 2, y - size / 2, size, size);
    } else {
      const gradient = targetCtx.createRadialGradient(
        x - radius * 0.4,
        y - radius * 0.45,
        radius * 0.2,
        x,
        y,
        radius
      );

      gradient.addColorStop(0, "#ffffff");
      gradient.addColorStop(0.22, fruit.color);
      gradient.addColorStop(1, shadeColor(fruit.color, -22));

      targetCtx.fillStyle = gradient;
      targetCtx.beginPath();
      targetCtx.arc(x, y, radius, 0, Math.PI * 2);
      targetCtx.fill();

      targetCtx.fillStyle = "rgba(255,255,255,0.35)";
      targetCtx.beginPath();
      targetCtx.arc(x - radius * 0.35, y - radius * 0.35, radius * 0.22, 0, Math.PI * 2);
      targetCtx.fill();
    }

    targetCtx.restore();
  }

  function shadeColor(color, amount) {
    const hex = color.replace("#", "");
    const num = parseInt(hex, 16);

    let r = (num >> 16) + amount;
    let g = ((num >> 8) & 0x00ff) + amount;
    let b = (num & 0x0000ff) + amount;

    r = clamp(r, 0, 255);
    g = clamp(g, 0, 255);
    b = clamp(b, 0, 255);

    return `rgb(${r}, ${g}, ${b})`;
  }

  function drawMiniFruit(canvasEl, fruitIndex) {
    if (!canvasEl) return;

    const context = canvasEl.getContext("2d");
    const rectW = Number(canvasEl.getAttribute("width")) || 42;
    const rectH = Number(canvasEl.getAttribute("height")) || 42;
    const pixelRatio = Math.max(1, Math.min(window.devicePixelRatio || 1, 2));

    canvasEl.width = rectW * pixelRatio;
    canvasEl.height = rectH * pixelRatio;

    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    context.clearRect(0, 0, rectW, rectH);

    const radius = Math.min(rectW, rectH) * 0.34;
    drawFruitShape(context, fruitIndex, rectW / 2, rectH / 2, radius);
  }

  function updateNextCanvases() {
    drawMiniFruit(nextFruitCanvas0, currentFruitIndex);
    drawMiniFruit(nextFruitCanvas1, nextQueue[0]);
    drawMiniFruit(nextFruitCanvas2, nextQueue[1]);
    drawMiniFruit(mobileNextFruitCanvas, currentFruitIndex);

    if (nextFruitNameEl) {
      nextFruitNameEl.textContent = fruits[currentFruitIndex].name;
    }
  }

  function buildEvolutionCircle() {
    if (!evolutionBar) return;

    evolutionBar.innerHTML = "";

    const count = fruits.length;

    fruits.forEach((fruit, index) => {
      const item = document.createElement("div");
      item.className = "evolution-item";

      const angle = -90 + (360 / count) * index;
      item.style.transform = `rotate(${angle}deg) translate(64px) rotate(${-angle}deg)`;

      const mini = document.createElement("canvas");
      mini.width = 34;
      mini.height = 34;

      item.appendChild(mini);
      evolutionBar.appendChild(item);

      setTimeout(() => {
        drawMiniFruit(mini, index);
      }, 60);
    });
  }

  function createFruit(index, x, y) {
    const fruit = fruits[index];

    return {
      id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random()),
      type: index,
      radius: fruit.radius,
      x,
      y,
      vx: (Math.random() - 0.5) * 0.4,
      vy: 0,
      settled: false,
      merging: false
    };
  }

  function dropFruit() {
    if (!running || gameOver) return;

    const now = performance.now();

    if (now - lastDropAt < 430) return;

    const fruit = fruits[currentFruitIndex];
    const x = clamp(aimX, fruit.radius + 2, logicalWidth - fruit.radius - 2);
    const y = getSpawnY();

    objects.push(createFruit(currentFruitIndex, x, y));

    lastDropAt = now;

    pullNextFruit();
    playDropSound();
  }

  function updatePhysics() {
    const gravity = isMobileMode() ? 0.24 : 0.27;
    const floorY = getFloorY();

    for (const item of objects) {
      item.vy += gravity;

      item.x += item.vx;
      item.y += item.vy;

      item.vx *= 0.997;
      item.vy *= 0.998;

      if (item.x - item.radius < 0) {
        item.x = item.radius;
        item.vx *= -0.34;
      }

      if (item.x + item.radius > logicalWidth) {
        item.x = logicalWidth - item.radius;
        item.vx *= -0.34;
      }

      if (item.y + item.radius > floorY) {
        item.y = floorY - item.radius;
        item.vy *= -0.18;
        item.vx *= 0.94;

        if (Math.abs(item.vy) < 0.35) {
          item.vy = 0;
          item.settled = true;
        }
      }
    }

    resolveCollisions();
    checkDangerLine();
  }

  function resolveCollisions() {
    for (let pass = 0; pass < 3; pass++) {
      for (let i = 0; i < objects.length; i++) {
        for (let j = i + 1; j < objects.length; j++) {
          const a = objects[i];
          const b = objects[j];

          if (!a || !b || a.merging || b.merging) continue;

          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const dist = Math.hypot(dx, dy) || 0.0001;
          const minDist = a.radius + b.radius;

          if (dist >= minDist) continue;

          if (a.type === b.type && a.type < fruits.length - 1) {
            mergeFruits(i, j);
            return;
          }

          const nx = dx / dist;
          const ny = dy / dist;
          const overlap = minDist - dist;

          a.x -= nx * overlap * 0.5;
          a.y -= ny * overlap * 0.5;
          b.x += nx * overlap * 0.5;
          b.y += ny * overlap * 0.5;

          const rvx = b.vx - a.vx;
          const rvy = b.vy - a.vy;
          const velocityAlongNormal = rvx * nx + rvy * ny;

          if (velocityAlongNormal > 0) continue;

          const restitution = 0.18;
          const impulse = (-(1 + restitution) * velocityAlongNormal) / 2;

          a.vx -= impulse * nx;
          a.vy -= impulse * ny;
          b.vx += impulse * nx;
          b.vy += impulse * ny;

          a.vx *= 0.985;
          b.vx *= 0.985;
        }
      }
    }
  }

  function mergeFruits(i, j) {
    const a = objects[i];
    const b = objects[j];

    if (!a || !b) return;

    a.merging = true;
    b.merging = true;

    const nextType = a.type + 1;
    const nextFruit = fruits[nextType];

    const merged = createFruit(
      nextType,
      (a.x + b.x) / 2,
      (a.y + b.y) / 2
    );

    merged.vx = (a.vx + b.vx) * 0.35;
    merged.vy = Math.min((a.vy + b.vy) * 0.2, 1);

    objects.splice(j, 1);
    objects.splice(i, 1);
    objects.push(merged);

    score += nextFruit.score;
    bestScore = Math.max(bestScore, score);
    localStorage.setItem(BEST_KEY, String(bestScore));

    playMergeSound(nextType);
    updateUI();
  }

  function checkDangerLine() {
    const dangerY = getDangerLineY();

    const hasDanger = objects.some((item) => {
      return item.y - item.radius < dangerY + 6 && Math.abs(item.vy) < 0.65;
    });

    if (!hasDanger) {
      dangerStartAt = 0;
      return;
    }

    if (!dangerStartAt) {
      dangerStartAt = performance.now();
      return;
    }

    if (performance.now() - dangerStartAt > 2100) {
      endGame();
    }
  }

  function drawBackground() {
    ctx.clearRect(0, 0, logicalWidth, logicalHeight);

    const floorY = getFloorY();
    const dangerY = getDangerLineY();

    const bgGradient = ctx.createLinearGradient(0, 0, 0, logicalHeight);
    bgGradient.addColorStop(0, "#f9fffd");
    bgGradient.addColorStop(0.55, "#edf9f6");
    bgGradient.addColorStop(1, "#dff4ec");

    ctx.fillStyle = bgGradient;
    roundRect(ctx, 0, 0, logicalWidth, logicalHeight, 18);
    ctx.fill();

    ctx.fillStyle = "rgba(121, 207, 173, 0.16)";
    ctx.fillRect(0, floorY - 105, logicalWidth, 105);

    ctx.save();
    ctx.strokeStyle = "#35c8bb";
    ctx.lineWidth = 4;
    ctx.setLineDash([10, 12]);
    ctx.beginPath();
    ctx.moveTo(0, dangerY);
    ctx.lineTo(logicalWidth, dangerY);
    ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.strokeStyle = "rgba(241, 212, 104, 0.72)";
    ctx.lineWidth = 3;
    ctx.setLineDash([8, 14]);
    ctx.beginPath();
    ctx.moveTo(aimX, dangerY);
    ctx.lineTo(aimX, floorY - 8);
    ctx.stroke();
    ctx.restore();

    drawLabel("Danger Line", 26, dangerY - 37);

    const warmText = isMobileMode() ? "Warm Up" : "Pressure";
    const textWidth = isMobileMode() ? 82 : 72;
    drawLabel(warmText, logicalWidth - textWidth - 25, dangerY - 37);
  }

  function drawLabel(text, x, y) {
    ctx.save();

    ctx.fillStyle = "rgba(255,255,255,0.88)";
    roundRect(ctx, x, y, text.length * 9 + 24, 28, 6);
    ctx.fill();

    ctx.fillStyle = "#189c93";
    ctx.font = "700 15px system-ui, sans-serif";
    ctx.fillText(text, x + 12, y + 19);

    ctx.restore();
  }

  function drawPreviewFruit() {
    if (!running || gameOver) return;

    const fruit = fruits[currentFruitIndex];
    const x = clamp(aimX, fruit.radius + 2, logicalWidth - fruit.radius - 2);
    const y = getSpawnY();

    drawFruitShape(ctx, currentFruitIndex, x, y, fruit.radius, 0.96);
  }

  function drawObjects() {
    objects
      .slice()
      .sort((a, b) => a.radius - b.radius)
      .forEach((item) => {
        drawFruitShape(ctx, item.type, item.x, item.y, item.radius);
      });
  }

  function draw() {
    drawBackground();
    drawPreviewFruit();
    drawObjects();
  }

  function roundRect(context, x, y, width, height, radius) {
    const r = Math.min(radius, width / 2, height / 2);

    context.beginPath();
    context.moveTo(x + r, y);
    context.arcTo(x + width, y, x + width, y + height, r);
    context.arcTo(x + width, y + height, x, y + height, r);
    context.arcTo(x, y + height, x, y, r);
    context.arcTo(x, y, x + width, y, r);
    context.closePath();
  }

  function updateAimFromEvent(event) {
    const rect = canvas.getBoundingClientRect();

    let clientX = event.clientX;

    if (event.touches && event.touches[0]) {
      clientX = event.touches[0].clientX;
    }

    const relativeX = clientX - rect.left;
    aimX = clamp((relativeX / rect.width) * logicalWidth, 20, logicalWidth - 20);
  }

  function loop(now) {
    if (running && !gameOver) {
      elapsedSeconds = Math.floor((now - startTime) / 1000);
      updatePhysics();
      updateUI();
    }

    draw();

    requestAnimationFrame(loop);
  }

  function startAudioContext() {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }

    if (audioCtx.state === "suspended") {
      audioCtx.resume();
    }
  }

  function playTone(freq, duration, type = "sine", volume = 0.04) {
    if (!musicEnabled) return;

    try {
      startAudioContext();

      const oscillator = audioCtx.createOscillator();
      const gain = audioCtx.createGain();

      oscillator.type = type;
      oscillator.frequency.value = freq;

      gain.gain.setValueAtTime(0, audioCtx.currentTime);
      gain.gain.linearRampToValueAtTime(volume, audioCtx.currentTime + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + duration);

      oscillator.connect(gain);
      gain.connect(audioCtx.destination);

      oscillator.start();
      oscillator.stop(audioCtx.currentTime + duration);
    } catch (error) {}
  }

  function playDropSound() {
    playTone(360, 0.08, "triangle", 0.035);
  }

  function playMergeSound(level) {
    playTone(440 + level * 34, 0.1, "sine", 0.04);
    setTimeout(() => playTone(660 + level * 30, 0.08, "triangle", 0.03), 55);
  }

  function startMusic() {
    if (!musicEnabled || musicTimer) return;

    try {
      startAudioContext();

      let step = 0;
      const notes = [261.63, 329.63, 392.0, 523.25, 392.0, 329.63];

      musicTimer = setInterval(() => {
        if (!running || gameOver || !musicEnabled) return;

        playTone(notes[step % notes.length], 0.13, "sine", 0.018);
        step++;
      }, 650);
    } catch (error) {}
  }

  function stopMusic() {
    if (musicTimer) {
      clearInterval(musicTimer);
      musicTimer = null;
    }
  }

  function toggleMusic() {
    musicEnabled = !musicEnabled;
    localStorage.setItem(MUSIC_KEY, musicEnabled ? "on" : "off");
    updateMusicButton();

    if (musicEnabled && running && !gameOver) {
      startMusic();
    } else {
      stopMusic();
    }
  }

  function updateMusicButton() {
    if (!musicToggleButton) return;

    musicToggleButton.textContent = musicEnabled ? "♪" : "×";
    musicToggleButton.setAttribute("aria-label", musicEnabled ? "Music on" : "Music off");
  }

  function setMobileMode(value) {
    mobileModeForced = Boolean(value);
    configureCanvas();
    updateNextCanvases();
  }

  function bindEvents() {
    startButton?.addEventListener("click", startGame);
    restartButton?.addEventListener("click", restartGame);
    playAgainButton?.addEventListener("click", restartGame);
    musicToggleButton?.addEventListener("click", toggleMusic);

    canvas.addEventListener("pointermove", (event) => {
      updateAimFromEvent(event);
    });

    canvas.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      updateAimFromEvent(event);
      dropFruit();
    });

    canvas.addEventListener("touchmove", (event) => {
      event.preventDefault();
      updateAimFromEvent(event);
    }, { passive: false });

    canvas.addEventListener("touchstart", (event) => {
      event.preventDefault();
      updateAimFromEvent(event);
      dropFruit();
    }, { passive: false });

    window.addEventListener("resize", () => {
      configureCanvas();
      updateNextCanvases();
    });
  }

  function init() {
    loadFruitImages();
    configureCanvas();
    createNextQueue();
    updateNextCanvases();
    updateUI();
    updateMusicButton();
    renderLeaderboard();
    buildEvolutionCircle();
    bindEvents();

    requestAnimationFrame(loop);
  }

  window.FruitMergeGame = {
    restartGame,
    startGame,
    setMobileMode,
    getScore: () => score
  };

  init();
})();
