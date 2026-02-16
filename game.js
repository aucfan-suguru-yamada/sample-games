const stage = document.getElementById("stage");
const hint = document.getElementById("hint");
const overlay = document.getElementById("overlay");
const startBtn = document.getElementById("startBtn");
const muteBtn = document.getElementById("muteBtn");
const soundBtn = document.getElementById("soundBtn");

const CFG = {
  maxBubbles: 7,
  spawnEveryMs: 550,
  bubbleMin: 85,
  bubbleMax: 150,
  floatMinSec: 6.5,
  floatMaxSec: 11.0,
  wobblePx: 22,
  edgePadding: 16,
  sparkCount: 10,
};

let bubbles = new Set();
let allowSound = false;
let muted = false;
let audioCtx = null;

function hideOverlay() {
  overlay.classList.add("hidden");
  overlay.setAttribute("aria-hidden", "true");
  updateSoundIcon();
}

function updateSoundIcon() {
  soundBtn.textContent = muted ? "🔇" : "🔈";
}

async function ensureAudio() {
  if (audioCtx) return;
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) return;
  audioCtx = new Ctx();
  if (audioCtx.state === "suspended") {
    try {
      await audioCtx.resume();
    } catch {}
  }
}

function popSound() {
  if (!allowSound || muted || !audioCtx) return;
  const t = audioCtx.currentTime;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();

  osc.type = "sine";
  osc.frequency.setValueAtTime(260, t);
  osc.frequency.exponentialRampToValueAtTime(140, t + 0.08);

  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(0.22, t + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);

  osc.connect(gain).connect(audioCtx.destination);
  osc.start(t);
  osc.stop(t + 0.13);
}

function getPoint(evt) {
  if (typeof evt.clientX === "number" && typeof evt.clientY === "number") {
    return { x: evt.clientX, y: evt.clientY };
  }

  const touch = evt.changedTouches?.[0] || evt.touches?.[0];
  if (touch) {
    return { x: touch.clientX, y: touch.clientY };
  }

  const rect = stageRect();
  return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
}

overlay.classList.remove("hidden");
overlay.setAttribute("aria-hidden", "false");

startBtn.addEventListener("click", async () => {
  allowSound = true;
  muted = false;
  await ensureAudio();
  hideOverlay();
});

muteBtn.addEventListener("click", () => {
  allowSound = false;
  muted = true;
  hideOverlay();
});

soundBtn.addEventListener("click", async () => {
  muted = !muted;
  if (!muted) {
    allowSound = true;
    await ensureAudio();
  }
  updateSoundIcon();
});

function rand(min, max) {
  return Math.random() * (max - min) + min;
}
function randi(min, max) {
  return Math.floor(rand(min, max + 1));
}
function stageRect() {
  return stage.getBoundingClientRect();
}

function removeBubble(bubble) {
  if (!bubbles.has(bubble)) return;
  bubbles.delete(bubble);
  clearTimeout(bubble._removeTimer);
  bubble.remove();
}

function popBubble(bubble, clientX, clientY) {
  if (!bubbles.has(bubble)) return;

  popSound();
  bubble.classList.add("pop");

  const rect = stageRect();
  const x = clientX - rect.left;
  const y = clientY - rect.top;

  for (let i = 0; i < CFG.sparkCount; i++) {
    const s = document.createElement("div");
    s.className = "spark";
    const angle = rand(0, Math.PI * 2);
    const dist = rand(10, 55);
    const dx = Math.cos(angle) * dist;
    const dy = Math.sin(angle) * dist;

    s.style.left = `${x}px`;
    s.style.top = `${y}px`;
    s.style.setProperty("--x", `${dx}px`);
    s.style.setProperty("--y", `${dy}px`);

    stage.appendChild(s);
    setTimeout(() => s.remove(), 600);
  }

  setTimeout(() => removeBubble(bubble), 240);
  setTimeout(() => spawnBubble(), 120);
}

function bindBubblePop(bubble) {
  const popHandler = (e) => {
    e.preventDefault();
    const point = getPoint(e);
    popBubble(bubble, point.x, point.y);
  };

  if (window.PointerEvent) {
    bubble.addEventListener("pointerdown", popHandler, { passive: false });
    return;
  }

  bubble.addEventListener("touchstart", popHandler, { passive: false });
  bubble.addEventListener("mousedown", popHandler);
}

function spawnBubble() {
  if (bubbles.size >= CFG.maxBubbles) return;

  const rect = stageRect();
  const maxBubbleByWidth = Math.max(42, rect.width - CFG.edgePadding * 2);
  const bubbleMaxSize = Math.max(42, Math.min(CFG.bubbleMax, maxBubbleByWidth));
  const bubbleMinSize = Math.min(CFG.bubbleMin, bubbleMaxSize);
  const size = randi(bubbleMinSize, bubbleMaxSize);

  const xMin = CFG.edgePadding;
  const xMax = Math.max(xMin, rect.width - size - CFG.edgePadding);

  const yStart = rect.height + rand(10, 60);
  const x = rand(xMin, xMax);

  const bubble = document.createElement("div");
  bubble.className = "bubble";
  bubble.style.width = `${size}px`;
  bubble.style.height = `${size}px`;
  bubble.style.left = `${x}px`;
  bubble.style.top = `${yStart}px`;

  bindBubblePop(bubble);

  stage.appendChild(bubble);
  bubbles.add(bubble);

  const duration = rand(CFG.floatMinSec, CFG.floatMaxSec);
  const yEnd = -size - rand(30, 120);
  const wobble = rand(-CFG.wobblePx, CFG.wobblePx);

  bubble.style.transition = `transform ${duration}s linear`;
  bubble.style.transform = `translate3d(${wobble}px, ${yEnd - yStart}px, 0)`;

  hint.style.opacity = "0";
  hint.style.transition = "opacity 600ms ease";

  bubble._removeTimer = setTimeout(() => removeBubble(bubble), duration * 1000 + 200);
}

function startLoop() {
  for (let i = 0; i < 4; i++) spawnBubble();
  setInterval(() => spawnBubble(), CFG.spawnEveryMs);
}

function stageTapHandler(e) {
  if (e.target.classList && e.target.classList.contains("bubble")) return;
  if (Math.random() < 0.35) spawnBubble();
}

if (window.PointerEvent) {
  stage.addEventListener("pointerdown", stageTapHandler);
} else {
  stage.addEventListener("touchstart", stageTapHandler, { passive: true });
  stage.addEventListener("mousedown", stageTapHandler);
}

stage.addEventListener(
  "touchmove",
  (e) => {
    if (!overlay.classList.contains("hidden")) return;
    e.preventDefault();
  },
  { passive: false }
);

startLoop();
updateSoundIcon();
