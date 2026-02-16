const stage = document.getElementById("stage");
const scoreText = document.getElementById("score");
const comboText = document.getElementById("combo");
const timeText = document.getElementById("time");
const hint = document.getElementById("hint");
const startBtn = document.getElementById("startBtn");
const resetBtn = document.getElementById("resetBtn");
const target = document.getElementById("target");
const bonusTarget = document.getElementById("bonusTarget");
const effect = document.getElementById("effect");

const settings = {
  gameSeconds: 30,
  basePoints: 10,
  bonusPoints: 40,
  maxCombo: 8,
  targetMoveMs: 900,
  bonusSpawnChance: 0.28
};

const state = {
  score: 0,
  combo: 1,
  remaining: settings.gameSeconds,
  isPlaying: false,
  gameTimerId: 0,
  moveTimerId: 0
};

function clamp(min, value, max) {
  return Math.max(min, Math.min(value, max));
}

function randomInRange(min, max) {
  return Math.random() * (max - min) + min;
}

function moveElement(el, minY = 140) {
  const stageRect = stage.getBoundingClientRect();
  const elRect = el.getBoundingClientRect();
  const maxX = Math.max(8, stageRect.width - elRect.width - 8);
  const maxY = Math.max(minY, stageRect.height - elRect.height - 8);
  const x = clamp(8, randomInRange(8, maxX), maxX);
  const y = clamp(minY, randomInRange(minY, maxY), maxY);

  el.style.left = `${x}px`;
  el.style.top = `${y}px`;
}

function updateHud() {
  scoreText.textContent = `Score: ${state.score}`;
  comboText.textContent = `Combo: x${state.combo}`;
  timeText.textContent = `Time: ${state.remaining.toFixed(1)}`;
}

function showEffectAt(el, color = "rgba(89, 255, 208, 0.75)") {
  const rect = el.getBoundingClientRect();
  const parentRect = stage.getBoundingClientRect();
  effect.style.left = `${rect.left - parentRect.left + rect.width / 2 - 20}px`;
  effect.style.top = `${rect.top - parentRect.top + rect.height / 2 - 20}px`;
  effect.style.boxShadow = `0 0 0 0 ${color}`;
  effect.classList.remove("pop");
  void effect.offsetWidth;
  effect.classList.add("pop");
}

function rollBonusTarget() {
  if (!state.isPlaying) {
    bonusTarget.hidden = true;
    return;
  }

  const show = Math.random() < settings.bonusSpawnChance;
  bonusTarget.hidden = !show;
  if (show) {
    moveElement(bonusTarget, 180);
  }
}

function advanceTargets() {
  moveElement(target, 160);
  rollBonusTarget();
}

function handleMiss(event) {
  if (!state.isPlaying) {
    return;
  }

  const clickedTarget = event.target === target || event.target === bonusTarget;
  if (clickedTarget) {
    return;
  }

  state.combo = 1;
  hint.textContent = "ミス！コンボが途切れた…";
  updateHud();
}

function gainPoints(base, targetEl, message, effectColor) {
  if (!state.isPlaying) {
    return;
  }

  const earned = base * state.combo;
  state.score += earned;
  state.combo = clamp(1, state.combo + 1, settings.maxCombo);
  hint.textContent = `${message} +${earned}`;
  showEffectAt(targetEl, effectColor);
  updateHud();
  advanceTargets();
}

function onTargetHit(event) {
  event.preventDefault();
  gainPoints(settings.basePoints, target, "グッド", "rgba(90, 179, 255, 0.85)");
}

function onBonusHit(event) {
  event.preventDefault();
  gainPoints(settings.bonusPoints, bonusTarget, "ボーナス！", "rgba(255, 213, 100, 0.9)");
  bonusTarget.hidden = true;
}

function endGame() {
  state.isPlaying = false;
  window.clearInterval(state.gameTimerId);
  window.clearInterval(state.moveTimerId);
  state.gameTimerId = 0;
  state.moveTimerId = 0;
  bonusTarget.hidden = true;
  hint.textContent = `終了！最終スコア: ${state.score}`;
  startBtn.disabled = false;
  startBtn.textContent = "もう一度";
}

function startGame() {
  if (state.isPlaying) {
    return;
  }

  state.isPlaying = true;
  state.score = 0;
  state.combo = 1;
  state.remaining = settings.gameSeconds;
  startBtn.disabled = true;
  hint.textContent = "スタート！連続ヒットで倍率アップ";
  updateHud();
  advanceTargets();

  state.moveTimerId = window.setInterval(advanceTargets, settings.targetMoveMs);
  state.gameTimerId = window.setInterval(() => {
    state.remaining = clamp(0, state.remaining - 0.1, settings.gameSeconds);
    updateHud();
    if (state.remaining <= 0) {
      endGame();
    }
  }, 100);
}

function resetGame() {
  window.clearInterval(state.gameTimerId);
  window.clearInterval(state.moveTimerId);
  state.gameTimerId = 0;
  state.moveTimerId = 0;
  state.isPlaying = false;
  state.score = 0;
  state.combo = 1;
  state.remaining = settings.gameSeconds;
  bonusTarget.hidden = true;
  hint.textContent = "30秒でハイスコアを目指そう！";
  startBtn.disabled = false;
  startBtn.textContent = "スタート";
  updateHud();
  moveElement(target, 160);
}

target.addEventListener("click", onTargetHit);
target.addEventListener("touchstart", onTargetHit, { passive: false });
bonusTarget.addEventListener("click", onBonusHit);
bonusTarget.addEventListener("touchstart", onBonusHit, { passive: false });
startBtn.addEventListener("click", startGame);
resetBtn.addEventListener("click", resetGame);
stage.addEventListener("click", handleMiss);
window.addEventListener("resize", () => {
  moveElement(target, 160);
  if (!bonusTarget.hidden) {
    moveElement(bonusTarget, 180);
  }
});

updateHud();
moveElement(target, 160);
