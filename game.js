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
      <filter id="fruitShadow" x="-30%" y="-30%" width="160%" height="160%">
        <feDropShadow dx="0" dy="10" stdDeviation="10" flood-color="#35b8d6" flood-opacity="0.22"/>
      </filter>

      <radialGradient id="badgeBg" cx="50%" cy="35%" r="80%">
        <stop offset="0%" stop-color="#fffdf6"/>
        <stop offset="100%" stop-color="#ffe8b8"/>
      </radialGradient>

      <radialGradient id="shineGrad" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="#ffffff" stop-opacity="0.9"/>
        <stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
      </radialGradient>

      <linearGradient id="coolShadow" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="#5de1ff" stop-opacity="0.22"/>
        <stop offset="100%" stop-color="#00c6c9" stop-opacity="0.08"/>
      </linearGradient>
    </defs>

    <ellipse cx="128" cy="222" rx="72" ry="14" fill="url(#coolShadow)"/>

    <g filter="url(#fruitShadow)">
      <circle cx="128" cy="128" r="95" fill="url(#badgeBg)"/>
      <circle cx="128" cy="128" r="92" fill="none" stroke="#fffef9" stroke-width="5" opacity="0.95"/>
      <circle cx="128" cy="128" r="86" fill="#fff7e8" opacity="0.55"/>

      ${detail}

      <ellipse cx="92" cy="74" rx="30" ry="17" fill="url(#shineGrad)" transform="rotate(-18 92 74)"/>
      <circle cx="72" cy="96" r="7" fill="#ffffff" opacity="0.22"/>
      <circle cx="176" cy="70" r="5" fill="#ffffff" opacity="0.18"/>
      <circle cx="188" cy="160" r="4" fill="#ffffff" opacity="0.14"/>
    </g>
  </svg>`;
}

function getFruitDetailSvg(type) {
  if (type === "cherry") {
    return `
      <g>
        <path d="M118 88 C114 66 122 50 140 42" fill="none" stroke="#4f8a38" stroke-width="8" stroke-linecap="round"/>
        <path d="M138 88 C146 63 165 50 184 56" fill="none" stroke="#4f8a38" stroke-width="8" stroke-linecap="round"/>
        <ellipse cx="180" cy="55" rx="20" ry="10" fill="#79c64b" transform="rotate(-24 180 55)"/>

        <circle cx="106" cy="145" r="35" fill="#ef4565"/>
        <circle cx="150" cy="136" r="35" fill="#d9234f"/>

        <circle cx="94" cy="127" r="10" fill="#ffffff" opacity="0.32"/>
        <circle cx="139" cy="118" r="10" fill="#ffffff" opacity="0.26"/>

        <circle cx="106" cy="145" r="35" fill="none" stroke="#c71c42" stroke-width="4" opacity="0.4"/>
        <circle cx="150" cy="136" r="35" fill="none" stroke="#b8183b" stroke-width="4" opacity="0.4"/>
      </g>
    `;
  }

  if (type === "strawberry") {
    return `
      <g>
        <path d="M82 77 L103 95 L128 74 L153 95 L174 77 L164 102 L92 102 Z" fill="#67b83f"/>
        <path d="M128 88
                 C92 88 76 112 78 145
                 C80 181 104 204 128 209
                 C152 204 176 181 178 145
                 C180 112 164 88 128 88 Z"
              fill="#ff4f6d"/>
        <path d="M128 88
                 C92 88 76 112 78 145
                 C80 181 104 204 128 209
                 C152 204 176 181 178 145
                 C180 112 164 88 128 88 Z"
              fill="none" stroke="#d93c58" stroke-width="4" opacity="0.45"/>

        <g fill="#ffe7a3">
          <ellipse cx="101" cy="118" rx="4" ry="6" transform="rotate(-18 101 118)"/>
          <ellipse cx="126" cy="112" rx="4" ry="6" transform="rotate(0 126 112)"/>
          <ellipse cx="152" cy="118" rx="4" ry="6" transform="rotate(18 152 118)"/>
          <ellipse cx="94" cy="145" rx="4" ry="6" transform="rotate(-18 94 145)"/>
          <ellipse cx="120" cy="140" rx="4" ry="6" transform="rotate(0 120 140)"/>
          <ellipse cx="146" cy="145" rx="4" ry="6" transform="rotate(18 146 145)"/>
          <ellipse cx="104" cy="172" rx="4" ry="6" transform="rotate(-18 104 172)"/>
          <ellipse cx="130" cy="176" rx="4" ry="6" transform="rotate(0 130 176)"/>
          <ellipse cx="152" cy="170" rx="4" ry="6" transform="rotate(18 152 170)"/>
        </g>

        <ellipse cx="106" cy="116" rx="14" ry="9" fill="#ffffff" opacity="0.20"/>
      </g>
    `;
  }

  if (type === "grape") {
    return `
      <g>
        <ellipse cx="146" cy="56" rx="22" ry="11" fill="#79c64b" transform="rotate(-26 146 56)"/>
        <path d="M132 70 C132 58 137 52 145 48" fill="none" stroke="#6d9c39" stroke-width="7" stroke-linecap="round"/>

        <g fill="#7f4cd3" stroke="#6b36c5" stroke-width="3">
          <circle cx="103" cy="114" r="21"/>
          <circle cx="128" cy="108" r="21"/>
          <circle cx="153" cy="114" r="21"/>
          <circle cx="114" cy="136" r="21"/>
          <circle cx="140" cy="138" r="21"/>
          <circle cx="102" cy="160" r="20"/>
          <circle cx="128" cy="164" r="21"/>
          <circle cx="154" cy="160" r="20"/>
        </g>

        <g fill="#ffffff" opacity="0.22">
          <circle cx="96" cy="106" r="6"/>
          <circle cx="121" cy="100" r="6"/>
          <circle cx="145" cy="108" r="6"/>
          <circle cx="108" cy="130" r="6"/>
        </g>
      </g>
    `;
  }

  if (type === "orange") {
    return `
      <g>
        <circle cx="128" cy="128" r="64" fill="#ffb433"/>
        <circle cx="128" cy="128" r="58" fill="#ffd96a"/>
        <circle cx="128" cy="128" r="64" fill="none" stroke="#ff9a16" stroke-width="6"/>
        <circle cx="128" cy="128" r="58" fill="none" stroke="#fff3c9" stroke-width="4"/>

        <g stroke="#fff7de" stroke-width="5" stroke-linecap="round">
          <line x1="128" y1="128" x2="128" y2="75"/>
          <line x1="128" y1="128" x2="173" y2="95"/>
          <line x1="128" y1="128" x2="182" y2="128"/>
          <line x1="128" y1="128" x2="173" y2="161"/>
          <line x1="128" y1="128" x2="128" y2="181"/>
          <line x1="128" y1="128" x2="83" y2="161"/>
          <line x1="128" y1="128" x2="74" y2="128"/>
          <line x1="128" y1="128" x2="83" y2="95"/>
        </g>

        <circle cx="103" cy="99" r="11" fill="#ffffff" opacity="0.24"/>
      </g>
    `;
  }

  if (type === "apple") {
    return `
      <g>
        <path d="M128 78 C120 60 110 50 95 52" fill="none" stroke="#7a5237" stroke-width="8" stroke-linecap="round"/>
        <ellipse cx="153" cy="57" rx="22" ry="11" fill="#72bf46" transform="rotate(-22 153 57)"/>

        <path d="M128 87
                 C95 87 74 112 76 144
                 C78 181 100 202 128 204
                 C156 202 178 181 180 144
                 C182 112 161 87 128 87 Z"
              fill="#f04d63"/>

        <path d="M128 87
                 C141 104 147 124 145 204
                 C156 202 178 181 180 144
                 C182 112 161 87 128 87 Z"
              fill="#d93b52" opacity="0.45"/>

        <path d="M128 87
                 C95 87 74 112 76 144
                 C78 181 100 202 128 204
                 C156 202 178 181 180 144
                 C182 112 161 87 128 87 Z"
              fill="none" stroke="#d22f47" stroke-width="4" opacity="0.5"/>

        <ellipse cx="104" cy="113" rx="15" ry="10" fill="#ffffff" opacity="0.23"/>
      </g>
    `;
  }

  if (type === "peach") {
    return `
      <g>
        <ellipse cx="152" cy="58" rx="21" ry="11" fill="#79c64b" transform="rotate(-24 152 58)"/>
        <path d="M128 80
                 C97 80 73 107 75 144
                 C77 183 99 206 128 208
                 C157 206 179 183 181 144
                 C183 107 159 80 128 80 Z"
              fill="#ffb07f"/>

        <path d="M129 86 C110 107 108 146 120 198" fill="none" stroke="#e98f6c" stroke-width="5" opacity="0.75"/>

        <ellipse cx="107" cy="151" rx="34" ry="42" fill="#ff8f88" opacity="0.35"/>
        <ellipse cx="153" cy="136" rx="24" ry="30" fill="#ffd2a8" opacity="0.20"/>
        <path d="M128 80
                 C97 80 73 107 75 144
                 C77 183 99 206 128 208
                 C157 206 179 183 181 144
                 C183 107 159 80 128 80 Z"
              fill="none" stroke="#ef9c74" stroke-width="4" opacity="0.5"/>

        <ellipse cx="102" cy="112" rx="14" ry="8" fill="#ffffff" opacity="0.23"/>
      </g>
    `;
  }

  if (type === "pineapple") {
    return `
      <g>
        <path d="M100 71 L113 34 L128 66 L143 34 L156 71 L175 45 L164 95 L92 95 L81 45 Z" fill="#70bf45"/>

        <path d="M128 90
                 C97 90 80 110 83 146
                 C86 182 105 205 128 207
                 C151 205 170 182 173 146
                 C176 110 159 90 128 90 Z"
              fill="#f2c43f"/>

        <path d="M128 90
                 C97 90 80 110 83 146
                 C86 182 105 205 128 207
                 C151 205 170 182 173 146
                 C176 110 159 90 128 90 Z"
              fill="none" stroke="#dca72a" stroke-width="4" opacity="0.55"/>

        <g stroke="#c48e20" stroke-width="4" opacity="0.55">
          <path d="M92 111 L164 186"/>
          <path d="M86 136 L151 203"/>
          <path d="M106 94 L176 167"/>
          <path d="M164 111 L92 186"/>
          <path d="M171 136 L105 203"/>
          <path d="M150 94 L80 167"/>
        </g>

        <ellipse cx="104" cy="117" rx="13" ry="8" fill="#ffffff" opacity="0.20"/>
      </g>
    `;
  }

  if (type === "watermelon") {
    return `
      <g>
        <path d="M60 154
                 A70 70 0 0 1 196 154
                 L179 176
                 A47 47 0 0 0 77 176 Z"
              fill="#32c06b"/>

        <path d="M71 154
                 A59 59 0 0 1 185 154
                 L171 170
                 A40 40 0 0 0 85 170 Z"
              fill="#fff6de"/>

        <path d="M81 153
                 A50 50 0 0 1 175 153
                 L165 164
                 A34 34 0 0 0 91 164 Z"
              fill="#ff5a68"/>

        <g fill="#2d2d2d">
          <ellipse cx="104" cy="140" rx="4" ry="7" transform="rotate(-16 104 140)"/>
          <ellipse cx="126" cy="132" rx="4" ry="7" transform="rotate(-4 126 132)"/>
          <ellipse cx="149" cy="138" rx="4" ry="7" transform="rotate(15 149 138)"/>
          <ellipse cx="116" cy="151" rx="4" ry="7" transform="rotate(-14 116 151)"/>
          <ellipse cx="140" cy="153" rx="4" ry="7" transform="rotate(10 140 153)"/>
        </g>

        <ellipse cx="113" cy="124" rx="16" ry="9" fill="#ffffff" opacity="0.20"/>
      </g>
    `;
  }

  if (type === "coconut") {
    return `
      <g>
        <circle cx="128" cy="134" r="68" fill="#8c5b39"/>
        <circle cx="128" cy="134" r="57" fill="#fff7ec"/>
        <circle cx="128" cy="134" r="68" fill="none" stroke="#714728" stroke-width="7" opacity="0.6"/>
        <circle cx="128" cy="134" r="57" fill="none" stroke="#f1e2cb" stroke-width="4" opacity="0.7"/>

        <g fill="#9d7454" opacity="0.55">
          <circle cx="109" cy="114" r="5"/>
          <circle cx="127" cy="108" r="5"/>
          <circle cx="145" cy="114" r="5"/>
        </g>

        <ellipse cx="104" cy="118" rx="15" ry="9" fill="#ffffff" opacity="0.24"/>
      </g>
    `;
  }

  if (type === "melon") {
    return `
      <g>
        <circle cx="128" cy="128" r="67" fill="#8fd669"/>
        <circle cx="128" cy="128" r="58" fill="#d7f3a5"/>
        <ellipse cx="128" cy="136" rx="24" ry="17" fill="#efe4c8" opacity="0.92"/>

        <g fill="#b58b45" opacity="0.72">
          <ellipse cx="117" cy="132" rx="3" ry="5" transform="rotate(-18 117 132)"/>
          <ellipse cx="126" cy="138" rx="3" ry="5" transform="rotate(-4 126 138)"/>
          <ellipse cx="135" cy="133" rx="3" ry="5" transform="rotate(14 135 133)"/>
          <ellipse cx="143" cy="138" rx="3" ry="5" transform="rotate(20 143 138)"/>
        </g>

        <g stroke="#ffffff" stroke-width="5" opacity="0.42">
          <path d="M87 88 C110 110 110 145 88 171"/>
          <path d="M109 74 C128 106 128 150 109 183"/>
          <path d="M147 74 C128 106 128 150 147 183"/>
          <path d="M169 88 C146 110 146 145 168 171"/>
        </g>

        <circle cx="128" cy="128" r="67" fill="none" stroke="#6ebf53" stroke-width="6" opacity="0.55"/>
      </g>
    `;
  }

  if (type === "dragonfruit") {
    return `
      <g>
        <path d="M128 82
                 C98 82 75 105 76 141
                 C77 177 100 204 128 206
                 C156 204 179 177 180 141
                 C181 105 158 82 128 82 Z"
              fill="#ff4ea2"/>

        <path d="M128 94
                 C104 94 87 112 88 141
                 C89 171 106 191 128 193
                 C150 191 167 171 168 141
                 C169 112 152 94 128 94 Z"
              fill="#fff9fb"/>

        <g fill="#252525">
          <circle cx="107" cy="119" r="2.7"/>
          <circle cx="126" cy="113" r="2.7"/>
          <circle cx="145" cy="121" r="2.7"/>
          <circle cx="115" cy="139" r="2.7"/>
          <circle cx="136" cy="145" r="2.7"/>
          <circle cx="125" cy="163" r="2.7"/>
          <circle cx="148" cy="159" r="2.7"/>
        </g>

        <ellipse cx="83" cy="124" rx="22" ry="10" fill="#73c84b" transform="rotate(-34 83 124)"/>
        <ellipse cx="173" cy="113" rx="22" ry="10" fill="#73c84b" transform="rotate(34 173 113)"/>
        <ellipse cx="92" cy="160" rx="20" ry="9" fill="#73c84b" transform="rotate(22 92 160)"/>
        <ellipse cx="163" cy="164" rx="20" ry="9" fill="#73c84b" transform="rotate(-22 163 164)"/>

        <path d="M128 82
                 C98 82 75 105 76 141
                 C77 177 100 204 128 206
                 C156 204 179 177 180 141
                 C181 105 158 82 128 82 Z"
              fill="none" stroke="#e33d8d" stroke-width="4" opacity="0.5"/>
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
