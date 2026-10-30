// Flappy Face vs Rexona - Mobile Fullscreen Engine
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
  // Calculate vertical height to match mobile aspect ratio
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

const rexonaImg = new Image();
rexonaImg.src = 'assets/rexona.png';
let isRexonaLoaded = false;
rexonaImg.onload = () => { isRexonaLoaded = true; };

// Audio Manager (Supports Custom MP3 + Web Audio Synth Fallback)
class AudioManager {
  constructor() {
    this.ctx = null;
    this.isMuted = false;
    this.isPlayingMusic = false;
    this.customBgmLoaded = false;
    this.customGameOverLoaded = false;
    this.bgmTimer = null;
    this.noteStep = 0;

    // Check if custom MP3 audio files are available
    if (bgmAudio) {
      bgmAudio.addEventListener('canplaythrough', () => {
        this.customBgmLoaded = true;
      });
      bgmAudio.addEventListener('error', () => {
        this.customBgmLoaded = false;
      });
    }

    if (gameoverAudio) {
      gameoverAudio.addEventListener('canplaythrough', () => {
        this.customGameOverLoaded = true;
      });
      gameoverAudio.addEventListener('error', () => {
        this.customGameOverLoaded = false;
      });
    }
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  startBGM() {
    if (this.isMuted || this.isPlayingMusic) return;
    this.init();
    this.isPlayingMusic = true;

    // Try custom audio element first
    if (this.customBgmLoaded && bgmAudio) {
      bgmAudio.currentTime = 0;
      bgmAudio.volume = 0.65;
      bgmAudio.play().catch(() => {
        this.startSynthBGM();
      });
    } else {
      this.startSynthBGM();
    }
  }

  stopBGM() {
    this.isPlayingMusic = false;
    if (bgmAudio) {
      bgmAudio.pause();
    }
    if (this.bgmTimer) {
      clearInterval(this.bgmTimer);
      this.bgmTimer = null;
    }
  }

  // Built-in catchy arcade background song synthesizer
  startSynthBGM() {
    if (!this.ctx || this.bgmTimer) return;
    
    // Catchy upbeat melody notes (frequencies in Hz)
    const melody = [
      261.63, 0, 293.66, 329.63, 0, 392.00, 329.63, 0,
      349.23, 0, 329.63, 293.66, 0, 261.63, 196.00, 0,
      261.63, 329.63, 392.00, 523.25, 0, 392.00, 329.63, 0,
      293.66, 0, 349.23, 392.00, 0, 293.66, 261.63, 0
    ];

    const bass = [
      130.81, 130.81, 164.81, 164.81, 174.61, 174.61, 196.00, 196.00,
      130.81, 130.81, 164.81, 164.81, 146.83, 146.83, 130.81, 130.81
    ];

    this.noteStep = 0;
    this.bgmTimer = setInterval(() => {
      if (!this.isPlayingMusic || this.isMuted || !this.ctx) return;
      const now = this.ctx.currentTime;
      const note = melody[this.noteStep % melody.length];

      if (note > 0) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(note, now);

        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.16);
      }

      // Bass note every 2 steps
      if (this.noteStep % 2 === 0) {
        const bNote = bass[(Math.floor(this.noteStep / 2)) % bass.length];
        const bOsc = this.ctx.createOscillator();
        const bGain = this.ctx.createGain();
        bOsc.type = 'sine';
        bOsc.frequency.setValueAtTime(bNote, now);

        bGain.gain.setValueAtTime(0.12, now);
        bGain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

        bOsc.connect(bGain);
        bGain.connect(this.ctx.destination);
        bOsc.start(now);
        bOsc.stop(now + 0.22);
      }

      this.noteStep++;
    }, 175);
  }

  playScore() {
    if (this.isMuted || !this.ctx) return;
    const now = this.ctx.currentTime;
    [523.25, 783.99].forEach((freq, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const st = now + (i * 0.07);

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, st);
      gain.gain.setValueAtTime(0.2, st);
      gain.gain.exponentialRampToValueAtTime(0.001, st + 0.15);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(st);
      osc.stop(st + 0.15);
    });
  }

  // Game over sound (different sound, distinct defeat jingle)
  playGameOver() {
    this.stopBGM();
    if (this.isMuted) return;

    if (this.customGameOverLoaded && gameoverAudio) {
      gameoverAudio.currentTime = 0;
      gameoverAudio.volume = 0.8;
      gameoverAudio.play().catch(() => this.playSynthGameOver());
    } else {
      this.playSynthGameOver();
    }
  }

  playSynthGameOver() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    
    // Funny descending arcade defeat sequence
    const notes = [
      { f: 392.00, t: 0.00, d: 0.22 }, // G4
      { f: 369.99, t: 0.22, d: 0.22 }, // F#4
      { f: 349.23, t: 0.44, d: 0.22 }, // F4
      { f: 293.66, t: 0.66, d: 0.60 }  // D4 slide down
    ];

    notes.forEach(n => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const st = now + n.t;

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(n.f, st);
      if (n.f === 293.66) {
        osc.frequency.exponentialRampToValueAtTime(140, st + n.d);
      }

      gain.gain.setValueAtTime(0.22, st);
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
      radius: Math.random() * 4 + 2,
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

// Background
class Background {
  constructor() {
    this.clouds = [
      { x: 30, y: 70, s: 0.35, r: 35 },
      { x: 210, y: 120, s: 0.25, r: 26 },
      { x: 330, y: 50, s: 0.4, r: 42 }
    ];
    this.groundX = 0;
  }

  update() {
    this.clouds.forEach(c => {
      c.x -= c.s;
      if (c.x + c.r * 2 < 0) c.x = CANVAS_WIDTH + 50;
    });

    if (currentState !== STATE.GAMEOVER) {
      this.groundX = (this.groundX - 2.5) % 24;
    }
  }

  draw() {
    // Sky gradient
    const sky = ctx.createLinearGradient(0, 0, 0, GROUND_Y);
    sky.addColorStop(0, '#38bdf8');
    sky.addColorStop(0.7, '#bae6fd');
    sky.addColorStop(1, '#e0f2fe');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, CANVAS_WIDTH, GROUND_Y);

    // Clouds
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    this.clouds.forEach(c => {
      ctx.beginPath();
      ctx.arc(c.x, c.y, c.r, 0, Math.PI * 2);
      ctx.arc(c.x + c.r * 0.7, c.y - c.r * 0.3, c.r * 0.75, 0, Math.PI * 2);
      ctx.arc(c.x + c.r * 1.3, c.y, c.r * 0.8, 0, Math.PI * 2);
      ctx.fill();
    });

    // Ground Base
    ctx.fillStyle = '#ded895';
    ctx.fillRect(0, GROUND_Y, CANVAS_WIDTH, CANVAS_HEIGHT - GROUND_Y);

    // Grass Top Border
    ctx.fillStyle = '#22c55e';
    ctx.fillRect(0, GROUND_Y, CANVAS_WIDTH, 14);

    ctx.fillStyle = '#15803d';
    ctx.fillRect(0, GROUND_Y + 14, CANVAS_WIDTH, 4);

    // Diagonal grass/dirt stripes
    ctx.strokeStyle = '#c5bc73';
    ctx.lineWidth = 3;
    for (let x = this.groundX - 30; x < CANVAS_WIDTH + 30; x += 20) {
      ctx.beginPath();
      ctx.moveTo(x, GROUND_Y + 18);
      ctx.lineTo(x - 12, CANVAS_HEIGHT);
      ctx.stroke();
    }
  }
}

// Rexona Obstacles Manager
class RexonaObstacles {
  constructor() {
    this.items = [];
    this.bottleWidth = 64; // width of Rexona bottle
    this.gap = 145; // comfortable gap for mobile
    this.spawnRate = 110;
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
      p.x -= 2.4;

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

      // Hitbox Collision Detection (Forgiving for fun gameplay)
      const pBox = {
        left: player.x - player.radius + 5,
        right: player.x + player.radius - 5,
        top: player.y - player.radius + 5,
        bottom: player.y + player.radius - 5
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

      // Top Rexona (Hanging upside down, roller ball cap faces down)
      this.drawRexonaBottle(p.x, 0, this.bottleWidth, p.top, true);

      // Bottom Rexona (Standing upright, roller ball cap faces up)
      this.drawRexonaBottle(p.x, bottomY, this.bottleWidth, bottomHeight, false);
    });
  }

  drawRexonaBottle(x, y, w, h, isTop) {
    ctx.save();
    if (isRexonaLoaded) {
      if (isTop) {
        // Invert top bottle vertically
        ctx.translate(x + w, y + h);
        ctx.scale(-1, -1);
        ctx.drawImage(rexonaImg, 0, 0, w, h);
      } else {
        ctx.drawImage(rexonaImg, x, y, w, h);
      }
    } else {
      // Fallback styling if image still downloading
      ctx.fillStyle = '#0284c7';
      ctx.fillRect(x, y, w, h);
    }
    ctx.restore();
  }
}

// Player (Custom Avatar Face)
class Player {
  constructor() {
    this.x = 90;
    this.y = 280;
    this.velocity = 0;
    this.gravity = 0.28;
    this.jump = -5.5;
    this.radius = 22; // collision radius
    this.drawSize = 52; // rendered face avatar size
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
    // Jump sound REMOVED as requested!
    addParticles(this.x - 12, this.y + 10, 3, '#ffffff');
  }

  update() {
    if (currentState === STATE.READY) {
      // Idle bobbing
      this.y = 270 + Math.sin(frames * 0.08) * 9;
      this.rotation = 0;
      return;
    }

    this.velocity += this.gravity;
    this.y += this.velocity;

    // Tilt rotation based on vertical speed
    if (this.velocity < 0) {
      this.rotation = Math.max(-0.4, this.velocity * 0.07);
    } else {
      this.rotation = Math.min(Math.PI / 2.5, (this.velocity - 2) * 0.09);
    }

    // Ground check
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
      // Draw Avatar image with cute rounded border shadow
      ctx.save();
      ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
      ctx.shadowBlur = 8;
      ctx.shadowOffsetY = 3;

      // Circular clip mask for polished avatar look
      ctx.beginPath();
      ctx.arc(0, 0, this.drawSize / 2, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();

      ctx.drawImage(
        playerImg,
        -this.drawSize / 2,
        -this.drawSize / 2,
        this.drawSize,
        this.drawSize
      );
      ctx.restore();

      // Golden ring highlight around head
      ctx.strokeStyle = '#facc15';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(0, 0, this.drawSize / 2, 0, Math.PI * 2);
      ctx.stroke();

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
const bg = new Background();
const obstacles = new RexonaObstacles();
const player = new Player();

function triggerGameOver() {
  if (currentState === STATE.GAMEOVER) return;
  currentState = STATE.GAMEOVER;
  screenShake = 16;
  audio.playGameOver();
  addParticles(player.x, player.y, 25, '#ef4444');

  // Populate Scorecard Modal
  finalScoreEl.textContent = score;
  finalHighscoreEl.textContent = highScore;

  if (isNewRecord && score > 0) {
    newRecordTag.classList.remove('hidden');
  } else {
    newRecordTag.classList.add('hidden');
  }

  // Medals calculation
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

  // Show Modal after short dramatic pause
  setTimeout(() => {
    gameoverModal.classList.remove('hidden');
  }, 350);
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

// Touch / Tap / Key Action
function handleAction() {
  audio.init();

  if (currentState === STATE.READY) {
    currentState = STATE.PLAYING;
    readyPrompt.classList.add('hidden');
    audio.startBGM(); // Start continuous song in background!
    player.flap();
  } else if (currentState === STATE.PLAYING) {
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

canvas.addEventListener('pointerdown', (e) => {
  e.preventDefault();
  if (currentState !== STATE.GAMEOVER) {
    handleAction();
  }
});

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
