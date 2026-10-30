// Flappy Bird Game Engine
const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');

const CANVAS_WIDTH = 360;
const CANVAS_HEIGHT = 600;
const GROUND_Y = 510;

// Web Audio API Synthesizer (No external assets required!)
class SoundFX {
  constructor() {
    this.ctx = null;
  }

  init() {
    if (!this.ctx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) {
        this.ctx = new AudioContext();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  playFlap() {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const now = this.ctx.currentTime;

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(320, now);
    osc.frequency.exponentialRampToValueAtTime(560, now + 0.12);

    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.12);
  }

  playScore() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    
    // Two-tone cheerful chime
    [659.25, 880].forEach((freq, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const startTime = now + (i * 0.08);

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startTime);

      gain.gain.setValueAtTime(0.25, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.18);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + 0.18);
    });
  }

  playHit() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(160, now);
    osc.frequency.exponentialRampToValueAtTime(40, now + 0.18);

    gain.gain.setValueAtTime(0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.18);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.18);
  }
}

const sound = new SoundFX();

// Game State Management
const STATE = {
  READY: 0,
  PLAYING: 1,
  GAMEOVER: 2
};

let currentState = STATE.READY;
let frames = 0;
let score = 0;
let highScore = parseInt(localStorage.getItem('flappy_high_score') || '0', 10);
let screenShake = 0;
let isNewHighScore = false;

// Particles
let particles = [];
function addParticles(x, y, count, color) {
  for (let i = 0; i < count; i++) {
    particles.push({
      x,
      y,
      vx: (Math.random() - 0.5) * 5,
      vy: (Math.random() - 0.5) * 5,
      radius: Math.random() * 3.5 + 1.5,
      alpha: 1,
      color: color || '#facc15'
    });
  }
}

function updateParticles() {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.alpha -= 0.025;
    if (p.alpha <= 0) {
      particles.splice(i, 1);
    }
  }
}

function drawParticles() {
  particles.forEach(p => {
    ctx.save();
    ctx.globalAlpha = Math.max(0, p.alpha);
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  });
}

// Background & Clouds
class Background {
  constructor() {
    this.clouds = [
      { x: 40, y: 80, speed: 0.3, size: 38 },
      { x: 190, y: 130, speed: 0.2, size: 28 },
      { x: 310, y: 60, speed: 0.35, size: 45 }
    ];
    this.groundX = 0;
  }

  update() {
    this.clouds.forEach(c => {
      c.x -= c.speed;
      if (c.x + c.size * 2 < 0) c.x = CANVAS_WIDTH + 40;
    });

    if (currentState !== STATE.GAMEOVER) {
      this.groundX = (this.groundX - 2) % 24;
    }
  }

  draw() {
    // Sky gradient
    const sky = ctx.createLinearGradient(0, 0, 0, GROUND_Y);
    sky.addColorStop(0, '#4fc3f7');
    sky.addColorStop(0.7, '#b3e5fc');
    sky.addColorStop(1, '#e1f5fe');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, CANVAS_WIDTH, GROUND_Y);

    // City Silhouettes
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    const buildings = [
      [20, 70, 40], [70, 110, 50], [130, 85, 35],
      [175, 120, 60], [245, 95, 45], [300, 130, 50]
    ];
    buildings.forEach(([x, h, w]) => {
      ctx.fillRect(x, GROUND_Y - h, w, h);
    });

    // Clouds
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    this.clouds.forEach(c => {
      ctx.beginPath();
      ctx.arc(c.x, c.y, c.size, 0, Math.PI * 2);
      ctx.arc(c.x + c.size * 0.6, c.y - c.size * 0.3, c.size * 0.7, 0, Math.PI * 2);
      ctx.arc(c.x + c.size * 1.2, c.y, c.size * 0.8, 0, Math.PI * 2);
      ctx.fill();
    });

    // Ground
    ctx.fillStyle = '#ded895';
    ctx.fillRect(0, GROUND_Y, CANVAS_WIDTH, CANVAS_HEIGHT - GROUND_Y);

    // Grass Top Border
    ctx.fillStyle = '#73bf2e';
    ctx.fillRect(0, GROUND_Y, CANVAS_WIDTH, 14);

    ctx.fillStyle = '#558022';
    ctx.fillRect(0, GROUND_Y + 14, CANVAS_WIDTH, 3);

    // Diagonal ground stripes
    ctx.strokeStyle = '#c5bc73';
    ctx.lineWidth = 3;
    for (let x = this.groundX - 30; x < CANVAS_WIDTH + 30; x += 18) {
      ctx.beginPath();
      ctx.moveTo(x, GROUND_Y + 17);
      ctx.lineTo(x - 12, CANVAS_HEIGHT);
      ctx.stroke();
    }
  }
}

// Pipes
class PipesManager {
  constructor() {
    this.items = [];
    this.pipeWidth = 56;
    this.gap = 125;
    this.spawnRate = 100;
  }

  reset() {
    this.items = [];
  }

  update() {
    if (currentState !== STATE.PLAYING) return;

    if (frames % this.spawnRate === 0) {
      const minTop = 60;
      const maxTop = GROUND_Y - this.gap - 60;
      const topHeight = Math.floor(Math.random() * (maxTop - minTop + 1)) + minTop;
      this.items.push({
        x: CANVAS_WIDTH,
        top: topHeight,
        passed: false
      });
    }

    for (let i = this.items.length - 1; i >= 0; i--) {
      const p = this.items[i];
      p.x -= 2.2;

      // Score counter
      if (!p.passed && p.x + this.pipeWidth < bird.x) {
        p.passed = true;
        score++;
        sound.playScore();
        addParticles(bird.x, bird.y, 10, '#38bdf8');
        if (score > highScore) {
          highScore = score;
          isNewHighScore = true;
          localStorage.setItem('flappy_high_score', highScore);
        }
      }

      // Bird collision
      const birdBox = {
        left: bird.x - bird.radius + 3,
        right: bird.x + bird.radius - 3,
        top: bird.y - bird.radius + 3,
        bottom: bird.y + bird.radius - 3
      };

      const hitsTopPipe = birdBox.right > p.x && birdBox.left < p.x + this.pipeWidth && birdBox.top < p.top;
      const hitsBottomPipe = birdBox.right > p.x && birdBox.left < p.x + this.pipeWidth && birdBox.bottom > p.top + this.gap;

      if (hitsTopPipe || hitsBottomPipe) {
        triggerGameOver();
      }

      // Remove offscreen
      if (p.x + this.pipeWidth < -10) {
        this.items.splice(i, 1);
      }
    }
  }

  draw() {
    this.items.forEach(p => {
      const bottomY = p.top + this.gap;
      const bottomHeight = GROUND_Y - bottomY;

      // Draw Top Pipe Body
      this.renderPipe(p.x, 0, this.pipeWidth, p.top, true);

      // Draw Bottom Pipe Body
      this.renderPipe(p.x, bottomY, this.pipeWidth, bottomHeight, false);
    });
  }

  renderPipe(x, y, w, h, isTop) {
    // Pipe gradient
    const pipeGrad = ctx.createLinearGradient(x, 0, x + w, 0);
    pipeGrad.addColorStop(0, '#538d22');
    pipeGrad.addColorStop(0.2, '#73bf2e');
    pipeGrad.addColorStop(0.6, '#a4e637');
    pipeGrad.addColorStop(0.85, '#538d22');
    pipeGrad.addColorStop(1, '#2c530e');

    ctx.fillStyle = pipeGrad;
    ctx.strokeStyle = '#223e0c';
    ctx.lineWidth = 2.5;

    ctx.fillRect(x, y, w, h);
    ctx.strokeRect(x, y, w, h);

    // Pipe Cap
    const capHeight = 24;
    const capExtra = 4;
    const capX = x - capExtra;
    const capW = w + (capExtra * 2);
    const capY = isTop ? y + h - capHeight : y;

    const capGrad = ctx.createLinearGradient(capX, 0, capX + capW, 0);
    capGrad.addColorStop(0, '#538d22');
    capGrad.addColorStop(0.25, '#73bf2e');
    capGrad.addColorStop(0.65, '#a4e637');
    capGrad.addColorStop(1, '#2c530e');

    ctx.fillStyle = capGrad;
    ctx.fillRect(capX, capY, capW, capHeight);
    ctx.strokeRect(capX, capY, capW, capHeight);
  }
}

// Bird Object
class Bird {
  constructor() {
    this.x = 85;
    this.y = 260;
    this.velocity = 0;
    this.gravity = 0.28;
    this.jump = -5.4;
    this.radius = 14;
    this.rotation = 0;
    this.wingAngle = 0;
  }

  reset() {
    this.x = 85;
    this.y = 260;
    this.velocity = 0;
    this.rotation = 0;
  }

  flap() {
    this.velocity = this.jump;
    sound.playFlap();
    addParticles(this.x - 10, this.y + 6, 4, '#ffffff');
  }

  update() {
    if (currentState === STATE.READY) {
      // Gentle floating animation
      this.y = 250 + Math.sin(frames * 0.08) * 8;
      this.rotation = 0;
      this.wingAngle = Math.sin(frames * 0.2) * 0.4;
      return;
    }

    this.velocity += this.gravity;
    this.y += this.velocity;

    // Wing flapping speed tied to velocity
    this.wingAngle = Math.sin(frames * 0.35) * 0.6;

    // Rotation calculation
    if (this.velocity < 0) {
      this.rotation = Math.max(-0.45, this.velocity * 0.08);
    } else {
      this.rotation = Math.min(Math.PI / 2.2, (this.velocity - 2) * 0.1);
    }

    // Ground collision
    if (this.y + this.radius >= GROUND_Y) {
      this.y = GROUND_Y - this.radius;
      if (currentState === STATE.PLAYING) {
        triggerGameOver();
      }
    }

    // Ceiling clamp
    if (this.y - this.radius <= 0) {
      this.y = this.radius;
      this.velocity = 0;
    }
  }

  draw() {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rotation);

    // Bird Body (Golden Yellow Oval)
    ctx.fillStyle = '#facc15';
    ctx.strokeStyle = '#854d0e';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(0, 0, 16, 13, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Belly Highlight
    ctx.fillStyle = '#fef08a';
    ctx.beginPath();
    ctx.ellipse(-2, 3, 11, 7, 0, 0, Math.PI * 2);
    ctx.fill();

    // Wing
    ctx.save();
    ctx.translate(-5, 0);
    ctx.rotate(this.wingAngle);
    ctx.fillStyle = '#eab308';
    ctx.beginPath();
    ctx.ellipse(-2, 2, 8, 5, 0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    // Eye
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(7, -5, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Pupil
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(8.5, -5, 2, 0, Math.PI * 2);
    ctx.fill();

    // Beak
    ctx.fillStyle = '#f97316';
    ctx.beginPath();
    ctx.moveTo(11, -2);
    ctx.lineTo(21, 1);
    ctx.lineTo(11, 5);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.restore();
  }
}

// Instances
const bg = new Background();
const pipes = new PipesManager();
const bird = new Bird();

function triggerGameOver() {
  if (currentState === STATE.GAMEOVER) return;
  currentState = STATE.GAMEOVER;
  screenShake = 16;
  sound.playHit();
  addParticles(bird.x, bird.y, 25, '#ef4444');
}

function resetGame() {
  score = 0;
  isNewHighScore = false;
  bird.reset();
  pipes.reset();
  particles = [];
  currentState = STATE.READY;
}

// Interaction handling
function handleAction() {
  sound.init();

  if (currentState === STATE.READY) {
    currentState = STATE.PLAYING;
    bird.flap();
  } else if (currentState === STATE.PLAYING) {
    bird.flap();
  } else if (currentState === STATE.GAMEOVER) {
    resetGame();
  }
}

window.addEventListener('keydown', (e) => {
  if (e.code === 'Space' || e.code === 'ArrowUp') {
    e.preventDefault();
    handleAction();
  }
});

canvas.addEventListener('pointerdown', (e) => {
  e.preventDefault();
  handleAction();
});

// HUD & UI Drawing
function drawScore() {
  if (currentState === STATE.PLAYING) {
    ctx.save();
    ctx.font = '800 38px "Outfit", sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 5;
    ctx.textAlign = 'center';
    ctx.strokeText(score, CANVAS_WIDTH / 2, 80);
    ctx.fillText(score, CANVAS_WIDTH / 2, 80);
    ctx.restore();
  }
}

function drawReadyScreen() {
  if (currentState !== STATE.READY) return;

  ctx.save();
  ctx.textAlign = 'center';

  // Title
  ctx.font = '800 32px "Outfit", sans-serif';
  ctx.fillStyle = '#facc15';
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 5;
  ctx.strokeText('FLAPPY BIRD', CANVAS_WIDTH / 2, 160);
  ctx.fillText('FLAPPY BIRD', CANVAS_WIDTH / 2, 160);

  // Subtitle card
  ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
  ctx.roundRect(CANVAS_WIDTH / 2 - 120, 340, 240, 64, 12);
  ctx.fill();

  ctx.font = '600 16px "Outfit", sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.fillText('TAP OR PRESS SPACE', CANVAS_WIDTH / 2, 368);
  ctx.font = '400 13px "Outfit", sans-serif';
  ctx.fillStyle = '#94a3b8';
  ctx.fillText('TO FLAP & FLY', CANVAS_WIDTH / 2, 390);

  ctx.restore();
}

function drawGameOverCard() {
  if (currentState !== STATE.GAMEOVER) return;

  ctx.save();
  ctx.textAlign = 'center';

  // Game Over Header
  ctx.font = '800 36px "Outfit", sans-serif';
  ctx.fillStyle = '#f43f5e';
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 5;
  ctx.strokeText('GAME OVER', CANVAS_WIDTH / 2, 150);
  ctx.fillText('GAME OVER', CANVAS_WIDTH / 2, 150);

  // Scoreboard Card
  const cardX = CANVAS_WIDTH / 2 - 130;
  const cardY = 185;
  const cardW = 260;
  const cardH = 170;

  ctx.fillStyle = '#fef3c7';
  ctx.strokeStyle = '#d97706';
  ctx.lineWidth = 4;
  ctx.roundRect(cardX, cardY, cardW, cardH, 16);
  ctx.fill();
  ctx.stroke();

  // Score Labels
  ctx.textAlign = 'left';
  ctx.font = '600 14px "Outfit", sans-serif';
  ctx.fillStyle = '#b45309';
  ctx.fillText('SCORE', cardX + 24, cardY + 45);
  ctx.fillText('BEST SCORE', cardX + 24, cardY + 105);

  // Score Numbers
  ctx.textAlign = 'right';
  ctx.font = '800 28px "Outfit", sans-serif';
  ctx.fillStyle = '#1e293b';
  ctx.fillText(score, cardX + cardW - 24, cardY + 48);
  ctx.fillText(highScore, cardX + cardW - 24, cardY + 108);

  // New High Score badge
  if (isNewHighScore && score > 0) {
    ctx.fillStyle = '#ef4444';
    ctx.font = '800 11px "Outfit", sans-serif';
    ctx.fillText('NEW RECORD!', cardX + cardW - 24, cardY + 126);
  }

  // Medal
  let medalColor = null;
  if (score >= 30) medalColor = '#f59e0b'; // Gold
  else if (score >= 20) medalColor = '#94a3b8'; // Silver
  else if (score >= 10) medalColor = '#cd7f32'; // Bronze

  if (medalColor) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(cardX + 60, cardY + 130, 16, 0, Math.PI * 2);
    ctx.fillStyle = medalColor;
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#fff';
    ctx.stroke();
    ctx.restore();
  }

  // Play Again Button
  const btnY = 380;
  ctx.fillStyle = '#22c55e';
  ctx.strokeStyle = '#15803d';
  ctx.lineWidth = 3;
  ctx.roundRect(CANVAS_WIDTH / 2 - 85, btnY, 170, 48, 12);
  ctx.fill();
  ctx.stroke();

  ctx.textAlign = 'center';
  ctx.font = '800 18px "Outfit", sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.fillText('PLAY AGAIN', CANVAS_WIDTH / 2, btnY + 30);

  ctx.restore();
}

// Polyfill roundRect for older canvas engines if needed
if (!CanvasRenderingContext2D.prototype.roundRect) {
  CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h, r) {
    if (w < 2 * r) r = w / 2;
    if (h < 2 * r) r = h / 2;
    this.beginPath();
    this.moveTo(x + r, y);
    this.arcTo(x + w, y, x + w, y + h, r);
    this.arcTo(x + w, y + h, x, y + h, r);
    this.arcTo(x, y + h, x, y, r);
    this.arcTo(x, y, x + w, y, r);
    this.closePath();
    return this;
  };
}

// Main Game Loop
function loop() {
  ctx.save();

  // Screen shake on hit
  if (screenShake > 0) {
    const dx = (Math.random() - 0.5) * screenShake;
    const dy = (Math.random() - 0.5) * screenShake;
    ctx.translate(dx, dy);
    screenShake *= 0.85;
    if (screenShake < 0.5) screenShake = 0;
  }

  // Render & Updates
  bg.update();
  bg.draw();

  pipes.update();
  pipes.draw();

  bird.update();
  bird.draw();

  updateParticles();
  drawParticles();

  drawScore();
  drawReadyScreen();
  drawGameOverCard();

  ctx.restore();

  frames++;
  requestAnimationFrame(loop);
}

// Boot up game loop
requestAnimationFrame(loop);
