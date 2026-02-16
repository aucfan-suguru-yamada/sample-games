// ぽんっ！バブル割り（1歳向け：失敗なし・スコアなし・即反応）
const stage = document.getElementById("stage");
const hint = document.getElementById("hint");
const overlay = document.getElementById("overlay");
const startBtn = document.getElementById("startBtn");
const muteBtn = document.getElementById("muteBtn");
const soundBtn = document.getElementById("soundBtn");

// ---- 設定（子ども向けは“少なめ・大きめ・ゆっくり”） ----
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

// ---- 状態 ----
let bubbles = new Set();
let allowSound = false;
let muted = false;
let audioCtx = null;

// iOSはユーザー操作でAudioContextを開始する必要があるので最初にダイアログ表示
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
  // ワンタップでミュート切替
  muted = !muted;
  if (!muted) {
    allowSound = true;
    await ensureAudio();
  }
  updateSoundIcon();
});

function hideOverlay() {
  overlay.classList.add("hidden");
  overlay.setAttribute("aria-hidden", "true");
  updateSoundIcon();
}

// ---- 音（WebAudioで軽い“ぽんっ”） ----
async function ensureAudio() {
  if (audioCtx) return;
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) return;
  audioCtx = new Ctx();
  if (audioCtx.state === "suspended") {
    try { await audioCtx.resume(); } catch {}
  }
}

function popSound() {
  if (!allowSound || muted || !audioCtx) return;

  const t = audioCtx.currentTime;

  // 小さく短い“ぽん”
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

function updateSoundIcon() {
  soundBtn.textContent = muted ? "🔇" : "🔈";
}

// ---- バブル生成 ----
function rand(min, max) {
  return Math.random() * (max - min) + min;
}
function randi(min, max) {
  return Math.floor(rand(min, max + 1));
}

function stageRect() {
  return stage.getBoundingClientRect();
}

function spawnBubble() {
  if (bubbles.size >= CFG.maxBubbles) return;

  const rect = stageRect();
  const size = randi(CFG.bubbleMin, CFG.bubbleMax);

  const xMin = CFG.edgePadding;
  const xMax = rect.width - size - CFG.edgePadding;

  // 下の方から湧く（指が届きやすい）
  const yStart = rect.height + rand(10, 60);
  const x = rand(xMin, xMax);

  const bubble = document.createElement("div");
  bubble.className = "bubble";
  bubble.style.width = `${size}px`;
  bubble.style.height = `${size}px`;

  // 色味をほんのり変える（刺激は強すぎない）
  const hue = randi(170, 210); // 青〜水色
  bubble.style.filter = `hue-rotate(${hue - 190}deg)`;

  // 位置初期化
  bubble.style.left = `${x}px`;
  bubble.style.top = `${yStart}px`;

  // 触りやすく：タップ判定は要素自体（大きい）
  bubble.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    popBubble(bubble, e.clientX, e.clientY);
  });

  stage.appendChild(bubble);
  bubbles.add(bubble);

  // 浮かぶアニメーション（CSSアニメを使わずJSでトランジション）
  const duration = rand(CFG.floatMinSec, CFG.floatMaxSec);
  const yEnd = -size - rand(30, 120);

  // 横揺れ用
  const wobble = rand(-CFG.wobblePx, CFG.wobblePx);

  // トランジション
  bubble.style.transition = `transform ${duration}s linear`;
  // transformで動かす（パフォーマンス）
  bubble.style.transform = `translate3d(${wobble}px, ${yEnd - yStart}px, 0)`;

  // 途中で消えるヒント
  hint.style.opacity = "0";
  hint.style.transition = "opacity 600ms ease";

  // 時間が来たら消す
  const removeTimer = setTimeout(() => {
    removeBubble(bubble);
  }, duration * 1000 + 200);

  bubble._removeTimer = removeTimer;
}

function removeBubble(bubble) {
  if (!bubbles.has(bubble)) return;
  bubbles.delete(bubble);
  clearTimeout(bubble._removeTimer);
  bubble.remove();
}

// ---- 割れる演出 ----
function popBubble(bubble, clientX, clientY) {
  if (!bubbles.has(bubble)) return;

  popSound();

  // 破裂アニメ
  bubble.classList.add("pop");

  // キラキラ（タップ位置基準）
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

    // 色を薄く散らす
    const hue = randi(160, 210);
    s.style.filter = `hue-rotate(${hue - 190}deg)`;

    stage.appendChild(s);
    setTimeout(() => s.remove(), 600);
  }

  // 少し遅れて削除
  setTimeout(() => removeBubble(bubble), 240);

  // 割ったらすぐ補充（“常に何かある”）
  setTimeout(() => spawnBubble(), 120);
}

// ---- ループ ----
function startLoop() {
  // 最初に数個出す
  for (let i = 0; i < 4; i++) spawnBubble();

  setInterval(() => {
    // 画面回転などで rect が変わるので都度spawn
    spawnBubble();
  }, CFG.spawnEveryMs);
}

// ---- 画面タップで“どこでも追加”も少しだけ（楽しい・失敗なし） ----
stage.addEventListener("pointerdown", (e) => {
  // バブル以外のところを触ったら、たまに追加
  // （出しすぎると散らかるので確率）
  if (e.target.classList && e.target.classList.contains("bubble")) return;
  if (Math.random() < 0.35) spawnBubble();
});

// iOS Safari: 画面スクロールを抑止
document.addEventListener("touchmove", (e) => e.preventDefault(), { passive: false });

// 起動
startLoop();
updateSoundIcon();
