const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const GAME_WIDTH = Number(canvas.getAttribute("width")) || 420;
const GAME_HEIGHT = Number(canvas.getAttribute("height")) || 600;

function setupCanvasDpi() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);

  canvas.style.width = `${GAME_WIDTH}px`;
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

let nextFruitCanvases = [];
let nextFruitContexts = [];

const fruits = [
  {
    name: "Cherry",
    radius: 16,
    score: 5,
    type: "cherry",
    color: "#ff3d3d",
    light: "#ff8a72",
    dark: "#c92a2a",
    visualScale: 1.22
  },
  {
    name: "Strawberry",
    radius: 21,
    score: 10,
    type: "strawberry",
    color: "#ff4b45",
    light: "#ff9a80",
    dark: "#c52a2d",
    visualScale: 1.12
  },
  {
    name: "Grape",
    radius: 27,
    score: 20,
    type: "grape",
    color: "#a35cff",
    light: "#d08bff",
    dark: "#6330b5",
    visualScale: 1.08,
    drawOffsetY: 2
  },
  {
    name: "Orange",
    radius: 34,
    score: 40,
    type: "orange",
    color: "#ff9f2d",
    light: "#ffd06a",
    dark: "#d56a08",
    visualScale: 1.04
  },
  {
    name: "Apple",
    radius: 42,
    score: 80,
    type: "apple",
    color: "#f5413f",
    light: "#ff8373",
    dark: "#b9282d",
    visualScale: 1.00
  },
  {
    name: "Lemon",
    radius: 51,
    score: 160,
    type: "lemon",
    color: "#ffe65c",
    light: "#fff6a8",
    dark: "#d8a914",
    visualScale: 1.00
  },
  {
    name: "Pineapple",
    radius: 61,
    score: 320,
    type: "pineapple",
    color: "#ffc236",
    light: "#ffe980",
    dark: "#c97908",
    visualScale: 0.98
  },
  {
    name: "Watermelon",
    radius: 72,
    score: 640,
    type: "watermelon",
    color: "#2fc760",
    light: "#91e96f",
    dark: "#0c7b37",
    visualScale: 0.94
  },
  {
    name: "Orange Big",
    radius: 84,
    score: 1280,
    type: "bigorange",
    color: "#ff9426",
    light: "#ffc66c",
    dark: "#c75f05",
    visualScale: 0.92
  },
  {
    name: "Melon",
    radius: 96,
    score: 2560,
    type: "melon",
    color: "#d8e66a",
    light: "#f4f7a8",
    dark: "#92a33e",
    visualScale: 0.90
  },
  {
    name: "Dragon Fruit",
    radius: 110,
    score: 5120,
    type: "dragonfruit",
    color: "#ff4f97",
    light: "#ff9bc8",
    dark: "#c21c67",
    visualScale: 0.90
  }
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

const gravity = 0.64;
const friction = 0.9;
const floorFriction = 0.68;
const bounce = 0.04;

const dropLineY = 98;
const spawnY = 54;

const initialDropVelocity = 2.45;
const maxHorizontalSpeed = 0.72;
const maxVerticalSpeed = 7.8;

const collisionSolverIterations = 8;
const collisionRestitution = 0.015;
const collisionCorrection = 0.78;
const maxCorrectionPerFrame = 6.2;

const collisionTightness = 0.99;
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

function setupNextPreviewUi() {
  const existingNext0 = document.getElementById("nextFruitCanvas0");
  const legacyNext = document.getElementById("nextFruitCanvas");

  if (!existingNext0 && legacyNext) {
    const wrapper = document.createElement("div");
    wrapper.className = "next-preview auto-next-preview";

    const sizes = [42, 36, 32];
    const labels = ["Next", "2nd", "3rd"];

    for (let i = 0; i < 3; i++) {
      const item = document.createElement("div");

      const previewCanvas = document.createElement("canvas");
      previewCanvas.id = `nextFruitCanvas${i}`;
      previewCanvas.width = sizes[i];
      previewCanvas.height = sizes[i];
      previewCanvas.style.width = `${sizes[i]}px`;
      previewCanvas.style.height = `${sizes[i]}px`;

      const label = document.createElement("small");
      label.textContent = labels[i];

      item.appendChild(previewCanvas);
      item.appendChild(label);
      wrapper.appendChild(item);
    }

    legacyNext.replaceWith(wrapper);
  }

  const ids = [
    "nextFruitCanvas0",
    "nextFruitCanvas1",
    "nextFruitCanvas2",
    "nextFruitCanvas"
  ];

  nextFruitCanvases = Array.from(
    new Set(
      ids
        .map((id) => document.getElementById(id))
        .filter(Boolean)
    )
  );

  nextFruitContexts = nextFruitCanvases.map((item) => {
    const context = item.getContext("2d");
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";
    return context;
  });
}

function polishRestartButton() {
  if (!restartButton) return;

  restartButton.style.width = "auto";
  restartButton.style.height = "auto";
  restartButton.style.minWidth = "92px";
  restartButton.style.minHeight = "44px";
  restartButton.style.padding = "12px 18px";
  restartButton.style.borderRadius = "999px";
  restartButton.style.fontSize = "14px";
  restartButton.style.fontWeight = "800";
  restartButton.style.boxShadow = "0 8px 20px rgba(255, 122, 80, 0.22)";
  restartButton.style.transform = "none";
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

    fruitImages.set(index, {
      image,
      loaded: false,
      failed: false
    });

    image.onload = () => {
      fruitImages.set(index, {
        image,
        loaded: true,
        failed: false
      });

      updateNextFruit();
    };

    image.onerror = () => {
      fruitImages.set(index, {
        image: null,
        loaded: false,
        failed: true
      });

      updateNextFruit();
    };

    image.src = svgToDataUri(createFruitSvg(fruit));
  });
}

function svgToDataUri(svg) {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function createFruitSvg(fruit) {
  const id = fruit.type;
  const stroke = "#8b5a22";

  const defs = `
    <defs>
      <radialGradient id="body-${id}" cx="34%" cy="26%" r="78%">
        <stop offset="0%" stop-color="#fff8c8"/>
        <stop offset="20%" stop-color="${fruit.light}"/>
        <stop offset="68%" stop-color="${fruit.color}"/>
        <stop offset="100%" stop-color="${fruit.dark}"/>
      </radialGradient>

      <linearGradient id="leaf-${id}" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#dcff7a"/>
        <stop offset="45%" stop-color="#65d63b"/>
        <stop offset="100%" stop-color="#24932a"/>
      </linearGradient>

      <linearGradient id="stem-${id}" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#c5762b"/>
        <stop offset="100%" stop-color="#764018"/>
      </linearGradient>

      <filter id="softShadow-${id}" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="5" stdDeviation="3" flood-color="#000000" flood-opacity="0.14"/>
      </filter>
    </defs>
  `;

  function wrap(content) {
    return `
      <svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256">
        ${defs}
        <g filter="url(#softShadow-${id})" stroke-linecap="round" stroke-linejoin="round">
          ${content}
        </g>
      </svg>
    `;
  }

  function gloss(x = 88, y = 80, rx = 23, ry = 12) {
    return `
      <ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="#fff" opacity="0.55" transform="rotate(-32 ${x} ${y})"/>
      <circle cx="${x + 30}" cy="${y + 8}" r="7" fill="#fff" opacity="0.28"/>
    `;
  }

  function face(cx = 128, cy = 142, scale = 1) {
    return `
      <circle cx="${cx - 19 * scale}" cy="${cy}" r="${4.5 * scale}" fill="#5b341c" opacity="0.85"/>
      <circle cx="${cx + 19 * scale}" cy="${cy}" r="${4.5 * scale}" fill="#5b341c" opacity="0.85"/>
      <path d="M ${cx - 9 * scale} ${cy + 14 * scale} Q ${cx} ${cy + 23 * scale}, ${cx + 9 * scale} ${cy + 14 * scale}"
        fill="none" stroke="#5b341c" stroke-width="${4 * scale}" opacity="0.8"/>
      <circle cx="${cx - 33 * scale}" cy="${cy + 13 * scale}" r="${7 * scale}" fill="#ff8fa3" opacity="0.55"/>
      <circle cx="${cx + 33 * scale}" cy="${cy + 13 * scale}" r="${7 * scale}" fill="#ff8fa3" opacity="0.55"/>
    `;
  }

  function leaf(x, y, s, r = 0) {
    return `
      <path d="M ${x} ${y}
        C ${x + s * 0.55} ${y - s * 0.85}, ${x + s * 1.18} ${y - s * 0.18}, ${x + s * 0.88} ${y + s * 0.25}
        C ${x + s * 0.42} ${y + s * 0.42}, ${x + s * 0.10} ${y + s * 0.18}, ${x} ${y} Z"
        fill="url(#leaf-${id})"
        stroke="#2b7a1e"
        stroke-width="${Math.max(3, s * 0.12)}"
        transform="rotate(${r} ${x} ${y})"/>
    `;
  }

  function stem(x, y, h, r = 0, w = 8) {
    return `
      <path d="M ${x} ${y} Q ${x + h * 0.18} ${y - h * 0.45}, ${x + h * 0.06} ${y - h}"
        fill="none"
        stroke="url(#stem-${id})"
        stroke-width="${w}"
        transform="rotate(${r} ${x} ${y})"/>
    `;
  }

  if (fruit.type === "cherry") {
    return wrap(`
      ${stem(100, 94, 62, -22, 7)}
      ${stem(146, 96, 60, 24, 7)}
      ${leaf(123, 39, 27, -8)}

      <circle cx="94" cy="145" r="43" fill="url(#body-${id})" stroke="${stroke}" stroke-width="6"/>
      <circle cx="145" cy="148" r="40" fill="url(#body-${id})" stroke="${stroke}" stroke-width="6"/>

      <ellipse cx="78" cy="128" rx="12" ry="7" fill="#fff" opacity="0.48" transform="rotate(-35 78 128)"/>
      <ellipse cx="131" cy="131" rx="11" ry="6" fill="#fff" opacity="0.42" transform="rotate(-35 131 131)"/>
    `);
  }

  if (fruit.type === "strawberry") {
    const seeds = [
      [98, 96], [128, 88], [158, 98],
      [89, 126], [121, 121], [153, 128],
      [103, 157], [137, 158]
    ].map(([x, y]) => `
      <ellipse cx="${x}" cy="${y}" rx="4.5" ry="8" fill="#ffe06a" opacity="0.86" transform="rotate(20 ${x} ${y})"/>
    `).join("");

    return wrap(`
      <path d="M128 221
        C68 178, 52 105, 101 73
        C115 64, 141 64, 155 73
        C204 105, 188 178, 128 221 Z"
        fill="url(#body-${id})" stroke="${stroke}" stroke-width="6"/>

      ${gloss(92, 96, 20, 10)}
      ${seeds}

      ${leaf(91, 72, 27, -70)}
      ${leaf(112, 65, 30, -38)}
      ${leaf(133, 63, 31, -8)}
      ${leaf(153, 68, 28, 20)}
    `);
  }

  if (fruit.type === "grape") {
    const grapes = [
      [126, 72, 30], [94, 98, 31], [128, 102, 33], [160, 99, 31],
      [79, 132, 29], [113, 137, 32], [149, 138, 32], [178, 134, 28],
      [101, 171, 29], [138, 173, 30]
    ].map(([x, y, r]) => `
      <circle cx="${x}" cy="${y}" r="${r}" fill="url(#body-${id})" stroke="${stroke}" stroke-width="5"/>
      <ellipse cx="${x - r * 0.32}" cy="${y - r * 0.34}" rx="${r * 0.24}" ry="${r * 0.12}" fill="#fff" opacity="0.35" transform="rotate(-35 ${x - r * 0.32} ${y - r * 0.34})"/>
    `).join("");

    return wrap(`
      ${stem(143, 65, 42, 34, 7)}
      ${leaf(157, 52, 34, -15)}
      ${grapes}
    `);
  }

  if (fruit.type === "orange") {
    const dots = [
      [91, 112], [122, 98], [153, 113],
      [89, 146], [135, 151], [166, 141]
    ].map(([x, y]) => `
      <circle cx="${x}" cy="${y}" r="4" fill="#c96b00" opacity="0.22"/>
    `).join("");

    return wrap(`
      <circle cx="128" cy="139" r="79" fill="url(#body-${id})" stroke="${stroke}" stroke-width="6"/>
      ${gloss(90, 85, 22, 11)}
      ${dots}
      ${stem(127, 67, 32, 5, 7)}
      ${leaf(143, 63, 30, -8)}
    `);
  }

  if (fruit.type === "apple") {
    return wrap(`
      <path d="M128 79
        C86 58, 54 91, 58 141
        C62 194, 103 218, 128 194
        C153 218, 194 194, 198 141
        C202 91, 170 58, 128 79 Z"
        fill="url(#body-${id})" stroke="${stroke}" stroke-width="6"/>

      <path d="M106 72 C116 81, 140 81, 150 72" fill="none" stroke="#7a3c1f" stroke-width="4" opacity="0.35"/>

      ${gloss(88, 92, 22, 11)}
      ${stem(132, 72, 40, 12, 8)}
      ${leaf(150, 66, 33, -10)}
      ${face(128, 144, 0.9)}
    `);
  }

  if (fruit.type === "lemon") {
    return wrap(`
      <path d="M127 62
        C181 62, 211 101, 199 151
        C187 204, 132 223, 83 195
        C46 174, 44 108, 83 80
        C97 69, 111 62, 127 62 Z"
        fill="url(#body-${id})" stroke="${stroke}" stroke-width="6"/>

      ${gloss(93, 93, 22, 11)}
      <circle cx="103" cy="151" r="5" fill="#d4a318" opacity="0.3"/>
      <circle cx="151" cy="135" r="5" fill="#d4a318" opacity="0.28"/>
      ${face(128, 146, 0.9)}
    `);
  }

  if (fruit.type === "pineapple") {
    const gridA = Array.from({ length: 7 }, (_, i) => {
      const y = 89 + i * 20;
      return `<path d="M76 ${y} L181 ${y + 70}" stroke="#a66a09" stroke-width="3.6" opacity="0.34"/>`;
    }).join("");

    const gridB = Array.from({ length: 7 }, (_, i) => {
      const y = 89 + i * 20;
      return `<path d="M181 ${y} L76 ${y + 70}" stroke="#a66a09" stroke-width="3.6" opacity="0.34"/>`;
    }).join("");

    return wrap(`
      ${leaf(101, 79, 38, -95)}
      ${leaf(120, 69, 43, -65)}
      ${leaf(140, 69, 43, -35)}
      ${leaf(161, 79, 38, -10)}

      <ellipse cx="128" cy="154" rx="66" ry="82" fill="url(#body-${id})" stroke="${stroke}" stroke-width="6"/>

      <clipPath id="pineClip-${id}">
        <ellipse cx="128" cy="154" rx="61" ry="76"/>
      </clipPath>

      <g clip-path="url(#pineClip-${id})">
        ${gridA}
        ${gridB}
      </g>

      ${gloss(101, 122, 18, 9)}
    `);
  }

  if (fruit.type === "watermelon") {
    const stripes = [-2, -1, 0, 1, 2].map((i) => `
      <path d="M${128 + i * 27} 56
        C${111 + i * 18} 102, ${111 + i * 18} 158, ${128 + i * 27} 210"
        fill="none" stroke="#0d7a35" stroke-width="12" opacity="0.42"/>
    `).join("");

    return wrap(`
      <circle cx="128" cy="137" r="84" fill="url(#body-${id})" stroke="${stroke}" stroke-width="6"/>

      <clipPath id="wmClip-${id}">
        <circle cx="128" cy="137" r="78"/>
      </clipPath>

      <g clip-path="url(#wmClip-${id})">
        ${stripes}
      </g>

      ${gloss(92, 87, 23, 12)}
      ${stem(132, 59, 35, 18, 8)}
      ${face(128, 149, 0.9)}
    `);
  }

  if (fruit.type === "bigorange") {
    const dots = [
      [92, 116], [120, 101], [153, 115],
      [91, 151], [134, 154], [165, 143], [121, 180]
    ].map(([x, y]) => `
      <circle cx="${x}" cy="${y}" r="4.5" fill="#c96b00" opacity="0.20"/>
    `).join("");

    return wrap(`
      <circle cx="128" cy="139" r="86" fill="url(#body-${id})" stroke="${stroke}" stroke-width="6"/>
      ${gloss(90, 84, 24, 12)}
      ${dots}
      ${stem(129, 61, 35, 8, 8)}
      ${leaf(146, 56, 34, -8)}
      ${face(128, 150, 0.9)}
    `);
  }

  if (fruit.type === "melon") {
    const net = `
      <path d="M62 135 C92 115 162 115 194 135" fill="none" stroke="#fff8b2" stroke-width="5.5" opacity="0.72"/>
      <path d="M66 164 C96 146 159 146 190 164" fill="none" stroke="#fff8b2" stroke-width="5.5" opacity="0.68"/>
      <path d="M75 103 C103 91 154 91 181 103" fill="none" stroke="#fff8b2" stroke-width="5" opacity="0.62"/>

      <path d="M102 57 C89 94 88 172 104 212" fill="none" stroke="#fff8b2" stroke-width="5.5" opacity="0.68"/>
      <path d="M154 57 C168 94 168 172 152 212" fill="none" stroke="#fff8b2" stroke-width="5.5" opacity="0.68"/>
      <path d="M128 54 C128 96 128 174 128 220" fill="none" stroke="#fff8b2" stroke-width="5.5" opacity="0.62"/>
    `;

    return wrap(`
      <circle cx="128" cy="139" r="84" fill="url(#body-${id})" stroke="${stroke}" stroke-width="6"/>

      <clipPath id="melonClip-${id}">
        <circle cx="128" cy="139" r="78"/>
      </clipPath>

      <g clip-path="url(#melonClip-${id})">
        ${net}
      </g>

      ${gloss(91, 88, 23, 12)}
      ${stem(128, 62, 31, 0, 8)}
    `);
  }

  if (fruit.type === "dragonfruit") {
    const spikeList = [
      [78, 91, 32, -120],
      [117, 59, 39, -85],
      [163, 76, 34, -42],
      [198, 125, 31, 4],
      [170, 189, 34, 46],
      [101, 204, 34, 116],
      [56, 146, 34, 160]
    ].map(([x, y, s, r]) => leaf(x, y, s, r)).join("");

    return wrap(`
      ${spikeList}

      <path d="M129 51
        C188 61, 210 123, 185 176
        C160 225, 90 218, 61 169
        C32 118, 66 56, 129 51 Z"
        fill="url(#body-${id})" stroke="${stroke}" stroke-width="6"/>

      ${gloss(91, 89, 23, 12)}
      <path d="M86 158 C116 178 155 174 178 141"
        fill="none" stroke="#cb1e70" stroke-width="5" opacity="0.25"/>
      ${face(128, 146, 0.9)}
    `);
  }

  return wrap(`
    <circle cx="128" cy="128" r="80" fill="url(#body-${id})" stroke="${stroke}" stroke-width="6"/>
    ${gloss()}
  `);
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

  if (stage === 0) return 320;
  if (stage === 1) return 290;
  if (stage === 2) return 260;
  return 230;
}

function randomStartLevel() {
  const stage = getDifficultyStage();
  const random = Math.random();

  if (stage === 0) {
    if (random < 0.20) return 0;
    if (random < 0.45) return 1;
    if (random < 0.74) return 2;
    return 3;
  }

  if (stage === 1) {
    if (random < 0.08) return 0;
    if (random < 0.25) return 1;
    if (random < 0.50) return 2;
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
  mouseX = GAME_WIDTH / 2;
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
    const size = index === 0 ? 20 : index === 1 ? 17 : 15;

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
  const time = performance.now();
  const pulse = 0.5 + Math.sin(time / 120) * 0.5;
  const dangerActive = dangerRatio > 0.35;

  ctx.clearRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

  ctx.fillStyle = "#ecfbff";
  ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

  const warningAlpha = dangerActive
    ? 0.14 + dangerRatio * 0.34 + pulse * 0.08
    : 0.08 + dangerRatio * 0.22;

  ctx.fillStyle = `rgba(255, 80, 60, ${warningAlpha})`;
  ctx.fillRect(0, 0, GAME_WIDTH, dropLineY);

  ctx.strokeStyle = dangerActive
    ? `rgba(255, 76, 61, ${0.7 + pulse * 0.3})`
    : "#18c7b8";

  ctx.lineWidth = dangerActive ? 4 + pulse * 1.2 : 3;
  ctx.setLineDash([8, 8]);

  ctx.beginPath();
  ctx.moveTo(0, dropLineY);
  ctx.lineTo(GAME_WIDTH, dropLineY);
  ctx.stroke();

  ctx.setLineDash([]);

  ctx.fillStyle = dangerActive ? "#ff4c3d" : "#00a99d";
  ctx.font = dangerActive ? "bold 14px Arial" : "13px Arial";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText(dangerActive ? "Warning!" : "Danger Line", 12, dropLineY - 14);

  ctx.textAlign = "right";
  ctx.fillText(getStageName(), GAME_WIDTH - 12, dropLineY - 14);

  if (dangerActive && !isGameOver) {
    drawDangerCountdown(dangerRatio);
  }
}

function drawDangerCountdown(dangerRatio) {
  let number = 3;

  if (dangerRatio > 0.66) number = 1;
  else if (dangerRatio > 0.5) number = 2;

  ctx.save();
  ctx.globalAlpha = 0.18 + dangerRatio * 0.42;
  ctx.fillStyle = "#ff4c3d";
  ctx.font = "bold 78px Arial";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(String(number), GAME_WIDTH / 2, dropLineY + 72);
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
  ctx.lineTo(mouseX, GAME_HEIGHT - 8);
  ctx.stroke();

  ctx.setLineDash([]);

  ctx.fillStyle = "rgba(24, 199, 184, 0.18)";
  ctx.beginPath();
  ctx.arc(mouseX, GAME_HEIGHT - 16, 12, 0, Math.PI * 2);
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
  const record = fruitImages.get(level);
  const visualSize = Math.round(radius * 2 * (fruit.visualScale || 1));
  const drawX = Math.round(x - visualSize / 2 + (fruit.drawOffsetX || 0));
  const drawY = Math.round(y - visualSize / 2 + (fruit.drawOffsetY || 0));

  targetCtx.save();
  targetCtx.globalAlpha = 0.14;
  targetCtx.fillStyle = "#52cfd7";
  targetCtx.beginPath();
  targetCtx.ellipse(
    Math.round(x),
    Math.round(y + radius * 0.86),
    Math.round(radius * 0.55),
    Math.max(2, Math.round(radius * 0.12)),
    0,
    0,
    Math.PI * 2
  );
  targetCtx.fill();
  targetCtx.restore();

  if (record && record.loaded && record.image) {
    targetCtx.drawImage(record.image, drawX, drawY, visualSize, visualSize);
    return;
  }

  targetCtx.save();
  targetCtx.fillStyle = fruit.color;
  targetCtx.beginPath();
  targetCtx.arc(Math.round(x), Math.round(y), radius, 0, Math.PI * 2);
  targetCtx.fill();
  targetCtx.restore();
}

function keepFruitInside(ball) {
  if (ball.x - ball.radius < 0) {
    ball.x = ball.radius;
    ball.vx = Math.max(0, ball.vx) * bounce;
  }

  if (ball.x + ball.radius > GAME_WIDTH) {
    ball.x = GAME_WIDTH - ball.radius;
    ball.vx = Math.min(0, ball.vx) * bounce;
  }

  if (ball.y + ball.radius > GAME_HEIGHT) {
    ball.y = GAME_HEIGHT - ball.radius;

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

          if (a.y + a.radius > GAME_HEIGHT - 6) {
            a.vx *= floorFriction;
          }

          if (b.y + b.radius > GAME_HEIGHT - 6) {
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
  const scaleX = GAME_WIDTH / rect.width;

  mouseX = (clientX - rect.left) * scaleX;

  const radius = currentFruit ? currentFruit.radius : 24;
  const margin = 8;

  mouseX = Math.max(
    radius + margin,
    Math.min(GAME_WIDTH - radius - margin, mouseX)
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

setupNextPreviewUi();
polishRestartButton();
preloadFruitImages();
setupEvolutionBar();
setupRound(true);
gameLoop();
