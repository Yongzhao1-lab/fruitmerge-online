"use strict";

/* =========================================================
   Fruit Merge Online - Final Stable game.js
   Core rules:
   - Canvas internal size stays 420 x 560.
   - CSS can scale canvas visually.
   - All input coordinates are converted through getBoundingClientRect().
   - Desktop: move mouse to aim, click to drop.
   - Mobile: tap where you want the fruit to drop.
   ========================================================= */

(() => {
  /* =========================
     DOM
     ========================= */

  const canvas = document.getElementById("gameCanvas");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");

  const scoreEl = document.getElementById("score");
  const panelScoreEl = document.getElementById("panelScore");
  const timeEl = document.getElementById("time");
  const bestScoreEl = document.getElementById("bestScore");

  const nextFruitNameEl = document.getElementById("nextFruitName");
  const nextFruitCanvas0 = document.getElementById("nextFruitCanvas0");
  const nextFruitCanvas1 = document.getElementById("nextFruitCanvas1");
  const nextFruitCanvas2 = document.getElementById("nextFruitCanvas2");

  const restartButton = document.getElementById("restartButton");
  const startButton = document.getElementById("startButton");
  const playAgainButton = document.getElementById("playAgainButton");

  const startOverlay = document.getElementById("startOverlay");
  const gameOverPanel = document.getElementById("gameOverPanel");
  const gameOverOverlay = document.getElementById("gameOverOverlay");

  const gameOverBadge = document.getElementById("gameOverBadge");
  const gameOverScore = document.getElementById("gameOverScore");
  const gameOverTime = document.getElementById("gameOverTime");
  const gameOverBest = document.getElementById("gameOverBest");
  const gameOverTip = document.getElementById("gameOverTip");

  const leaderboardList = document.getElementById("leaderboardList");
  const musicToggleButton = document.getElementById("musicToggleButton");

  /* =========================
     Canvas constants
     ========================= */

  const WORLD_WIDTH = 420;
  const WORLD_HEIGHT = 560;

  canvas.width = WORLD_WIDTH;
  canvas.height = WORLD_HEIGHT;

  const WALL_LEFT = 12;
  const WALL_RIGHT = WORLD_WIDTH - 12;
  const FLOOR_Y = WORLD_HEIGHT - 12;
  const CEILING_Y = 0;
  const DANGER_LINE_Y = 92;

  const GRAVITY = 1500;
  const WALL_BOUNCE = 0.28;
  const FLOOR_BOUNCE = 0.22;
  const FRICTION = 0.985;
  const POSITION_ITERATIONS = 3;

  const DROP_Y = 42;
  const DROP_COOLDOWN = 420;
  const GAME_OVER_HOLD = 1900;

  const LOCAL_BEST_KEY = "fruitMergeBestScore_v2";
  const LOCAL_RUNS_KEY = "fruitMergeTopRuns_v2";

  /* =========================
     Fruit data
     ========================= */

  const fruits = [
    {
      name: "Cherry",
      radius: 15,
      score: 5,
      type: "cherry",
      files: ["cherry.png"],
      color: "#ff4a42",
      emoji: "🍒",
      visualScale: 1.35
    },
    {
      name: "Strawberry",
      radius: 20,
      score: 10,
      type: "strawberry",
      files: ["strawberry.png"],
      color: "#ff5148",
      emoji: "🍓",
      visualScale: 1.26
    },
    {
      name: "Grape",
      radius: 25,
      score: 20,
      type: "grape",
      files: ["grape.png"],
      color: "#a65bff",
      emoji: "🍇",
      visualScale: 1.16
    },
    {
      name: "Orange",
      radius: 32,
      score: 40,
      type: "orange",
      files: ["orange.png"],
      color: "#ff9f2e",
      emoji: "🍊",
      visualScale: 1.12
    },
    {
      name: "Apple",
      radius: 39,
      score: 80,
      type: "apple",
      files: ["apple.png"],
      color: "#f64340",
      emoji: "🍎",
      visualScale: 1.1
    },
    {
      name: "Peach",
      radius: 48,
      score: 160,
      type: "peach",
      files: ["peach.png"],
      color: "#ff9872",
      emoji: "🍑",
      visualScale: 1.08
    },
    {
      name: "Pineapple",
      radius: 57,
      score: 320,
      type: "pineapple",
      files: ["pineapple.png"],
      color: "#ffc238",
      emoji: "🍍",
      visualScale: 1.02
    },
    {
      name: "Watermelon",
      radius: 68,
      score: 640,
      type: "watermelon",
      files: ["watermelon.png"],
      color: "#30c765",
      emoji: "🍉",
      visualScale: 1.02
    },
    {
      name: "Grapefruit",
      radius: 80,
      score: 1280,
      type: "grapefruit",
      files: ["grapefruit.png", "pomelo.png", "yuzu.png", "lemon.png"],
      color: "#ffe45b",
      emoji: "🍋",
      visualScale: 1
    },
    {
      name: "Melon",
      radius: 92,
      score: 2560,
      type: "melon",
      files: ["melon.png", "hami-melon.png", "honeydew.png", "cantaloupe.png"],
      color: "#d9e66d",
      emoji: "🍈",
      visualScale: 0.98
    },
    {
      name: "Dragon Fruit",
      radius: 106,
      score: 5120,
      type: "dragonfruit",
      files: ["dragonfruit.png", "dragon-fruit.png", "dragon_fruit.png", "pitaya.png"],
      color: "#ff5098",
      emoji: "🐉",
      visualScale: 0.96
    }
  ];

  /* =========================
     Assets
     ========================= */

  const fruitImages = new Map();

  function loadFruitImage(fruit) {
    const image = new Image();
    const files = [...fruit.files];
    let index = 0;

    const setNextSource = () => {
      if (index >= files.length) {
        fruitImages.set(fruit.type, {
          image: null,
          loaded: false,
          failed: true
        });
        return;
      }

      image.src = `/assets/fruits/${files[index]}`;
    };

    fruitImages.set(fruit.type, {
      image,
      loaded: false,
      failed: false
    });

    image.onload = () => {
      fruitImages.set(fruit.type, {
        image,
        loaded: true,
        failed: false
      });
    };

    image.onerror = () => {
      index += 1;
      setNextSource();
    };

    setNextSource();
  }

  fruits.forEach(loadFruitImage);

  /* =========================
     State
     ========================= */

  let fruitId = 1;

  let fruitBodies = [];
  let nextQueue = [];

  let score = 0;
  let bestScore = loadBestScore();

  let running = false;
  let gameOver = false;
  let canDrop = false;

  let aimX = WORLD_WIDTH / 2;
  let lastFrameTime = performance.now();
  let gameStartTime = 0;
  let elapsedMs = 0;

  let warningTimer = 0;
  let lastDropAt = 0;
  let lastPointerDropAt = 0;

  let animationFrameId = null;

  /* =========================
     Utility
     ========================= */

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function randomInt(maxExclusive) {
    return Math.floor(Math.random() * maxExclusive);
  }

  function formatTime(ms) {
    const totalSeconds = Math.max(0, Math.floor(ms / 1000));
    const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, "0");
    const seconds = String(totalSeconds % 60).padStart(2, "0");
    return `${minutes}:${seconds}`;
  }

  function loadBestScore() {
    const saved = Number(localStorage.getItem(LOCAL_BEST_KEY) || "0");
    return Number.isFinite(saved) ? saved : 0;
  }

  function saveBestScore(value) {
    localStorage.setItem(LOCAL_BEST_KEY, String(value));
  }

  function getTopRuns() {
    try {
      const runs = JSON.parse(localStorage.getItem(LOCAL_RUNS_KEY) || "[]");
      return Array.isArray(runs) ? runs : [];
    } catch {
      return [];
    }
  }

  function saveRun(finalScore, finalTime) {
    const runs = getTopRuns();

    runs.push({
      score: finalScore,
      time: finalTime,
      date: new Date().toISOString()
    });

    runs.sort((a, b) => Number(b.score || 0) - Number(a.score || 0));

    localStorage.setItem(LOCAL_RUNS_KEY, JSON.stringify(runs.slice(0, 5)));
  }

  function getCanvasPointFromClient(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();

    const scaleX = WORLD_WIDTH / rect.width;
    const scaleY = WORLD_HEIGHT / rect.height;

    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY
    };
  }

  function getCurrentFruitIndex() {
    return nextQueue[0] ?? 0;
  }

  function getDropRadius() {
    const fruit = fruits[getCurrentFruitIndex()];
    return fruit ? fruit.radius : 15;
  }

  function setAimByClientX(clientX) {
    const point = getCanvasPointFromClient(clientX, 0);
    const radius = getDropRadius();

    aimX = clamp(point.x, WALL_LEFT + radius, WALL_RIGHT - radius);
  }

  function isMobilePointer(event) {
    return event.pointerType === "touch" || event.pointerType === "pen";
  }

  function isPrimaryPointer(event) {
    return event.isPrimary !== false;
  }

  function isValidGameInput() {
    return running && !gameOver;
  }

  /* =========================
     UI
     ========================= */

  function updateScoreUI() {
    if (scoreEl) scoreEl.textContent = String(score);
    if (panelScoreEl) panelScoreEl.textContent = String(score);
    if (bestScoreEl) bestScoreEl.textContent = String(bestScore);
  }

  function updateTimeUI() {
    if (timeEl) timeEl.textContent = formatTime(elapsedMs);
  }

  function updateLeaderboardUI() {
    if (!leaderboardList) return;

    const runs = getTopRuns();

    if (!runs.length) {
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

    leaderboardList.innerHTML = runs.slice(0, 5).map((run, index) => {
      const safeScore = Number(run.score || 0);
      const safeTime = run.time || "00:00";

      return `
        <div class="leaderboard-item">
          <div class="leaderboard-rank">${index + 1}</div>
          <div class="leaderboard-main">
            <strong>${safeScore}</strong>
            <span>${safeTime}</span>
          </div>
          <div class="leaderboard-score">${safeScore}</div>
        </div>
      `;
    }).join("");
  }

  function drawFruitPreview(canvasEl, fruitIndex) {
    if (!canvasEl) return;

    const previewCtx = canvasEl.getContext("2d");
    const width = canvasEl.width;
    const height = canvasEl.height;

    previewCtx.clearRect(0, 0, width, height);

    const fruit = fruits[fruitIndex];
    if (!fruit) return;

    drawFruitGraphic(previewCtx, fruitIndex, width / 2, height / 2, Math.min(width, height) * 0.36, 0, true);
  }

  function updateNextUI() {
    const firstIndex = nextQueue[0] ?? 0;
    const secondIndex = nextQueue[1] ?? 0;
    const thirdIndex = nextQueue[2] ?? 0;

    if (nextFruitNameEl) {
      nextFruitNameEl.textContent = fruits[firstIndex]?.name || "Cherry";
    }

    drawFruitPreview(nextFruitCanvas0, firstIndex);
    drawFruitPreview(nextFruitCanvas1, secondIndex);
    drawFruitPreview(nextFruitCanvas2, thirdIndex);
  }

  function showStartOverlay() {
    startOverlay?.classList.remove("hidden");
  }

  function hideStartOverlay() {
    startOverlay?.classList.add("hidden");
  }

  function hideGameOver() {
    gameOverPanel?.classList.add("hidden");
    gameOverOverlay?.classList.add("hidden");
  }

  function showGameOver() {
    if (gameOverBadge) gameOverBadge.textContent = score >= bestScore ? "New Best" : "Game Over";
    if (gameOverScore) gameOverScore.textContent = String(score);
    if (gameOverTime) gameOverTime.textContent = formatTime(elapsedMs);
    if (gameOverBest) gameOverBest.textContent = String(bestScore);

    if (gameOverTip) {
      if (score >= 3000) {
        gameOverTip.textContent = "Great run! You are close to mastering the fruit chain.";
      } else if (score >= 1000) {
        gameOverTip.textContent = "Nice score! Try keeping larger fruits near the sides.";
      } else {
        gameOverTip.textContent = "Keep the center open and use the next fruit preview.";
      }
    }

    gameOverPanel?.classList.remove("hidden");
    gameOverOverlay?.classList.remove("hidden");
  }

  /* =========================
     Next Queue
     ========================= */

  function getRandomSpawnIndex() {
    return randomInt(5);
  }

  function refillQueue() {
    while (nextQueue.length < 3) {
      nextQueue.push(getRandomSpawnIndex());
    }
  }

  function consumeNextFruit() {
    const index = nextQueue.shift() ?? getRandomSpawnIndex();
    nextQueue.push(getRandomSpawnIndex());
    updateNextUI();
    return index;
  }

  /* =========================
     Fruit body
     ========================= */

  function createFruitBody(index, x, y) {
    const fruit = fruits[index];

    return {
      id: fruitId++,
      index,
      x,
      y,
      vx: (Math.random() - 0.5) * 18,
      vy: 0,
      r: fruit.radius,
      rotation: Math.random() * Math.PI * 2,
      angularVelocity: (Math.random() - 0.5) * 1.6,
      bornAt: performance.now(),
      merging: false,
      settledAt: 0
    };
  }

  function dropFruit() {
    if (!isValidGameInput()) return;
    if (!canDrop) return;

    const now = performance.now();

    if (now - lastDropAt < DROP_COOLDOWN) return;

    const fruitIndex = consumeNextFruit();
    const fruit = fruits[fruitIndex];

    const x = clamp(aimX, WALL_LEFT + fruit.radius, WALL_RIGHT - fruit.radius);
    const body = createFruitBody(fruitIndex, x, DROP_Y);

    fruitBodies.push(body);

    canDrop = false;
    lastDropAt = now;

    playDropSound();

    setTimeout(() => {
      if (running && !gameOver) {
        canDrop = true;
      }
    }, DROP_COOLDOWN);
  }

  function mergeFruits(a, b) {
    if (a.merging || b.merging) return;
    if (a.index !== b.index) return;
    if (a.index >= fruits.length - 1) return;

    a.merging = true;
    b.merging = true;

    const nextIndex = a.index + 1;
    const nextFruit = fruits[nextIndex];

    const mergedX = clamp((a.x + b.x) / 2, WALL_LEFT + nextFruit.radius, WALL_RIGHT - nextFruit.radius);
    const mergedY = clamp((a.y + b.y) / 2, CEILING_Y + nextFruit.radius, FLOOR_Y - nextFruit.radius);

    const merged = createFruitBody(nextIndex, mergedX, mergedY);

    merged.vx = (a.vx + b.vx) * 0.22;
    merged.vy = Math.min((a.vy + b.vy) * 0.18, 120);
    merged.angularVelocity = (Math.random() - 0.5) * 1.8;

    fruitBodies = fruitBodies.filter((fruit) => fruit.id !== a.id && fruit.id !== b.id);
    fruitBodies.push(merged);

    score += nextFruit.score;
    bestScore = Math.max(bestScore, score);

    saveBestScore(bestScore);
    updateScoreUI();

    playMergeSound(nextIndex);
  }

  /* =========================
     Physics
     ========================= */

  function updatePhysics(dt) {
    const seconds = dt / 1000;
    const subSteps = Math.max(1, Math.min(3, Math.ceil(seconds / 0.012)));
    const step = seconds / subSteps;

    for (let s = 0; s < subSteps; s += 1) {
      integrate(step);

      for (let i = 0; i < POSITION_ITERATIONS; i += 1) {
        resolveWalls();
        resolveCollisions();
      }

      resolveMergePairs();
    }
  }

  function integrate(step) {
    for (const body of fruitBodies) {
      body.vy += GRAVITY * step;

      body.x += body.vx * step;
      body.y += body.vy * step;

      body.rotation += body.angularVelocity * step;

      body.vx *= FRICTION;
      body.angularVelocity *= 0.995;
    }
  }

  function resolveWalls() {
    for (const body of fruitBodies) {
      if (body.x - body.r < WALL_LEFT) {
        body.x = WALL_LEFT + body.r;
        body.vx = Math.abs(body.vx) * WALL_BOUNCE;
      }

      if (body.x + body.r > WALL_RIGHT) {
        body.x = WALL_RIGHT - body.r;
        body.vx = -Math.abs(body.vx) * WALL_BOUNCE;
      }

      if (body.y + body.r > FLOOR_Y) {
        body.y = FLOOR_Y - body.r;

        if (Math.abs(body.vy) < 80) {
          body.vy = 0;
          body.settledAt = performance.now();
        } else {
          body.vy = -Math.abs(body.vy) * FLOOR_BOUNCE;
        }

        body.vx *= 0.88;
        body.angularVelocity *= 0.88;
      }
    }
  }

  function resolveCollisions() {
    for (let i = 0; i < fruitBodies.length; i += 1) {
      for (let j = i + 1; j < fruitBodies.length; j += 1) {
        const a = fruitBodies[i];
        const b = fruitBodies[j];

        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const distanceSq = dx * dx + dy * dy;
        const minDistance = a.r + b.r;

        if (distanceSq <= 0 || distanceSq >= minDistance * minDistance) continue;

        const distance = Math.sqrt(distanceSq);
        const nx = dx / distance;
        const ny = dy / distance;

        const overlap = minDistance - distance;
        const correction = overlap * 0.5;

        a.x -= nx * correction;
        a.y -= ny * correction;
        b.x += nx * correction;
        b.y += ny * correction;

        const relativeVx = b.vx - a.vx;
        const relativeVy = b.vy - a.vy;
        const velocityAlongNormal = relativeVx * nx + relativeVy * ny;

        if (velocityAlongNormal > 0) continue;

        const restitution = 0.12;
        const impulse = -(1 + restitution) * velocityAlongNormal * 0.5;

        const impulseX = impulse * nx;
        const impulseY = impulse * ny;

        a.vx -= impulseX;
        a.vy -= impulseY;
        b.vx += impulseX;
        b.vy += impulseY;

        const tangentX = -ny;
        const tangentY = nx;
        const tangentVelocity = relativeVx * tangentX + relativeVy * tangentY;
        const frictionImpulse = tangentVelocity * 0.012;

        a.vx += tangentX * frictionImpulse;
        a.vy += tangentY * frictionImpulse;
        b.vx -= tangentX * frictionImpulse;
        b.vy -= tangentY * frictionImpulse;
      }
    }
  }

  function resolveMergePairs() {
    let mergeA = null;
    let mergeB = null;
    let bestDistance = Infinity;

    for (let i = 0; i < fruitBodies.length; i += 1) {
      for (let j = i + 1; j < fruitBodies.length; j += 1) {
        const a = fruitBodies[i];
        const b = fruitBodies[j];

        if (a.merging || b.merging) continue;
        if (a.index !== b.index) continue;
        if (a.index >= fruits.length - 1) continue;

        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const mergeDistance = (a.r + b.r) * 0.82;

        if (distance <= mergeDistance && distance < bestDistance) {
          bestDistance = distance;
          mergeA = a;
          mergeB = b;
        }
      }
    }

    if (mergeA && mergeB) {
      mergeFruits(mergeA, mergeB);
    }
  }

  function updateGameOverState(dt) {
    const now = performance.now();

    const dangerFruit = fruitBodies.some((body) => {
      if (now - body.bornAt < 1200) return false;

      const aboveLine = body.y - body.r < DANGER_LINE_Y;
      const slowEnough = Math.abs(body.vy) < 95;

      return aboveLine && slowEnough;
    });

    if (dangerFruit) {
      warningTimer += dt;
    } else {
      warningTimer = Math.max(0, warningTimer - dt * 2.4);
    }

    if (warningTimer >= GAME_OVER_HOLD) {
      endGame();
    }
  }

  /* =========================
     Drawing
     ========================= */

  function clearCanvas() {
    ctx.clearRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
  }

  function drawBackground() {
    const gradient = ctx.createLinearGradient(0, 0, 0, WORLD_HEIGHT);
    gradient.addColorStop(0, "#e9fff8");
    gradient.addColorStop(0.42, "#f3fffb");
    gradient.addColorStop(1, "#e0f6ef");

    ctx.fillStyle = gradient;
    roundRect(ctx, WALL_LEFT, 6, WALL_RIGHT - WALL_LEFT, FLOOR_Y + 2, 18);
    ctx.fill();

    ctx.save();

    ctx.strokeStyle = "rgba(255, 112, 91, 0.72)";
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 8]);
    ctx.beginPath();
    ctx.moveTo(WALL_LEFT + 8, DANGER_LINE_Y);
    ctx.lineTo(WALL_RIGHT - 8, DANGER_LINE_Y);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = "rgba(255, 94, 86, 0.88)";
    ctx.font = "900 11px system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif";
    ctx.textAlign = "left";
    ctx.fillText("DANGER LINE", WALL_LEFT + 12, DANGER_LINE_Y - 8);

    ctx.strokeStyle = "rgba(78, 131, 116, 0.18)";
    ctx.lineWidth = 3;
    ctx.strokeRect(WALL_LEFT, 6, WALL_RIGHT - WALL_LEFT, FLOOR_Y + 2);

    ctx.restore();
  }

  function drawAimPreview() {
    if (!running || gameOver || !canDrop) return;

    const index = getCurrentFruitIndex();
    const fruit = fruits[index];

    const x = clamp(aimX, WALL_LEFT + fruit.radius, WALL_RIGHT - fruit.radius);
    const y = DROP_Y;

    ctx.save();

    ctx.globalAlpha = 0.28;
    ctx.strokeStyle = fruit.color;
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 6]);
    ctx.beginPath();
    ctx.moveTo(x, 10);
    ctx.lineTo(x, FLOOR_Y - 5);
    ctx.stroke();

    ctx.globalAlpha = 0.72;
    drawFruitGraphic(ctx, index, x, y, fruit.radius, 0, false);

    ctx.restore();
  }

  function drawFruitBodies() {
    const sorted = [...fruitBodies].sort((a, b) => a.y - b.y);

    for (const body of sorted) {
      drawFruitGraphic(ctx, body.index, body.x, body.y, body.r, body.rotation, false);
    }
  }

  function drawWarningOverlay() {
    if (warningTimer <= 0) return;

    const alpha = clamp(warningTimer / GAME_OVER_HOLD, 0, 1);

    ctx.save();

    ctx.globalAlpha = alpha * 0.18;
    ctx.fillStyle = "#ff4a42";
    ctx.fillRect(WALL_LEFT, 6, WALL_RIGHT - WALL_LEFT, FLOOR_Y);

    ctx.globalAlpha = alpha;
    ctx.fillStyle = "#ff554d";
    ctx.font = "900 13px system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("Too high!", WORLD_WIDTH / 2, DANGER_LINE_Y - 22);

    ctx.restore();
  }

  function drawFruitGraphic(targetCtx, fruitIndex, x, y, radius, rotation = 0, preview = false) {
    const fruit = fruits[fruitIndex];
    if (!fruit) return;

    const asset = fruitImages.get(fruit.type);
    const drawRadius = preview ? radius * 1.18 : radius * fruit.visualScale;
    const size = drawRadius * 2;

    targetCtx.save();
    targetCtx.translate(x, y);
    targetCtx.rotate(rotation);

    if (asset && asset.loaded && asset.image) {
      targetCtx.drawImage(asset.image, -size / 2, -size / 2, size, size);
    } else {
      const gradient = targetCtx.createRadialGradient(
        -radius * 0.35,
        -radius * 0.35,
        radius * 0.12,
        0,
        0,
        radius
      );

      gradient.addColorStop(0, "#ffffff");
      gradient.addColorStop(0.16, fruit.color);
      gradient.addColorStop(1, shadeColor(fruit.color, -18));

      targetCtx.fillStyle = gradient;
      targetCtx.beginPath();
      targetCtx.arc(0, 0, radius, 0, Math.PI * 2);
      targetCtx.fill();

      targetCtx.lineWidth = Math.max(2, radius * 0.08);
      targetCtx.strokeStyle = "rgba(255,255,255,0.55)";
      targetCtx.stroke();

      targetCtx.font = `${Math.floor(radius * 1.05)}px serif`;
      targetCtx.textAlign = "center";
      targetCtx.textBaseline = "middle";
      targetCtx.fillText(fruit.emoji, 0, 1);
    }

    targetCtx.restore();
  }

  function roundRect(targetCtx, x, y, width, height, radius) {
    const r = Math.min(radius, width / 2, height / 2);

    targetCtx.beginPath();
    targetCtx.moveTo(x + r, y);
    targetCtx.arcTo(x + width, y, x + width, y + height, r);
    targetCtx.arcTo(x + width, y + height, x, y + height, r);
    targetCtx.arcTo(x, y + height, x, y, r);
    targetCtx.arcTo(x, y, x + width, y, r);
    targetCtx.closePath();
  }

  function shadeColor(hex, percent) {
    const normalized = hex.replace("#", "");
    const num = parseInt(normalized, 16);

    let r = (num >> 16) + percent;
    let g = ((num >> 8) & 0x00ff) + percent;
    let b = (num & 0x0000ff) + percent;

    r = clamp(r, 0, 255);
    g = clamp(g, 0, 255);
    b = clamp(b, 0, 255);

    return `rgb(${r}, ${g}, ${b})`;
  }

  function render() {
    clearCanvas();
    drawBackground();
    drawAimPreview();
    drawFruitBodies();
    drawWarningOverlay();
  }

  /* =========================
     Game lifecycle
     ========================= */

  function resetGame({ keepOverlay = false } = {}) {
    fruitBodies = [];
    nextQueue = [];
    score = 0;
    elapsedMs = 0;
    warningTimer = 0;
    lastDropAt = 0;
    canDrop = false;
    gameOver = false;
    running = false;
    aimX = WORLD_WIDTH / 2;

    refillQueue();
    updateScoreUI();
    updateTimeUI();
    updateNextUI();
    updateLeaderboardUI();
    hideGameOver();

    if (!keepOverlay) {
      hideStartOverlay();
    }

    render();
  }

  function startGame() {
    resetGame({ keepOverlay: false });

    running = true;
    gameOver = false;
    canDrop = true;

    gameStartTime = performance.now();
    lastFrameTime = performance.now();

    hideStartOverlay();
    hideGameOver();

    startMusicIfEnabled();

    if (!animationFrameId) {
      animationFrameId = requestAnimationFrame(loop);
    }
  }

  function restartGame() {
    startGame();
  }

  function endGame() {
    if (gameOver) return;

    gameOver = true;
    running = false;
    canDrop = false;

    bestScore = Math.max(bestScore, score);
    saveBestScore(bestScore);

    const finalTime = formatTime(elapsedMs);
    saveRun(score, finalTime);

    updateScoreUI();
    updateLeaderboardUI();
    showGameOver();

    playGameOverSound();
  }

  function loop(now) {
    animationFrameId = requestAnimationFrame(loop);

    const dt = clamp(now - lastFrameTime, 0, 32);
    lastFrameTime = now;

    if (running && !gameOver) {
      elapsedMs = now - gameStartTime;
      updateTimeUI();
      updatePhysics(dt);
      updateGameOverState(dt);
    }

    render();
  }

  /* =========================
     Input
     ========================= */

  function handlePointerMove(event) {
    if (!isValidGameInput()) return;
    if (!isPrimaryPointer(event)) return;

    setAimByClientX(event.clientX);
  }

  function handlePointerDown(event) {
    if (!isValidGameInput()) return;
    if (!isPrimaryPointer(event)) return;

    event.preventDefault();

    setAimByClientX(event.clientX);

    const now = performance.now();

    if (isMobilePointer(event)) {
      if (now - lastPointerDropAt < 180) return;
      lastPointerDropAt = now;
      dropFruit();
      return;
    }

    if (event.pointerType === "mouse" || event.pointerType === "") {
      dropFruit();
    }
  }

  function handleMouseMove(event) {
    if (!window.PointerEvent) {
      if (!isValidGameInput()) return;
      setAimByClientX(event.clientX);
    }
  }

  function handleMouseDown(event) {
    if (!window.PointerEvent) {
      if (!isValidGameInput()) return;
      event.preventDefault();
      setAimByClientX(event.clientX);
      dropFruit();
    }
  }

  function handleTouchStart(event) {
    if (window.PointerEvent) return;
    if (!isValidGameInput()) return;

    const touch = event.changedTouches && event.changedTouches[0];
    if (!touch) return;

    event.preventDefault();

    setAimByClientX(touch.clientX);
    dropFruit();
  }

  function handleTouchMove(event) {
    if (window.PointerEvent) return;
    if (!isValidGameInput()) return;

    const touch = event.changedTouches && event.changedTouches[0];
    if (!touch) return;

    event.preventDefault();

    setAimByClientX(touch.clientX);
  }

  canvas.addEventListener("pointermove", handlePointerMove, { passive: true });
  canvas.addEventListener("pointerdown", handlePointerDown, { passive: false });

  canvas.addEventListener("mousemove", handleMouseMove, { passive: true });
  canvas.addEventListener("mousedown", handleMouseDown, { passive: false });

  canvas.addEventListener("touchstart", handleTouchStart, { passive: false });
  canvas.addEventListener("touchmove", handleTouchMove, { passive: false });

  /* =========================
     Buttons
     ========================= */

  startButton?.addEventListener("click", (event) => {
    event.preventDefault();
    startGame();
  });

  restartButton?.addEventListener("click", (event) => {
    event.preventDefault();
    restartGame();
  });

  playAgainButton?.addEventListener("click", (event) => {
    event.preventDefault();
    restartGame();
  });

  musicToggleButton?.addEventListener("click", (event) => {
    event.preventDefault();
    toggleMusic();
  });

  /* =========================
     Audio
     ========================= */

  let audioContext = null;
  let masterGain = null;
  let musicTimer = null;
  let musicEnabled = localStorage.getItem("fruitMergeMusic") === "on";

  function ensureAudio() {
    if (audioContext) return;

    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;

    audioContext = new AudioContextClass();
    masterGain = audioContext.createGain();
    masterGain.gain.value = 0.045;
    masterGain.connect(audioContext.destination);
  }

  function playTone({ frequency = 440, duration = 0.08, type = "sine", gain = 0.05 }) {
    ensureAudio();

    if (!audioContext || !masterGain) return;

    if (audioContext.state === "suspended") {
      audioContext.resume().catch(() => {});
    }

    const oscillator = audioContext.createOscillator();
    const toneGain = audioContext.createGain();

    oscillator.type = type;
    oscillator.frequency.value = frequency;

    toneGain.gain.setValueAtTime(0.0001, audioContext.currentTime);
    toneGain.gain.exponentialRampToValueAtTime(gain, audioContext.currentTime + 0.01);
    toneGain.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + duration);

    oscillator.connect(toneGain);
    toneGain.connect(masterGain);

    oscillator.start();
    oscillator.stop(audioContext.currentTime + duration + 0.02);
  }

  function playDropSound() {
    playTone({
      frequency: 280,
      duration: 0.055,
      type: "triangle",
      gain: 0.022
    });
  }

  function playMergeSound(index) {
    playTone({
      frequency: 420 + index * 42,
      duration: 0.085,
      type: "sine",
      gain: 0.035
    });

    setTimeout(() => {
      playTone({
        frequency: 520 + index * 46,
        duration: 0.07,
        type: "triangle",
        gain: 0.022
      });
    }, 45);
  }

  function playGameOverSound() {
    playTone({
      frequency: 260,
      duration: 0.12,
      type: "sawtooth",
      gain: 0.025
    });

    setTimeout(() => {
      playTone({
        frequency: 190,
        duration: 0.16,
        type: "triangle",
        gain: 0.022
      });
    }, 100);
  }

  function startMusicIfEnabled() {
    if (!musicEnabled) return;
    startMusic();
  }

  function startMusic() {
    ensureAudio();

    if (!audioContext || musicTimer) return;

    if (audioContext.state === "suspended") {
      audioContext.resume().catch(() => {});
    }

    const notes = [523.25, 659.25, 783.99, 659.25, 587.33, 698.46, 880, 698.46];
    let index = 0;

    musicTimer = window.setInterval(() => {
      if (!musicEnabled || !running || gameOver) return;

      playTone({
        frequency: notes[index % notes.length],
        duration: 0.11,
        type: "sine",
        gain: 0.012
      });

      index += 1;
    }, 420);

    updateMusicButton();
  }

  function stopMusic() {
    if (musicTimer) {
      clearInterval(musicTimer);
      musicTimer = null;
    }

    updateMusicButton();
  }

  function toggleMusic() {
    musicEnabled = !musicEnabled;
    localStorage.setItem("fruitMergeMusic", musicEnabled ? "on" : "off");

    if (musicEnabled) {
      startMusic();
    } else {
      stopMusic();
    }

    updateMusicButton();
  }

  function updateMusicButton() {
    if (!musicToggleButton) return;

    musicToggleButton.textContent = musicEnabled ? "♪" : "♫";
    musicToggleButton.setAttribute("aria-pressed", musicEnabled ? "true" : "false");
    musicToggleButton.classList.toggle("is-on", musicEnabled);
  }

  /* =========================
     Resize
     ========================= */

  window.addEventListener("resize", () => {
    const radius = getDropRadius();
    aimX = clamp(aimX, WALL_LEFT + radius, WALL_RIGHT - radius);
    render();
  });

  /* =========================
     Init
     ========================= */

  function init() {
    bestScore = loadBestScore();
    resetGame({ keepOverlay: true });
    showStartOverlay();
    updateMusicButton();

    if (!animationFrameId) {
      lastFrameTime = performance.now();
      animationFrameId = requestAnimationFrame(loop);
    }
  }

  init();
})();
