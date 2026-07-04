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

/**
 * Faster drop + stable non-overlap physics
 */
const gravity = 0.46;
const friction = 0.88;
const bounce = 0.03;
const dropLineY = 98;
const spawnY = 54;

const maxHorizontalSpeed = 0.65;
const maxVerticalSpeed = 5.2;

const collisionSolverIterations = 5;
const collisionRestitution = 0.01;
const collisionCorrection = 0.68;
const maxCorrectionPerFrame = 5.2;
const mergeTolerance = 3.5;

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
      <filter id="fruitShadow" x="-25%" y="-25%" width="150%" height="150%">
        <feDropShadow dx="0" dy="8" stdDeviation="8" flood-color="#0fa3b1" flood-opacity="0.18"/>
      </filter>

      <radialGradient id="gloss" cx="35%" cy="24%" r="70%">
        <stop offset="0%" stop-color="#ffffff" stop-opacity="0.82"/>
        <stop offset="30%" stop-color="#ffffff" stop-opacity="0.18"/>
        <stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
      </radialGradient>
    </defs>

    <ellipse cx="128" cy="224" rx="70" ry="12" fill="#59dbe0" opacity="0.16"/>

    <g filter="url(#fruitShadow)">
      ${detail}
      <ellipse cx="92" cy="78" rx="30" ry="17" fill="url(#gloss)" transform="rotate(-20 92 78)"/>
      <circle cx="76" cy="103" r="6" fill="#ffffff" opacity="0.18"/>
    </g>
  </svg>`;
}

function getFruitDetailSvg(type) {
  if (type === "cherry") {
    return `
      <g>
        <path d="M114 85 C112 58 124 41 145 34" fill="none" stroke="#4f8a38" stroke-width="9" stroke-linecap="round"/>
        <path d="M139 86 C151 59 171 46 192 53" fill="none" stroke="#4f8a38" stroke-width="9" stroke-linecap="round"/>
        <ellipse cx="192" cy="53" rx="22" ry="11" fill="#7ccc50" transform="rotate(-22 192 53)"/>

        <circle cx="101" cy="148" r="48" fill="#ef4265"/>
        <circle cx="154" cy="139" r="49" fill="#dc234f"/>

        <circle cx="85" cy="128" r="14" fill="#ffffff" opacity="0.28"/>
        <circle cx="139" cy="118" r="13" fill="#ffffff" opacity="0.24"/>

        <circle cx="101" cy="148" r="48" fill="none" stroke="#c81d43" stroke-width="5" opacity="0.5"/>
        <circle cx="154" cy="139" r="49" fill="none" stroke="#b7193e" stroke-width="5" opacity="0.5"/>
      </g>
    `;
  }

  if (type === "strawberry") {
    return `
      <g>
        <path d="M78 57 L103 82 L128 55 L153 82 L178 57 L164 95 L92 95 Z" fill="#68b944"/>

        <path d="M128 78
                 C89 78 62 107 66 149
                 C70 194 101 224 128 229
                 C155 224 186 194 190 149
                 C194 107 167 78 128 78 Z"
              fill="#ff4f6d"/>

        <path d="M128 78
                 C89 78 62 107 66 149
                 C70 194 101 224 128 229
                 C155 224 186 194 190 149
                 C194 107 167 78 128 78 Z"
              fill="none" stroke="#d93b58" stroke-width="5" opacity="0.5"/>

        <g fill="#ffe7a5">
          <ellipse cx="99" cy="116" rx="4.5" ry="7" transform="rotate(-18 99 116)"/>
          <ellipse cx="128" cy="108" rx="4.5" ry="7"/>
          <ellipse cx="158" cy="116" rx="4.5" ry="7" transform="rotate(18 158 116)"/>
          <ellipse cx="89" cy="150" rx="4.5" ry="7" transform="rotate(-18 89 150)"/>
          <ellipse cx="119" cy="145" rx="4.5" ry="7"/>
          <ellipse cx="151" cy="150" rx="4.5" ry="7" transform="rotate(18 151 150)"/>
          <ellipse cx="103" cy="185" rx="4.5" ry="7" transform="rotate(-18 103 185)"/>
          <ellipse cx="132" cy="190" rx="4.5" ry="7"/>
          <ellipse cx="160" cy="180" rx="4.5" ry="7" transform="rotate(18 160 180)"/>
        </g>
      </g>
    `;
  }

  if (type === "grape") {
    return `
      <g>
        <path d="M133 70 C135 54 144 45 158 40" fill="none" stroke="#689b38" stroke-width="8" stroke-linecap="round"/>
        <ellipse cx="162" cy="42" rx="25" ry="12" fill="#76c84d" transform="rotate(-24 162 42)"/>

        <g fill="#7f4cd3" stroke="#6430b4" stroke-width="4">
          <circle cx="99" cy="101" r="29"/>
          <circle cx="133" cy="94" r="30"/>
          <circle cx="166" cy="105" r="29"/>
          <circle cx="113" cy="132" r="30"/>
          <circle cx="148" cy="134" r="30"/>
          <circle cx="96" cy="168" r="29"/>
          <circle cx="131" cy="176" r="31"/>
          <circle cx="166" cy="166" r="29"/>
        </g>

        <g fill="#ffffff" opacity="0.25">
          <circle cx="88" cy="90" r="8"/>
          <circle cx="122" cy="84" r="8"/>
          <circle cx="154" cy="96" r="8"/>
          <circle cx="103" cy="121" r="7"/>
        </g>
      </g>
    `;
  }

  if (type === "orange") {
    return `
      <g>
        <circle cx="128" cy="128" r="94" fill="#ff9f22"/>
        <circle cx="128" cy="128" r="82" fill="#ffd76a"/>
        <circle cx="128" cy="128" r="94" fill="none" stroke="#f08418" stroke-width="8"/>
        <circle cx="128" cy="128" r="78" fill="none" stroke="#fff4c6" stroke-width="5"/>

        <g stroke="#fff8df" stroke-width="6" stroke-linecap="round">
          <line x1="128" y1="128" x2="128" y2="52"/>
          <line x1="128" y1="128" x2="183" y2="73"/>
          <line x1="128" y1="128" x2="204" y2="128"/>
          <line x1="128" y1="128" x2="183" y2="183"/>
          <line x1="128" y1="128" x2="128" y2="204"/>
          <line x1="128" y1="128" x2="73" y2="183"/>
          <line x1="128" y1="128" x2="52" y2="128"/>
          <line x1="128" y1="128" x2="73" y2="73"/>
        </g>
      </g>
    `;
  }

  if (type === "apple") {
    return `
      <g>
        <path d="M128 62 C120 44 107 34 91 38" fill="none" stroke="#7a5237" stroke-width="9" stroke-linecap="round"/>
        <ellipse cx="157" cy="42" rx="26" ry="13" fill="#70bf45" transform="rotate(-22 157 42)"/>

        <path d="M128 72
                 C87 70 58 101 61 145
                 C64 194 94 225 128 228
                 C162 225 192 194 195 145
                 C198 101 169 70 128 72 Z"
              fill="#f04d63"/>

        <path d="M128 72
                 C146 96 152 132 151 226
                 C176 216 193 186 195 145
                 C198 101 169 70 128 72 Z"
              fill="#d93b52" opacity="0.42"/>

        <path d="M128 72
                 C87 70 58 101 61 145
                 C64 194 94 225 128 228
                 C162 225 192 194 195 145
                 C198 101 169 70 128 72 Z"
              fill="none" stroke="#d12e46" stroke-width="5" opacity="0.55"/>
      </g>
    `;
  }

  if (type === "peach") {
    return `
      <g>
        <ellipse cx="155" cy="47" rx="25" ry="12" fill="#79c64b" transform="rotate(-24 155 47)"/>

        <path d="M128 65
                 C89 65 58 99 61 146
                 C64 195 96 227 128 230
                 C160 227 192 195 195 146
                 C198 99 167 65 128 65 Z"
              fill="#ffb07f"/>

        <ellipse cx="104" cy="154" rx="44" ry="55" fill="#ff8f88" opacity="0.35"/>
        <ellipse cx="158" cy="132" rx="34" ry="42" fill="#ffd2a8" opacity="0.22"/>

        <path d="M130 76 C106 108 104 162 121 218" fill="none" stroke="#e98f6c" stroke-width="6" opacity="0.78"/>

        <path d="M128 65
                 C89 65 58 99 61 146
                 C64 195 96 227 128 230
                 C160 227 192 195 195 146
                 C198 99 167 65 128 65 Z"
              fill="none" stroke="#ef9c74" stroke-width="5" opacity="0.5"/>
      </g>
    `;
  }

  if (type === "pineapple") {
    return `
      <g>
        <path d="M98 62 L112 22 L128 57 L144 22 L158 62 L181 37 L166 98 L90 98 L75 37 Z" fill="#6fc043"/>

        <path d="M128 83
                 C88 83 65 111 69 154
                 C73 198 98 226 128 229
                 C158 226 183 198 187 154
                 C191 111 168 83 128 83 Z"
              fill="#f3c43f"/>

        <path d="M128 83
                 C88 83 65 111 69 154
                 C73 198 98 226 128 229
                 C158 226 183 198 187 154
                 C191 111 168 83 128 83 Z"
              fill="none" stroke="#dca72a" stroke-width="5" opacity="0.58"/>

        <g stroke="#bd891f" stroke-width="5" opacity="0.55">
          <path d="M82 111 L172 209"/>
          <path d="M68 144 L145 229"/>
          <path d="M111 83 L190 170"/>
          <path d="M174 111 L84 209"/>
          <path d="M188 144 L111 229"/>
          <path d="M145 83 L66 170"/>
        </g>
      </g>
    `;
  }

  if (type === "watermelon") {
    return `
      <g>
        <circle cx="128" cy="128" r="96" fill="#2fbf71"/>
        <circle cx="128" cy="128" r="84" fill="#eaffc8"/>
        <circle cx="128" cy="128" r="73" fill="#ff5a68"/>

        <g fill="#263238">
          <ellipse cx="98" cy="113" rx="5" ry="9" transform="rotate(-18 98 113)"/>
          <ellipse cx="126" cy="103" rx="5" ry="9"/>
          <ellipse cx="156" cy="115" rx="5" ry="9" transform="rotate(18 156 115)"/>
          <ellipse cx="111" cy="148" rx="5" ry="9" transform="rotate(-14 111 148)"/>
          <ellipse cx="145" cy="151" rx="5" ry="9" transform="rotate(14 145 151)"/>
          <ellipse cx="128" cy="176" rx="5" ry="9"/>
        </g>

        <circle cx="128" cy="128" r="96" fill="none" stroke="#249d5c" stroke-width="8" opacity="0.55"/>
        <path d="M74 70 C96 50 135 42 171 58" fill="none" stroke="#8af2b4" stroke-width="8" opacity="0.3" stroke-linecap="round"/>
      </g>
    `;
  }

  if (type === "coconut") {
    return `
      <g>
        <circle cx="128" cy="128" r="96" fill="#8c5b39"/>
        <circle cx="128" cy="128" r="80" fill="#fff7ec"/>
        <circle cx="128" cy="128" r="96" fill="none" stroke="#6f4529" stroke-width="8" opacity="0.65"/>
        <circle cx="128" cy="128" r="80" fill="none" stroke="#ecdcc4" stroke-width="6" opacity="0.8"/>

        <g fill="#8e6647" opacity="0.62">
          <circle cx="105" cy="104" r="6"/>
          <circle cx="128" cy="96" r="6"/>
          <circle cx="151" cy="104" r="6"/>
        </g>

        <path d="M82 82 C104 64 139 57 172 70" fill="none" stroke="#ffffff" stroke-width="8" opacity="0.18" stroke-linecap="round"/>
      </g>
    `;
  }

  if (type === "melon") {
    return `
      <g>
        <circle cx="128" cy="128" r="96" fill="#7fd25d"/>
        <circle cx="128" cy="128" r="82" fill="#d9f5a1"/>
        <ellipse cx="128" cy="139" rx="36" ry="26" fill="#efe4c8" opacity="0.95"/>

        <g fill="#b58b45" opacity="0.75">
          <ellipse cx="109" cy="135" rx="4" ry="7" transform="rotate(-18 109 135)"/>
          <ellipse cx="123" cy="143" rx="4" ry="7"/>
          <ellipse cx="138" cy="136" rx="4" ry="7" transform="rotate(14 138 136)"/>
          <ellipse cx="151" cy="145" rx="4" ry="7" transform="rotate(20 151 145)"/>
        </g>

        <g stroke="#ffffff" stroke-width="6" opacity="0.42">
          <path d="M72 78 C108 109 108 153 74 190"/>
          <path d="M105 54 C129 100 129 154 105 205"/>
          <path d="M151 54 C127 100 127 154 151 205"/>
          <path d="M184 78 C148 109 148 153 182 190"/>
        </g>

        <circle cx="128" cy="128" r="96" fill="none" stroke="#61b94d" stroke-width="8" opacity="0.55"/>
      </g>
    `;
  }

  if (type === "dragonfruit") {
    return `
      <g>
        <path d="M128 58
                 C88 58 58 94 60 141
                 C62 192 95 226 128 230
                 C161 226 194 192 196 141
                 C198 94 168 58 128 58 Z"
              fill="#ff4ea2"/>

        <path d="M128 76
                 C99 76 77 105 78 141
                 C79 179 101 207 128 210
                 C155 207 177 179 178 141
                 C179 105 157 76 128 76 Z"
              fill="#fff9fb"/>

        <g fill="#252525">
          <circle cx="103" cy="111" r="3"/>
          <circle cx="126" cy="102" r="3"/>
          <circle cx="151" cy="115" r="3"/>
          <circle cx="112" cy="139" r="3"/>
          <circle cx="141" cy="149" r="3"/>
          <circle cx="124" cy="172" r="3"/>
          <circle cx="156" cy="173" r="3"/>
        </g>

        <ellipse cx="70" cy="124" rx="24" ry="11" fill="#73c84b" transform="rotate(-34 70 124)"/>
        <ellipse cx="186" cy="113" rx="24" ry="11" fill="#73c84b" transform="rotate(34 186 113)"/>
        <ellipse cx="81" cy="170" rx="23" ry="10" fill="#73c84b" transform="rotate(22 81 170)"/>
        <ellipse cx="175" cy="174" rx="23" ry="10" fill="#73c84b" transform="rotate(-22 175 174)"/>

        <path d="M128 58
                 C88 58 58 94 60 141
                 C62 192 95 226 128 230
                 C161 226 194 192 196 141
                 C198 94 168 58 128 58 Z"
              fill="none" stroke="#e33d8d" stroke-width="5" opacity="0.5"/>
      </g>
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
  if (stage === 0) return 360;
  if (stage === 1) return 330;
  if (stage === 2) return 300;
  return 270;
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
    scale = 1 + ball.popFrames / 80;
  }

  drawFruitIcon(ctx, ball.x, ball.y, ball.radius * scale, ball.level);
}

function drawFruitIcon(targetCtx, x, y, radius, level) {
  const img = fruitImages[level];

  if (img && img.complete) {
    const visualScale = 1.04;
    const size = radius * 2 * visualScale;

    targetCtx.drawImage(
      img,
      x - size / 2,
      y - size / 2,
      size,
      size
    );

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

    ball.vx *= 0.55;

    if (Math.abs(ball.vy) < 0.5) {
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

        const minDistance = a.radius + b.radius;

        if (distance < minDistance) {
          if (
            pass === 0 &&
            a.level === b.level &&
            a.level < fruits.length - 1 &&
            distance < minDistance - mergeTolerance
          ) {
            mergeFruits(i, j, a, b);
            return;
          }

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

          a.y -= ny * correctionAmount * moveA * 0.85;
          b.y += ny * correctionAmount * moveB * 0.85;

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
            a.vx *= 0.55;
          }

          if (b.y + b.radius > canvas.height - 6) {
            b.vx *= 0.55;
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

  newFruit.vx = (a.vx + b.vx) * 0.18;
  newFruit.vy = Math.min((a.vy + b.vy) * 0.12, 0.15);
  newFruit.popFrames = 10;

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
    screenShake = 4;
    playBigMergeSound();
    vibrate(25);
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
  if (isGameOver || !isGameStarted || !canDrop) return;

  initAudio();
  canDrop = false;

  const fruit = createFruit(mouseX, spawnY, currentFruit.level);
  fruit.vy = 1.15;
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
