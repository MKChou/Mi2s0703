const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const highScoreEl = document.getElementById('highScore');
const overlay = document.getElementById('overlay');
const overlayTitle = document.getElementById('overlayTitle');
const overlayText = document.getElementById('overlayText');
const startBtn = document.getElementById('startBtn');

const W = canvas.width;
const H = canvas.height;
const HIGH_SCORE_KEY = 'starDodgeHighScore';

let gameState = 'idle';
let score = 0;
let highScore = Number(localStorage.getItem(HIGH_SCORE_KEY)) || 0;
let frameId = null;
let lastTime = 0;
let difficulty = 1;

const player = {
  x: W / 2,
  y: H - 60,
  width: 36,
  height: 44,
  speed: 320,
  targetX: W / 2,
};

const keys = { left: false, right: false };
const obstacles = [];
const stars = [];
const particles = [];
const bgStars = [];

for (let i = 0; i < 60; i++) {
  bgStars.push({
    x: Math.random() * W,
    y: Math.random() * H,
    size: Math.random() * 1.5 + 0.5,
    speed: Math.random() * 30 + 15,
    alpha: Math.random() * 0.5 + 0.3,
  });
}

highScoreEl.textContent = highScore;

function spawnObstacle() {
  const size = 22 + Math.random() * 18;
  obstacles.push({
    x: size + Math.random() * (W - size * 2),
    y: -size,
    size,
    speed: 140 + difficulty * 25 + Math.random() * 40,
    rotation: Math.random() * Math.PI * 2,
    rotSpeed: (Math.random() - 0.5) * 3,
  });
}

function spawnStar() {
  const size = 14;
  stars.push({
    x: size + Math.random() * (W - size * 2),
    y: -size,
    size,
    speed: 100 + difficulty * 15,
    pulse: Math.random() * Math.PI * 2,
  });
}

function spawnParticles(x, y, color, count = 8) {
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
    const speed = 60 + Math.random() * 120;
    particles.push({
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 0.4 + Math.random() * 0.3,
      maxLife: 0.7,
      color,
      size: 2 + Math.random() * 3,
    });
  }
}

function resetGame() {
  score = 0;
  difficulty = 1;
  obstacles.length = 0;
  stars.length = 0;
  particles.length = 0;
  player.x = W / 2;
  player.targetX = W / 2;
  scoreEl.textContent = '0';
  lastTime = 0;
}

function startGame() {
  resetGame();
  gameState = 'playing';
  overlay.classList.add('hidden');
  lastTime = performance.now();
  if (frameId) cancelAnimationFrame(frameId);
  frameId = requestAnimationFrame(gameLoop);
}

function endGame() {
  gameState = 'over';
  if (score > highScore) {
    highScore = score;
    localStorage.setItem(HIGH_SCORE_KEY, highScore);
    highScoreEl.textContent = highScore;
  }
  overlayTitle.textContent = '任務失敗';
  overlayText.textContent = `最終分數：${score}${score >= highScore && score > 0 ? ' — 新紀錄！' : ''}`;
  startBtn.textContent = '再玩一次';
  overlay.classList.remove('hidden');
  cancelAnimationFrame(frameId);
}

function circleRectCollision(cx, cy, cr, rx, ry, rw, rh) {
  const closestX = Math.max(rx, Math.min(cx, rx + rw));
  const closestY = Math.max(ry, Math.min(cy, ry + rh));
  const dx = cx - closestX;
  const dy = cy - closestY;
  return dx * dx + dy * dy < cr * cr;
}

function update(dt) {
  difficulty = 1 + score / 150;

  let moveDir = 0;
  if (keys.left) moveDir -= 1;
  if (keys.right) moveDir += 1;
  if (moveDir !== 0) {
    player.targetX += moveDir * player.speed * dt;
  }
  player.targetX = Math.max(player.width / 2, Math.min(W - player.width / 2, player.targetX));
  player.x += (player.targetX - player.x) * Math.min(1, dt * 12);

  if (Math.random() < 0.018 + difficulty * 0.004) spawnObstacle();
  if (Math.random() < 0.012 + difficulty * 0.002) spawnStar();

  for (let i = obstacles.length - 1; i >= 0; i--) {
    const o = obstacles[i];
    o.y += o.speed * dt;
    o.rotation += o.rotSpeed * dt;
    if (o.y - o.size > H) {
      obstacles.splice(i, 1);
      continue;
    }
    if (circleRectCollision(o.x, o.y, o.size * 0.85, player.x - player.width / 2, player.y - player.height / 2, player.width, player.height)) {
      spawnParticles(player.x, player.y, '#ff4757', 16);
      endGame();
      return;
    }
  }

  for (let i = stars.length - 1; i >= 0; i--) {
    const s = stars[i];
    s.y += s.speed * dt;
    s.pulse += dt * 5;
    if (s.y - s.size > H) {
      stars.splice(i, 1);
      continue;
    }
    if (circleRectCollision(s.x, s.y, s.size, player.x - player.width / 2, player.y - player.height / 2, player.width, player.height)) {
      score += 10;
      scoreEl.textContent = score;
      spawnParticles(s.x, s.y, '#ffd54f', 10);
      stars.splice(i, 1);
    }
  }

  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.life -= dt;
    p.vy += 200 * dt;
    if (p.life <= 0) particles.splice(i, 1);
  }

  for (const s of bgStars) {
    s.y += s.speed * dt;
    if (s.y > H) {
      s.y = 0;
      s.x = Math.random() * W;
    }
  }
}

function drawShip(x, y) {
  ctx.save();
  ctx.translate(x, y);

  ctx.shadowColor = '#00f0ff';
  ctx.shadowBlur = 12;

  ctx.fillStyle = '#1a2744';
  ctx.beginPath();
  ctx.moveTo(0, -22);
  ctx.lineTo(16, 18);
  ctx.lineTo(6, 14);
  ctx.lineTo(0, 20);
  ctx.lineTo(-6, 14);
  ctx.lineTo(-16, 18);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#00f0ff';
  ctx.beginPath();
  ctx.moveTo(0, -18);
  ctx.lineTo(8, 10);
  ctx.lineTo(0, 6);
  ctx.lineTo(-8, 10);
  ctx.closePath();
  ctx.fill();

  const flame = Math.sin(performance.now() / 80) * 4 + 8;
  ctx.fillStyle = '#ff6b35';
  ctx.beginPath();
  ctx.moveTo(-5, 18);
  ctx.lineTo(0, 18 + flame);
  ctx.lineTo(5, 18);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}

function drawObstacle(o) {
  ctx.save();
  ctx.translate(o.x, o.y);
  ctx.rotate(o.rotation);

  ctx.fillStyle = '#4a3060';
  ctx.strokeStyle = '#ff4757';
  ctx.lineWidth = 2;
  ctx.shadowColor = '#ff4757';
  ctx.shadowBlur = 6;

  const s = o.size;
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI * 2 * i) / 6;
    const r = s * (0.7 + (i % 2) * 0.3);
    const px = Math.cos(angle) * r;
    const py = Math.sin(angle) * r;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function drawStar(s) {
  const scale = 1 + Math.sin(s.pulse) * 0.15;
  const r = s.size * scale;

  ctx.save();
  ctx.translate(s.x, s.y);
  ctx.shadowColor = '#ffd54f';
  ctx.shadowBlur = 10;
  ctx.fillStyle = '#ffd54f';

  ctx.beginPath();
  for (let i = 0; i < 5; i++) {
    const outerAngle = (Math.PI * 2 * i) / 5 - Math.PI / 2;
    const innerAngle = outerAngle + Math.PI / 5;
    ctx.lineTo(Math.cos(outerAngle) * r, Math.sin(outerAngle) * r);
    ctx.lineTo(Math.cos(innerAngle) * r * 0.4, Math.sin(innerAngle) * r * 0.4);
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawParticles() {
  for (const p of particles) {
    const alpha = p.life / p.maxLife;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function draw() {
  ctx.clearRect(0, 0, W, H);

  for (const s of bgStars) {
    ctx.fillStyle = `rgba(255, 255, 255, ${s.alpha})`;
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
    ctx.fill();
  }

  for (const s of stars) drawStar(s);
  for (const o of obstacles) drawObstacle(o);
  drawShip(player.x, player.y);
  drawParticles();
}

function gameLoop(timestamp) {
  if (gameState !== 'playing') return;

  const dt = Math.min((timestamp - lastTime) / 1000, 0.05);
  lastTime = timestamp;

  update(dt);
  draw();

  frameId = requestAnimationFrame(gameLoop);
}

startBtn.addEventListener('click', startGame);

document.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') keys.left = true;
  if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') keys.right = true;
  if (e.key === ' ' && gameState !== 'playing') {
    e.preventDefault();
    startGame();
  }
});

document.addEventListener('keyup', (e) => {
  if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') keys.left = false;
  if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') keys.right = false;
});

let touchStartX = null;
canvas.addEventListener('touchstart', (e) => {
  e.preventDefault();
  touchStartX = e.touches[0].clientX;
  if (gameState !== 'playing') startGame();
}, { passive: false });

canvas.addEventListener('touchmove', (e) => {
  e.preventDefault();
  if (touchStartX === null) return;
  const rect = canvas.getBoundingClientRect();
  const scaleX = W / rect.width;
  const touchX = (e.touches[0].clientX - rect.left) * scaleX;
  player.targetX = touchX;
}, { passive: false });

canvas.addEventListener('touchend', () => {
  touchStartX = null;
});

draw();
