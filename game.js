// Flappy Face vs Nivea - Dark Edition (Mobile Fullscreen Engine)
const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');

// DOM Elements
const scoreCounter = document.getElementById('score-counter');
const readyPrompt = document.getElementById('ready-prompt');
const gameoverModal = document.getElementById('gameover-modal');
const finalScoreEl = document.getElementById('card-score');
const finalHighscoreEl = document.getElementById('card-highscore');
const newRecordTag = document.getElementById('new-record-tag');
const medalSlot = document.getElementById('medal-slot');
const medalEmoji = document.getElementById('medal-emoji');
const medalText = document.getElementById('medal-text');
const restartBtn = document.getElementById('restart-button');
const musicBtn = document.getElementById('music-btn');

const bgmAudio = document.getElementById('audio-bgm');
const gameoverAudio = document.getElementById('audio-gameover');

// Responsive Dynamic Dimensions
let CANVAS_WIDTH = 360;
let CANVAS_HEIGHT = 640;
let GROUND_Y = 550;

function resizeCanvas() {
  const container = canvas.parentElement;
  const w = container.clientWidth || window.innerWidth;
  const h = container.clientHeight || window.innerHeight;
  
  CANVAS_WIDTH = 360;
  // Dynamic height adaptation for modern phones (16:9 up to 21:9)
  CANVAS_HEIGHT = Math.max(580, Math.min(800, Math.round(CANVAS_WIDTH * (h / w))));
  GROUND_Y = CANVAS_HEIGHT - 90;

  canvas.width = CANVAS_WIDTH;
  canvas.height = CANVAS_HEIGHT;
}

window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// Load Assets
const playerImg = new Image();
playerImg.src = 'assets/player.png';
let isPlayerLoaded = false;
playerImg.onload = () => { isPlayerLoaded = true; };

const niveaImg = new Image();
niveaImg.src = 'assets/nivea.png';
let isNiveaLoaded = false;
niveaImg.onload = () => { isNiveaLoaded = true; };

// Audio Manager (Plays the user's custom audio continuously)
class AudioManager {
  constructor() {
    this.ctx = null;
    this.isMuted = false;
    this.isPlayingMusic = false;

    if (bgmAudio) {
      bgmAudio.volume = 0.85;
      bgmAudio.loop = true;
      bgmAudio.load();
    }
    if (gameoverAudio) {
      gameoverAudio.volume = 0.9;
      gameoverAudio.load();
    }
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) this.ctx = new AudioCtx();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  startBGM() {
    if (this.isMuted) return;
    this.init();

    if (bgmAudio) {
      const playPromise = bgmAudio.play();
      if (playPromise !== undefined) {
        playPromise.then(() => {
          this.isPlayingMusic = true;
        }).catch((err) => {
          // If blocked by browser autoplay policy on page load, play on the very first touch/gesture!
          const playOnFirstInteraction = () => {
            if (!this.isMuted) {
              bgmAudio.play().then(() => { this.isPlayingMusic = true; });
            }
            window.removeEventListener('pointerdown', playOnFirstInteraction);
            window.removeEventListener('touchstart', playOnFirstInteraction);
            window.removeEventListener('click', playOnFirstInteraction);
            window.removeEventListener('keydown', playOnFirstInteraction);
          };
          window.addEventListener('pointerdown', playOnFirstInteraction, { once: true });
          window.addEventListener('touchstart', playOnFirstInteraction, { once: true, passive: true });
          window.addEventListener('click', playOnFirstInteraction, { once: true });
          window.addEventListener('keydown', playOnFirstInteraction, { once: true });
        });
      }
    }
  }

  stopBGM() {
    if (bgmAudio) {
      bgmAudio.pause();
    }
    this.isPlayingMusic = false;
  }

  playScore() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    [659.25, 880].forEach((freq, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const st = now + (i * 0.08);

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, st);
      gain.gain.setValueAtTime(0.22, st);
      gain.gain.exponentialRampToValueAtTime(0.001, st + 0.16);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(st);
      osc.stop(st + 0.16);
    });
  }

  playGameOver() {
    this.stopBGM();
    if (this.isMuted) return;

    if (gameoverAudio) {
      gameoverAudio.currentTime = 0;
      gameoverAudio.volume = 0.9;
      gameoverAudio.play().catch(() => this.playSynthGameOver());
    } else {
      this.playSynthGameOver();
    }
  }

  playSynthGameOver() {
    this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const notes = [
      { f: 392.00, t: 0.00, d: 0.22 }, // G4
      { f: 369.99, t: 0.22, d: 0.22 }, // F#4
      { f: 349.23, t: 0.44, d: 0.22 }, // F4
      { f: 293.66, t: 0.66, d: 0.65 }  // D4 pitch drop
    ];

    notes.forEach(n => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const st = now + n.t;

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(n.f, st);
      if (n.f === 293.66) {
        osc.frequency.exponentialRampToValueAtTime(130, st + n.d);
      }

      gain.gain.setValueAtTime(0.24, st);
      gain.gain.exponentialRampToValueAtTime(0.001, st + n.d);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(st);
      osc.stop(st + n.d);
    });
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    if (this.isMuted) {
      this.stopBGM();
      musicBtn.classList.add('muted');
      musicBtn.textContent = '🔇';
    } else {
      musicBtn.classList.remove('muted');
      musicBtn.textContent = '🎵';
      if (currentState === STATE.PLAYING) {
        this.startBGM();
      }
    }
  }
}

const audio = new AudioManager();
musicBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  audio.toggleMute();
});

// Game States
const STATE = {
  READY: 0,
  PLAYING: 1,
  GAMEOVER: 2
};

let currentState = STATE.READY;
let frames = 0;
let score = 0;
let highScore = parseInt(localStorage.getItem('flappy_face_best') || '0', 10);
let screenShake = 0;
let isNewRecord = false;
let particles = [];

function addParticles(x, y, count, color) {
  for (let i = 0; i < count; i++) {
    particles.push({
      x,
      y,
      vx: (Math.random() - 0.5) * 6,
      vy: (Math.random() - 0.5) * 6,
      radius: Math.random() * 3.5 + 1.5,
      alpha: 1,
      color: color || '#38bdf8'
    });
  }
}

function updateParticles() {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.alpha -= 0.03;
    if (p.alpha <= 0) particles.splice(i, 1);
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

// Dark Night Background with Twinkling Stars
class DarkBackground {
  constructor() {
    this.groundX = 0;
    // Generate twinkling night stars
    this.stars = [];
    for (let i = 0; i < 45; i++) {
      this.stars.push({
        x: Math.random() * 360,
        y: Math.random() * 450,
        size: Math.random() * 1.8 + 0.6,
        alpha: Math.random() * 0.7 + 0.3,
        blinkSpeed: Math.random() * 0.04 + 0.01
      });
    }
  }

  update() {
    this.stars.forEach(s => {
      s.alpha += Math.sin(frames * s.blinkSpeed) * 0.02;
      s.alpha = Math.max(0.2, Math.min(1, s.alpha));
    });

    if (currentState !== STATE.GAMEOVER) {
      this.groundX = (this.groundX - 1.65) % 24;
    }
  }

  draw() {
    // Deep Midnight Gradient Sky
    const sky = ctx.createLinearGradient(0, 0, 0, GROUND_Y);
    sky.addColorStop(0, '#030712'); // obsidian black
    sky.addColorStop(0.4, '#090d16'); // deep midnight
    sky.addColorStop(0.75, '#0f172a'); // navy slate
    sky.addColorStop(1, '#1e1b4b'); // deep indigo glow near horizon
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, CANVAS_WIDTH, GROUND_Y);

    // Render Stars
    this.stars.forEach(s => {
      ctx.save();
      ctx.globalAlpha = s.alpha;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });

    // Distant City Skyline Silhouettes
    ctx.fillStyle = 'rgba(15, 23, 42, 0.7)';
    const skyline = [
      [15, 60, 35], [55, 95, 45], [110, 75, 40],
      [160, 110, 50], [220, 85, 40], [270, 120, 55], [335, 70, 35]
    ];
    skyline.forEach(([x, h, w]) => {
      ctx.fillRect(x, GROUND_Y - h, w, h);
    });

    // Dark Ground Base
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, GROUND_Y, CANVAS_WIDTH, CANVAS_HEIGHT - GROUND_Y);

    // Neon Cyan / Indigo Accent Trim
    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(0, GROUND_Y, CANVAS_WIDTH, 4);

    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, GROUND_Y + 4, CANVAS_WIDTH, 12);

    // Diagonal Ground Stripes
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 3;
    for (let x = this.groundX - 30; x < CANVAS_WIDTH + 30; x += 20) {
      ctx.beginPath();
      ctx.moveTo(x, GROUND_Y + 16);
      ctx.lineTo(x - 12, CANVAS_HEIGHT);
      ctx.stroke();
    }
  }
}

// Nivea Roll-On Obstacles (Without Cap - Proportional & Balanced)
class NiveaObstacles {
  constructor() {
    this.items = [];
    this.bottleWidth = 54;
    this.gap = 185; // Wide, friendly gap for fun mobile play
    this.spawnRate = 140; // Plenty of breathing room between obstacles
    this.speed = 1.65; // Balanced, smooth arcade scrolling speed
  }

  reset() {
    this.items = [];
  }

  update() {
    if (currentState !== STATE.PLAYING) return;

    if (frames % this.spawnRate === 0) {
      const minTop = 70;
      const maxTop = GROUND_Y - this.gap - 70;
      const topHeight = Math.floor(Math.random() * (maxTop - minTop + 1)) + minTop;
      this.items.push({
        x: CANVAS_WIDTH,
        top: topHeight,
        passed: false
      });
    }

    for (let i = this.items.length - 1; i >= 0; i--) {
      const p = this.items[i];
      p.x -= this.speed;

      // Scoring
      if (!p.passed && p.x + this.bottleWidth < player.x) {
        p.passed = true;
        score++;
        scoreCounter.textContent = score;
        audio.playScore();
        addParticles(player.x, player.y, 8, '#38bdf8');
        if (score > highScore) {
          highScore = score;
          isNewRecord = true;
          localStorage.setItem('flappy_face_best', highScore);
        }
      }

      // Forgiving circular/box hitbox
      const pBox = {
        left: player.x - player.radius,
        right: player.x + player.radius,
        top: player.y - player.radius,
        bottom: player.y + player.radius
      };

      const hitTop = pBox.right > p.x && pBox.left < p.x + this.bottleWidth && pBox.top < p.top;
      const hitBottom = pBox.right > p.x && pBox.left < p.x + this.bottleWidth && pBox.bottom > p.top + this.gap;

      if (hitTop || hitBottom) {
        triggerGameOver();
      }

      // Remove off-screen
      if (p.x + this.bottleWidth < -20) {
        this.items.splice(i, 1);
      }
    }
  }

  draw() {
    this.items.forEach(p => {
      const bottomY = p.top + this.gap;
      const bottomHeight = GROUND_Y - bottomY;

      // Top Obstacle: inverted Nivea bottle with roller ball at the gap edge
      this.drawNiveaTop(p.x, p.top, this.bottleWidth);

      // Bottom Obstacle: upright Nivea bottle with roller ball at the gap edge
      this.drawNiveaBottom(p.x, bottomY, this.bottleWidth, bottomHeight);
    });
  }

  drawNiveaTop(x, topY, w) {
    ctx.save();
    const naturalH = Math.round(w * 2.5); // ~135px realistic bottle height
    const bottleH = Math.min(topY, naturalH);

    // Support rod above bottle if there is extra ceiling space
    if (topY > naturalH) {
      const rodH = topY - naturalH;
      ctx.fillStyle = '#0f172a';
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 2;
      ctx.fillRect(x + 10, 0, w - 20, rodH);
      ctx.strokeRect(x + 10, 0, w - 20, rodH);
    }

    if (isNiveaLoaded) {
      // Invert vertically so exposed roller ball faces downwards right at topY
      ctx.translate(x + w, topY);
      ctx.scale(-1, -1);
      ctx.drawImage(niveaImg, 0, 0, w, bottleH);
    } else {
      ctx.fillStyle = '#1e3a8a';
      ctx.fillRect(x, 0, w, topY);
    }
    ctx.restore();
  }

  drawNiveaBottom(x, bottomY, w, totalH) {
    ctx.save();
    const naturalH = Math.round(w * 2.5); // ~135px realistic bottle height
    const bottleH = Math.min(totalH, naturalH);

    if (isNiveaLoaded) {
      // Upright so roller ball is right at bottomY pointing up
      ctx.drawImage(niveaImg, x, bottomY, w, bottleH);
    } else {
      ctx.fillStyle = '#1e3a8a';
      ctx.fillRect(x, bottomY, w, bottleH);
    }

    // Support rod below bottle down to ground if there is extra space
    if (totalH > naturalH) {
      const rodY = bottomY + naturalH;
      const rodH = GROUND_Y - rodY;
      ctx.fillStyle = '#0f172a';
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 2;
      ctx.fillRect(x + 10, rodY, w - 20, rodH);
      ctx.strokeRect(x + 10, rodY, w - 20, rodH);
    }

    ctx.restore();
  }
}

// Player (Natural Face Avatar - Balanced Physics & Forgiving Hitbox)
class Player {
  constructor() {
    this.x = 90;
    this.y = 280;
    this.velocity = 0;
    this.gravity = 0.22; // Gentler, smoother gravity
    this.jump = -4.6; // Comfortable, controllable hop
    this.radius = 15; // Forgiving collision hitbox
    
    // Proportional dimensions (uncompressed face)
    this.displayHeight = 52;
    this.displayWidth = 36;
    this.rotation = 0;
  }

  reset() {
    this.x = 90;
    this.y = 280;
    this.velocity = 0;
    this.rotation = 0;
  }

  flap() {
    this.velocity = this.jump;
    addParticles(this.x - 8, this.y + 10, 3, '#94a3b8');
  }

  update() {
    if (currentState === STATE.READY) {
      this.y = 270 + Math.sin(frames * 0.08) * 8;
      this.rotation = 0;
      return;
    }

    this.velocity += this.gravity;
    this.y += this.velocity;

    // Smooth tilt
    if (this.velocity < 0) {
      this.rotation = Math.max(-0.35, this.velocity * 0.06);
    } else {
      this.rotation = Math.min(Math.PI / 2.8, (this.velocity - 2) * 0.08);
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

    if (isPlayerLoaded) {
      // Render face in its original uncompressed form without circular crop and without outline
      ctx.drawImage(
        playerImg,
        -this.displayWidth / 2,
        -this.displayHeight / 2,
        this.displayWidth,
        this.displayHeight
      );
    } else {
      // Fallback
      ctx.fillStyle = '#f97316';
      ctx.beginPath();
      ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }
}

// Instances
const bg = new DarkBackground();
const obstacles = new NiveaObstacles();
const player = new Player();

function triggerGameOver() {
  if (currentState === STATE.GAMEOVER) return;
  currentState = STATE.GAMEOVER;
  screenShake = 16;
  audio.playGameOver();
  addParticles(player.x, player.y, 25, '#ef4444');

  // Update Scorecard Modal
  finalScoreEl.textContent = score;
  finalHighscoreEl.textContent = highScore;

  if (isNewRecord && score > 0) {
    newRecordTag.classList.remove('hidden');
  } else {
    newRecordTag.classList.add('hidden');
  }

  // Medals
  if (score >= 30) {
    medalEmoji.textContent = '💎';
    medalText.textContent = 'Diamond Legend!';
  } else if (score >= 20) {
    medalEmoji.textContent = '🥇';
    medalText.textContent = 'Gold Master!';
  } else if (score >= 10) {
    medalEmoji.textContent = '🥈';
    medalText.textContent = 'Silver Champ!';
  } else if (score >= 5) {
    medalEmoji.textContent = '🥉';
    medalText.textContent = 'Bronze Runner!';
  } else {
    medalEmoji.textContent = '⚡';
    medalText.textContent = 'Keep Trying!';
  }

  // Show Modal after brief impact delay
  setTimeout(() => {
    gameoverModal.classList.remove('hidden');
  }, 300);
}

function resetGame() {
  score = 0;
  isNewRecord = false;
  scoreCounter.textContent = '0';
  player.reset();
  obstacles.reset();
  particles = [];
  gameoverModal.classList.add('hidden');
  readyPrompt.classList.remove('hidden');
  currentState = STATE.READY;
}

// Early Audio Unlock for Mobile Browsers
const unlockAllAudio = () => {
  if (bgmAudio) bgmAudio.load();
  audio.init();
};
window.addEventListener('pointerdown', unlockAllAudio, { once: true });
window.addEventListener('touchstart', unlockAllAudio, { once: true, passive: true });
window.addEventListener('click', unlockAllAudio, { once: true });

// Action Trigger (Touch / Space / Click)
function handleAction() {
  audio.init();

  if (currentState === STATE.READY) {
    currentState = STATE.PLAYING;
    readyPrompt.classList.add('hidden');
    audio.startBGM(); // Start background music on initial tap
    player.flap();
  } else if (currentState === STATE.PLAYING) {
    // If browser deferred audio on the first tap, resume immediately on next tap
    if (bgmAudio && bgmAudio.paused && !audio.isMuted) {
      audio.startBGM();
    }
    player.flap();
  }
}

window.addEventListener('keydown', (e) => {
  if (e.code === 'Space' || e.code === 'ArrowUp') {
    e.preventDefault();
    if (currentState !== STATE.GAMEOVER) {
      handleAction();
    }
  }
});

const onPointerAction = (e) => {
  if (currentState !== STATE.GAMEOVER) {
    handleAction();
  }
};

canvas.addEventListener('pointerdown', onPointerAction);
window.addEventListener('touchstart', (e) => {
  // If tapped inside game wrapper and not on interactive buttons
  if (e.target && !e.target.closest('#music-btn') && !e.target.closest('#restart-button')) {
    if (currentState !== STATE.GAMEOVER) {
      handleAction();
    }
  }
}, { passive: true });

// Immediately attempt to play background audio upon website opening
audio.startBGM();
document.addEventListener('DOMContentLoaded', () => audio.startBGM());
window.addEventListener('load', () => audio.startBGM());

restartBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  resetGame();
  currentState = STATE.PLAYING;
  readyPrompt.classList.add('hidden');
  audio.startBGM();
  player.flap();
});

// Game Loop
function loop() {
  ctx.save();

  if (screenShake > 0) {
    const dx = (Math.random() - 0.5) * screenShake;
    const dy = (Math.random() - 0.5) * screenShake;
    ctx.translate(dx, dy);
    screenShake *= 0.85;
    if (screenShake < 0.5) screenShake = 0;
  }

  bg.update();
  bg.draw();

  obstacles.update();
  obstacles.draw();

  player.update();
  player.draw();

  updateParticles();
  drawParticles();

  ctx.restore();

  frames++;
  requestAnimationFrame(loop);
}

requestAnimationFrame(loop);
