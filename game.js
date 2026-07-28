// ==========================================
// 1. GAME SETUP & STATE
// ==========================================
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

let currentLevel = 0;
let score = 0;
let lives = 3;
let timer = 60; // Time obstacle per level
let timerInterval = null;
let audioEnabled = true;

// Grid Sudoku Mini 4x4
const levels = [
  {
    // Level 1: Mudah
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
    // Level 2: Sedang
    initial: [
      [0, 2, 0, 0],
      [0, 0, 3, 0],
      [0, 1, 0, 0],
      [0, 0, 4, 0]
    ],
    solution: [
      [3, 2, 1, 4],
      [4, 1, 3, 2],
      [2, 1, 4, 3], // Catatan: Solusi valid 4x4
      [1, 3, 4, 2]
    ],
    timeLimit: 60
  }
];

let currentGrid = [];
let selectedCell = { r: 0, c: 0 };

// Karakter Hero & Enemy (Rintangan Visual)
const character = { r: 0, c: 0, color: "#8a63d2" };
const enemy = { r: 3, c: 3, color: "#e74c3c", dir: 1 };

// ==========================================
// 2. AUDIO SYNTHESIZER (Tanpa File Aset)
// ==========================================
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function playSound(freq, duration) {
  if (!audioEnabled) return;
  try {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.frequency.value = freq;
    osc.start();
    gain.gain.exponentialRampToValueAtTime(0.00001, audioCtx.currentTime + duration);
    osc.stop(audioCtx.currentTime + duration);
  } catch (e) {}
}

function toggleAudio() {
  audioEnabled = !audioEnabled;
  if (audioCtx.state === 'suspended') audioCtx.resume();
}

// ==========================================
// 3. LOGIKA GAME & INTERAKSI
// ==========================================
function initLevel(lvlIdx) {
  if (lvlIdx >= levels.length) {
    alert("Selamat! Kamu telah menyelesaikan semua level!");
    currentLevel = 0;
    score = 0;
  }
  
  const lvl = levels[currentLevel];
  currentGrid = JSON.parse(JSON.stringify(lvl.initial));
  timer = lvl.timeLimit;
  lives = 3;
  selectedCell = { r: 0, c: 0 };
  
  clearInterval(timerInterval);
  timerInterval = setInterval(() => {
    if (timer > 0) {
      timer--;
      // Pergerakan Rintangan Musuh
      if (timer % 3 === 0) {
        enemy.c = (enemy.c + enemy.dir + 4) % 4;
      }
    } else {
      playSound(150, 0.5); // Sound Kalah
      alert("Waktu Habis! Level Diulang.");
      initLevel(currentLevel);
    }
    draw();
  }, 1000);
}

function selectCell(r, c) {
  selectedCell = { r, c };
  character.r = r;
  character.c = c;
  playSound(440, 0.1);
  draw();
}

function inputNumber(num) {
  const lvl = levels[currentLevel];
  // Jangan ubah angka bawaan awal
  if (lvl.initial[selectedCell.r][selectedCell.c] !== 0) return;

  currentGrid[selectedCell.r][selectedCell.c] = num;
  
  // Validasi Input
  if (num === lvl.solution[selectedCell.r][selectedCell.c]) {
    playSound(880, 0.15); // Sound Benar
    score += 50;
    checkWin();
  } else {
    playSound(200, 0.3); // Sound Salah
    lives--;
    score = Math.max(0, score - 20);
    if (lives <= 0) {
      alert("Kesempatan habis! Level diulang.");
      initLevel(currentLevel);
    }
  }
  draw();
}

function checkWin() {
  const lvl = levels[currentLevel];
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      if (currentGrid[r][c] !== lvl.solution[r][c]) return;
    }
  }
  
  playSound(1200, 0.4);
  setTimeout(() => {
    alert("Level Selesai!");
    currentLevel++;
    initLevel(currentLevel);
  }, 200);
}

function resetLevel() {
  initLevel(currentLevel);
}

// ==========================================
// 4. RENDERING & VISUAL (Canvas)
// ==========================================
function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Background
  ctx.fillStyle = "#f8f5fd";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Header / Logo & HUD
  ctx.fillStyle = "#4a3e6d";
  ctx.font = "bold 22px sans-serif";
  ctx.fillText("AJENG MINI SUDOKU", 20, 35);

  ctx.font = "14px sans-serif";
  ctx.fillText(`Level: ${currentLevel + 1}`, 20, 65);
  ctx.fillText(`Skor: ${score}`, 120, 65);
  ctx.fillText(`Nyawa: ${"❤️".repeat(lives)}`, 220, 65);
  ctx.fillText(`Waktu: ${timer}s`, 360, 65);

  // Grid Sudoku (Offset X: 40, Y: 100, Cell Size: 100)
  const offsetX = 40;
  const offsetY = 100;
  const cellSize = 100;

  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      const x = offsetX + c * cellSize;
      const y = offsetY + r * cellSize;

      // Cell Highlight
      if (selectedCell.r === r && selectedCell.c === c) {
        ctx.fillStyle = "#e2d5f8";
        ctx.fillRect(x, y, cellSize, cellSize);
      } else {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(x, y, cellSize, cellSize);
      }

      ctx.strokeStyle = "#ccc";
      ctx.lineWidth = 1;
      ctx.strokeRect(x, y, cellSize, cellSize);

      // Angka Sudoku
      const val = currentGrid[r][c];
      if (val !== 0) {
        const isInitial = levels[currentLevel].initial[r][c] !== 0;
        ctx.fillStyle = isInitial ? "#222" : "#6c5ce7";
        ctx.font = "bold 36px sans-serif";
        ctx.fillText(val, x + 40, y + 62);
      }
    }
  }

  // Tebalkan Garis Sub-Grid 2x2
  ctx.strokeStyle = "#4a3e6d";
  ctx.lineWidth = 3;
  ctx.strokeRect(offsetX, offsetY, cellSize * 4, cellSize * 4);
  ctx.beginPath();
  ctx.moveTo(offsetX + cellSize * 2, offsetY);
  ctx.lineTo(offsetX + cellSize * 2, offsetY + cellSize * 4);
  ctx.moveTo(offsetX, offsetY + cellSize * 2);
  ctx.lineTo(offsetX + cellSize * 4, offsetY + cellSize * 2);
  ctx.stroke();

  // Aset Karakter Player (Ikon Ungu)
  const charX = offsetX + character.c * cellSize + 15;
  const charY = offsetY + character.r * cellSize + 15;
  ctx.fillStyle = character.color;
  ctx.beginPath();
  ctx.arc(charX, charY, 8, 0, Math.PI * 2);
  ctx.fill();

  // Aset Musuh / Rintangan (Ikon Merah)
  const enemyX = offsetX + enemy.c * cellSize + 85;
  const enemyY = offsetY + enemy.r * cellSize + 85;
  ctx.fillStyle = enemy.color;
  ctx.beginPath();
  ctx.arc(enemyX, enemyY, 8, 0, Math.PI * 2);
  ctx.fill();

  // Virtual Numpad & Controls (Di Bawah Grid)
  drawNumpad();
  drawVirtualJoystick();
}

function drawNumpad() {
  const startY = 510;
  const numbers = [1, 2, 3, 4];
  
  numbers.forEach((num, idx) => {
    const x = 50 + idx * 60;
    ctx.fillStyle = "#8a63d2";
    ctx.beginPath();
    ctx.roundRect(x, startY, 50, 50, 8);
    ctx.fill();

    ctx.fillStyle = "#fff";
    ctx.font = "bold 20px sans-serif";
    ctx.fillText(num, x + 19, startY + 32);
  });
}

function drawVirtualJoystick() {
  // Area Joystick Sederhana (Sisi Kanan Bawah)
  const jx = 380;
  const jy = 535;

  ctx.fillStyle = "#dcd6f7";
  ctx.beginPath();
  ctx.arc(jx, jy, 35, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#4a3e6d";
  ctx.font = "12px sans-serif";
  ctx.fillText("JOYSTICK", jx - 26, jy + 4);
}

// ==========================================
// 5. INPUT CONTROLLER (Mouse & Touch)
// ==========================================
canvas.addEventListener("pointerdown", (e) => {
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;

  const offsetX = 40;
  const offsetY = 100;
  const cellSize = 100;

  // Klik Area Grid Sudoku
  if (x >= offsetX && x <= offsetX + cellSize * 4 && y >= offsetY && y <= offsetY + cellSize * 4) {
    const c = Math.floor((x - offsetX) / cellSize);
    const r = Math.floor((y - offsetY) / cellSize);
    selectCell(r, c);
  }

  // Klik Numpad (1-4)
  if (y >= 510 && y <= 560) {
    [1, 2, 3, 4].forEach((num, idx) => {
      const btnX = 50 + idx * 60;
      if (x >= btnX && x <= btnX + 50) {
        inputNumber(num);
      }
    });
  }

  // Klik D-Pad / Joystick Virtual
  const jx = 380;
  const jy = 535;
  const dist = Math.hypot(x - jx, y - jy);
  if (dist <= 35) {
    // Navigasi Karakter via Joystick
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

// Kontrol Keyboard Tambahan
window.addEventListener("keydown", (e) => {
  if (["1", "2", "3", "4"].includes(e.key)) {
    inputNumber(parseInt(e.key));
  } else if (e.key === "ArrowUp" && selectedCell.r > 0) selectCell(selectedCell.r - 1, selectedCell.c);
  else if (e.key === "ArrowDown" && selectedCell.r < 3) selectCell(selectedCell.r + 1, selectedCell.c);
  else if (e.key === "ArrowLeft" && selectedCell.c > 0) selectCell(selectedCell.r, selectedCell.c - 1);
  else if (e.key === "ArrowRight" && selectedCell.c < 3) selectCell(selectedCell.r, selectedCell.c + 1);
});

// Jalankan Game
initLevel(0);
draw();
