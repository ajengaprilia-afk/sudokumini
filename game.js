// ==========================================
// 1. INISIALISASI GAME & SYSTEM STATE
// ==========================================
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

let currentLevel = 0;
let score = 0;
let lives = 3;
let timer = 60;
let timerInterval = null;
let audioEnabled = true;
let animFrameId = null;

// Konfigurasi Level Sudoku Mini 4x4
const levels = [
  {
    name: "Tingkat Pemula",
    initial: [
      [1, 0, 0, 4],
      [0, 0, 0, 0],
      [0, 0, 3, 0],
      [2, 0, 0, 1]
    ],
    solution: [
      [1, 3, 2, 4],
      [4, 2, 1, 3],
      [3, 1, 4, 2],
      [2, 4, 3, 1]
    ],
    timeLimit: 90
  },
  {
    name: "Tingkat Menengah",
    initial: [
      [0, 2, 0, 0],
      [0, 0, 3, 0],
      [0, 1, 0, 0],
      [0, 0, 4, 0]
    ],
    solution: [
      [3, 2, 1, 4],
      [4, 1, 3, 2],
      [2, 4, 1, 3],
      [1, 3, 4, 2]
    ],
    timeLimit: 60
  },
  {
    name: "Tingkat Lanjut",
    initial: [
      [0, 0, 0, 1],
      [0, 3, 0, 0],
      [0, 0, 2, 0],
      [4, 0, 0, 0]
    ],
    solution: [
      [2, 4, 3, 1],
      [1, 3, 4, 2],
      [3, 1, 2, 4],
      [4, 2, 1, 3]
    ],
    timeLimit: 45
  }
];

let currentGrid = [];
let selectedCell = { r: 0, c: 0 };

// Aset Entitas Bertema (Hero, Musuh, Particle)
const character = { r: 0, c: 0, color: "#8a63d2", pulse: 0 };
const enemy = { r: 3, c: 3, color: "#e74c3c", dirX: 1, dirY: -1 };
let particles = [];

// ==========================================
// 2. AUDIO SYNTHESIZER (Web Audio API)
// ==========================================
const AudioContext = window.AudioContext || window.webkitAudioContext;
let audioCtx = null;

function initAudio() {
  if (!audioCtx) {
    audioCtx = new AudioContext();
  }
}

function playSound(type) {
  if (!audioEnabled) return;
  initAudio();
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }

  const now = audioCtx.currentTime;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.connect(gain);
  gain.connect(audioCtx.destination);

  if (type === 'select') {
    osc.type = 'sine';
    osc.frequency.setValueAtTime(523.25, now); // C5
    osc.frequency.exponentialRampToValueAtTime(659.25, now + 0.08); // E5
    gain.gain.setValueAtTime(0.15, now);
    gain.gain.linearRampToValueAtTime(0.01, now + 0.08);
    osc.start(now);
    osc.stop(now + 0.08);
  } else if (type === 'correct') {
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(587.33, now); // D5
    osc.frequency.setValueAtTime(880, now + 0.1); // A5
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.linearRampToValueAtTime(0.01, now + 0.25);
    osc.start(now);
    osc.stop(now + 0.25);
  } else if (type === 'wrong') {
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(180, now);
    osc.frequency.setValueAtTime(110, now + 0.1);
    gain.gain.setValueAtTime(0.3, now);
    gain.gain.linearRampToValueAtTime(0.01, now + 0.3);
    osc.start(now);
    osc.stop(now + 0.3);
  } else if (type === 'win') {
    osc.type = 'sine';
    osc.frequency.setValueAtTime(440, now);
    osc.frequency.setValueAtTime(554.37, now + 0.1);
    osc.frequency.setValueAtTime(659.25, now + 0.2);
    osc.frequency.setValueAtTime(880, now + 0.3);
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.linearRampToValueAtTime(0.01, now + 0.5);
    osc.start(now);
    osc.stop(now + 0.5);
  }
}

function toggleAudio() {
  audioEnabled = !audioEnabled;
  const btn = document.getElementById("audioToggleBtn");
  btn.innerText = audioEnabled ? "🔊 Audio On" : "🔇 Audio Off";
}

// ==========================================
// 3. LOGIKA UTAMA & SISTEM EFEK
// ==========================================
function initLevel(lvlIdx) {
  if (lvlIdx >= levels.length) {
    playSound('win');
    alert("Selamat! Anda telah memenangkan semua level Sudoku Mini!");
    currentLevel = 0;
    score = 0;
  }

  const lvl = levels[currentLevel];
  currentGrid = JSON.parse(JSON.stringify(lvl.initial));
  timer = lvl.timeLimit;
  lives = 3;
  selectedCell = { r: 0, c: 0 };
  character.r = 0;
  character.c = 0;

  clearInterval(timerInterval);
  timerInterval = setInterval(() => {
    if (timer > 0) {
      timer--;
      // Pergerakan Rintangan Musuh secara patroli dinamis
      updateEnemyPosition();
    } else {
      playSound('wrong');
      alert("Waktu Habis! Level diulang.");
      initLevel(currentLevel);
    }
  }, 1000);
}

function updateEnemyPosition() {
  let nextC = enemy.c + enemy.dirX;
  let nextR = enemy.r + enemy.dirY;

  if (nextC < 0 || nextC > 3) {
    enemy.dirX *= -1;
    nextC = enemy.c + enemy.dirX;
  }
  if (nextR < 0 || nextR > 3) {
    enemy.dirY *= -1;
    nextR = enemy.r + enemy.dirY;
  }

  enemy.c = nextC;
  enemy.r = nextR;
}

function triggerParticles(x, y) {
  for (let i = 0; i < 12; i++) {
    particles.push({
      x: x,
      y: y,
      vx: (Math.random() - 0.5) * 6,
      vy: (Math.random() - 0.5) * 6,
      life: 1.0,
      color: `hsl(${Math.random() * 60 + 260}, 80%, 60%)`
    });
  }
}

function selectCell(r, c) {
  selectedCell = { r, c };
  character.r = r;
  character.c = c;
  playSound('select');
}

function inputNumber(num) {
  const lvl = levels[currentLevel];
  if (lvl.initial[selectedCell.r][selectedCell.c] !== 0) return;

  currentGrid[selectedCell.r][selectedCell.c] = num;
  
  const offsetX = 40;
  const offsetY = 110;
  const cellSize = 100;
  const pX = offsetX + selectedCell.c * cellSize + cellSize / 2;
  const pY = offsetY + selectedCell.r * cellSize + cellSize / 2;

  if (num === lvl.solution[selectedCell.r][selectedCell.c]) {
    playSound('correct');
    triggerParticles(pX, pY);
    score += 100;
    checkWin();
  } else {
    playSound('wrong');
    lives--;
    score = Math.max(0, score - 30);
    if (lives <= 0) {
      alert("Kesempatan habis! Level diulang.");
      initLevel(currentLevel);
    }
  }
}

function checkWin() {
  const lvl = levels[currentLevel];
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      if (currentGrid[r][c] !== lvl.solution[r][c]) return;
    }
  }

  playSound('win');
  setTimeout(() => {
    alert(`Level ${currentLevel + 1} Selesai! Bonus Waktu: +${timer * 10}`);
    score += timer * 10;
    currentLevel++;
    initLevel(currentLevel);
  }, 250);
}

function resetLevel() {
  initLevel(currentLevel);
}

// ==========================================
// 4. RENDERING CANVAS & ANIMASI
// ==========================================
function render() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Background Gradient Soft Cream / Purple Accent
  const bgGrad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  bgGrad.addColorStop(0, "#fcfbfe");
  bgGrad.addColorStop(1, "#f1ebf8");
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Header Logo "SUDOKU MINI"
  ctx.fillStyle = "#332a45";
  ctx.font = "900 24px 'Segoe UI', sans-serif";
  ctx.textAlign = "left";
  ctx.fillText("SUDOKU MINI", 25, 38);

  ctx.fillStyle = "#7c5295";
  ctx.font = "600 13px 'Segoe UI', sans-serif";
  ctx.fillText(levels[currentLevel].name, 25, 56);

  // Stats / HUD Container
  ctx.fillStyle = "#2a2238";
  ctx.font = "bold 13px sans-serif";
  ctx.textAlign = "right";
  ctx.fillText(`Skor: ${score}`, canvas.width - 25, 32);
  ctx.fillText(`Waktu: ${timer}s`, canvas.width - 25, 52);
  ctx.fillText(`Nyawa: ${"❤️".repeat(lives)}`, canvas.width - 25, 72);

  // Grid Setup
  const offsetX = 40;
  const offsetY = 110;
  const cellSize = 100;

  // Render Cell Grid
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      const x = offsetX + c * cellSize;
      const y = offsetY + r * cellSize;

      ctx.fillStyle = (selectedCell.r === r && selectedCell.c === c) ? "#e8daf8" : "#ffffff";
      ctx.fillRect(x, y, cellSize, cellSize);

      ctx.strokeStyle = "#e0d8eb";
      ctx.lineWidth = 1;
      ctx.strokeRect(x, y, cellSize, cellSize);

      // Angka
      const val = currentGrid[r][c];
      if (val !== 0) {
        const isInitial = levels[currentLevel].initial[r][c] !== 0;
        ctx.fillStyle = isInitial ? "#282136" : "#8a63d2";
        ctx.font = isInitial ? "bold 36px sans-serif" : "36px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(val, x + cellSize / 2, y + cellSize / 2);
      }
    }
  }

  // Sub-grid 2x2 Boundary Lines
  ctx.strokeStyle = "#4b3c63";
  ctx.lineWidth = 3;
  ctx.strokeRect(offsetX, offsetY, cellSize * 4, cellSize * 4);
  
  ctx.beginPath();
  ctx.moveTo(offsetX + cellSize * 2, offsetY);
  ctx.lineTo(offsetX + cellSize * 2, offsetY + cellSize * 4);
  ctx.moveTo(offsetX, offsetY + cellSize * 2);
  ctx.lineTo(offsetX + cellSize * 4, offsetY + cellSize * 2);
  ctx.stroke();

  // Character Marker (Aset Hero)
  character.pulse += 0.05;
  const charX = offsetX + character.c * cellSize + 18;
  const charY = offsetY + character.r * cellSize + 18;
  const pulseRadius = 7 + Math.sin(character.pulse) * 1.5;

  ctx.fillStyle = character.color;
  ctx.beginPath();
  ctx.arc(charX, charY, pulseRadius, 0, Math.PI * 2);
  ctx.fill();

  // Enemy Marker (Aset Rintangan)
  const enemyX = offsetX + enemy.c * cellSize + 82;
  const enemyY = offsetY + enemy.r * cellSize + 82;
  ctx.fillStyle = enemy.color;
  ctx.beginPath();
  ctx.arc(enemyX, enemyY, 7, 0, Math.PI * 2);
  ctx.fill();

  // Render Partikel
  for (let i = particles.length - 1; i >= 0; i--) {
    let p = particles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.life -= 0.03;

    if (p.life <= 0) {
      particles.splice(i, 1);
      continue;
    }

    ctx.fillStyle = p.color;
    ctx.globalAlpha = p.life;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1.0;
  }

  // Render Control Numpad & Joystick
  drawNumpad();
  drawJoystick();

  animFrameId = requestAnimationFrame(render);
}

function drawNumpad() {
  const startY = 525;
  const numbers = [1, 2, 3, 4];

  numbers.forEach((num, idx) => {
    const x = 35 + idx * 62;
    ctx.fillStyle = "#7c5295";
    ctx.beginPath();
    ctx.roundRect(x, startY, 52, 52, 10);
    ctx.fill();

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 22px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(num, x + 26, startY + 26);
  });
}

function drawJoystick() {
  const jx = 395;
  const jy = 551;

  // Track Pad
  ctx.fillStyle = "#e5dcf2";
  ctx.beginPath();
  ctx.arc(jx, jy, 32, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "#b39ddb";
  ctx.lineWidth = 2;
  ctx.stroke();

  // Directional Node
  ctx.fillStyle = "#4b3c63";
  ctx.font = "bold 11px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("PAD", jx, jy);
}

// ==========================================
// 5. INPUT CONTROLLERS
// ==========================================
canvas.addEventListener("pointerdown", (e) => {
  const rect = canvas.getBoundingClientRect();
  const x = (e.clientX - rect.left) * (canvas.width / rect.width);
  const y = (e.clientY - rect.top) * (canvas.height / rect.height);

  const offsetX = 40;
  const offsetY = 110;
  const cellSize = 100;

  // Klik Grid Sudoku
  if (x >= offsetX && x <= offsetX + cellSize * 4 && y >= offsetY && y <= offsetY + cellSize * 4) {
    const c = Math.floor((x - offsetX) / cellSize);
    const r = Math.floor((y - offsetY) / cellSize);
    selectCell(r, c);
  }

  // Klik Numpad
  if (y >= 525 && y <= 577) {
    [1, 2, 3, 4].forEach((num, idx) => {
      const btnX = 35 + idx * 62;
      if (x >= btnX && x <= btnX + 52) {
        inputNumber(num);
      }
    });
  }

  // Interaksi Virtual Joystick / D-Pad
  const jx = 395;
  const jy = 551;
  const dist = Math.hypot(x - jx, y - jy);
  if (dist <= 35) {
    const dx = x - jx;
    const dy = y - jy;
    if (Math.abs(dx) > Math.abs(dy)) {
      if (dx > 0 && selectedCell.c < 3) selectCell(selectedCell.r, selectedCell.c + 1);
      else if (dx < 0 && selectedCell.c > 0) selectCell(selectedCell.r, selectedCell.c - 1);
    } else {
      if (dy > 0 && selectedCell.r < 3) selectCell(selectedCell.r + 1, selectedCell.c);
      else if (dy < 0 && selectedCell.r > 0) selectCell(selectedCell.r - 1, selectedCell.c);
    }
  }
});

// Kontrol Keyboard Alternatif
window.addEventListener("keydown", (e) => {
  if (["1", "2", "3", "4"].includes(e.key)) {
    inputNumber(parseInt(e.key));
  } else if (e.key === "ArrowUp" && selectedCell.r > 0) selectCell(selectedCell.r - 1, selectedCell.c);
  else if (e.key === "ArrowDown" && selectedCell.r < 3) selectCell(selectedCell.r + 1, selectedCell.c);
  else if (e.key === "ArrowLeft" && selectedCell.c > 0) selectCell(selectedCell.r, selectedCell.c - 1);
  else if (e.key === "ArrowRight" && selectedCell.c < 3) selectCell(selectedCell.r, selectedCell.c + 1);
});

// Start Loop & Level
initLevel(0);
render();
