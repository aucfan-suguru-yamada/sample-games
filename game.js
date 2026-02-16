const stage = document.getElementById("stage");
const scoreText = document.getElementById("score");
const hint = document.getElementById("hint");
const resetBtn = document.getElementById("resetBtn");
const target = document.getElementById("target");

let score = 0;

function clamp(min, value, max) {
  return Math.max(min, Math.min(value, max));
}

function moveTarget() {
  const stageRect = stage.getBoundingClientRect();
  const targetRect = target.getBoundingClientRect();

  const minX = 8;
  const minY = 120;
  const maxX = Math.max(minX, stageRect.width - targetRect.width - 8);
  const maxY = Math.max(minY, stageRect.height - targetRect.height - 8);

  const x = Math.random() * (maxX - minX) + minX;
  const y = Math.random() * (maxY - minY) + minY;

  target.style.left = `${clamp(minX, x, maxX)}px`;
  target.style.top = `${clamp(minY, y, maxY)}px`;
}

function updateScore() {
  scoreText.textContent = `Score: ${score}`;
}

function onHit(e) {
  e.preventDefault();
  score += 1;
  updateScore();
  hint.textContent = "ナイス！";
  moveTarget();
}

function onReset() {
  score = 0;
  updateScore();
  hint.textContent = "丸をタップしてね";
  moveTarget();
}

target.addEventListener("click", onHit);
target.addEventListener("touchstart", onHit, { passive: false });
resetBtn.addEventListener("click", onReset);
window.addEventListener("resize", moveTarget);

updateScore();
moveTarget();
