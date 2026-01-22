// 1. 구글 앱 스크립트 웹 앱 URL을 여기에 꼭 넣어주세요!
const SCRIPT_URL = "YOUR_GOOGLE_APP_SCRIPT_URL"; 

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
let dpr = window.devicePixelRatio || 1;
function resizeCanvas() {
  canvas.width = window.innerWidth * dpr;
  canvas.height = window.innerHeight * dpr;
  ctx.scale(dpr, dpr);
}
resizeCanvas();

let score = 0;
let gameOver = false;
let gameStarted = false;
let isModalOpen = true; 
let userNickname = localStorage.getItem("sayuri_nickname");

let items = [];
const targetFPS = 60;
let lastTime = performance.now();
let lastSpawnTime = 0;
let inkEffectTimer = 0; 

// 이미지 로드
const hangyodonImg = new Image(); hangyodonImg.src = "images/hangyodon.png";
const sayuriImg = new Image(); sayuriImg.src = "images/sayuri.png";
const octopusImg = new Image(); octopusImg.src = "images/octopus.png";
const inkImg = new Image(); inkImg.src = "images/ink.png";

const player = {
  x: window.innerWidth / 2 - 65, y: window.innerHeight - 150,
  width: 130, height: 110, speed: 15, targetX: window.innerWidth / 2 - 65, isDragging: false
};

const nickOverlay = document.getElementById("nickname-overlay");
const infoModal = document.getElementById("modal-overlay");
const startOverlay = document.getElementById("start-overlay");
const gameOverModal = document.getElementById("gameover-overlay");

// 초기 실행 흐름 제어 (닉네임 체크)
window.addEventListener("load", () => {
  if (!userNickname) {
    nickOverlay.classList.remove("hidden");
  } else {
    infoModal.classList.remove("hidden");
  }
});

document.getElementById("save-nickname-btn").onclick = () => {
  const input = document.getElementById("nickname-input").value.trim();
  if (input) {
    localStorage.setItem("sayuri_nickname", input);
    userNickname = input;
    nickOverlay.classList.add("hidden");
    infoModal.classList.remove("hidden");
  }
};

document.getElementById("close-btn").onclick = (e) => {
  e.stopPropagation();
  infoModal.classList.add("hidden");
  isModalOpen = false;
  if (!gameStarted) {
    startOverlay.classList.remove("hidden");
  } else {
    lastTime = performance.now();
    requestAnimationFrame(update);
  }
};

document.getElementById("info-btn").onclick = (e) => {
  e.stopPropagation();
  isModalOpen = true;
  infoModal.classList.remove("hidden");
};

document.getElementById("restart-btn").onclick = () => { location.reload(); };

function handleInput(e) {
  if (isModalOpen || gameOver) return;
  if (!gameStarted && !startOverlay.classList.contains("hidden")) { startGame(); return; }
  player.isDragging = true;
  const clientX = (e.clientX !== undefined) ? e.clientX : (e.touches && e.touches[0].clientX);
  player.targetX = clientX - player.width / 2;
}

canvas.addEventListener("mousedown", handleInput);
window.addEventListener("mousemove", (e) => { if(player.isDragging) handleInput(e); });
window.addEventListener("mouseup", () => player.isDragging = false);
canvas.addEventListener("touchstart", (e) => { e.preventDefault(); handleInput(e); }, {passive: false});
window.addEventListener("touchmove", (e) => { e.preventDefault(); handleInput(e); }, {passive: false});
window.addEventListener("touchend", () => player.isDragging = false);
startOverlay.addEventListener("click", handleInput);

function startGame() {
  gameStarted = true;
  startOverlay.classList.add("hidden");
  lastTime = performance.now();
  lastSpawnTime = performance.now();
  requestAnimationFrame(update);
}

// 랭킹 업데이트
async function updateRanking() {
  const list = document.getElementById("ranking-list");
  try {
    await fetch(SCRIPT_URL, {
      method: "POST",
      body: JSON.stringify({ action: "save", name: userNickname, score: score })
    });
    const res = await fetch(SCRIPT_URL, {
      method: "POST",
      body: JSON.stringify({ action: "getRank" })
    });
    const top5 = await res.json();
    list.innerHTML = top5.map((r, i) => `<div>${i+1}위. <strong>${r[0]}</strong> - ${r[1]}점</div>`).join("");
  } catch (e) {
    list.innerText = "랭킹 로딩 실패";
  }
}

function showGameOver() {
  gameOver = true;
  const best = localStorage.getItem("sayuri_best") || 0;
  if (score > parseInt(best)) localStorage.setItem("sayuri_best", score);
  document.getElementById("final-score").innerText = score;
  document.getElementById("best-score").innerText = localStorage.getItem("sayuri_best");
  gameOverModal.classList.remove("hidden");
  updateRanking();
}

function update(timestamp) {
  if (gameOver || !gameStarted || isModalOpen) return;
  const deltaTime = timestamp - lastTime;
  lastTime = timestamp;
  const timeFactor = deltaTime / 16.67;
  ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);

  if (player.isDragging) player.x += (player.targetX - player.x) * 0.25 * timeFactor;
  player.x = Math.max(0, Math.min(window.innerWidth - player.width, player.x));

  if (timestamp - lastSpawnTime > Math.max(300, 500 - (score/10))) {
    const isOctopus = Math.random() < 0.15;
    items.push({ x: Math.random() * (window.innerWidth - 80), y: -80, width: isOctopus ? 50 : 80, height: isOctopus ? 50 : 80, speed: 2.5 + (score/500), type: isOctopus ? "octopus" : "normal" });
    lastSpawnTime = timestamp;
  }

  for (let i = items.length - 1; i >= 0; i--) {
    const it = items[i];
    it.y += it.speed * timeFactor;
    if (it.y + it.height > player.y && it.y < player.y + 50 && it.x + it.width > player.x && it.x < player.x + player.width) {
      if (it.type === "octopus") { score = Math.max(0, score - 50); inkEffectTimer = 180; }
      else score += 10;
      document.getElementById("score").innerText = "SCORE: " + score;
      items.splice(i, 1); continue;
    }
    if (it.y > window.innerHeight) {
      if (it.type === "normal") { showGameOver(); return; }
      items.splice(i, 1);
    }
  }

  items.forEach(it => ctx.drawImage((it.type === "octopus" ? octopusImg : sayuriImg), it.x, it.y, it.width, it.height));
  ctx.drawImage(hangyodonImg, player.x, player.y, player.width, player.height);

  if (inkEffectTimer > 0) {
    ctx.save(); ctx.globalAlpha = Math.min(0.8, inkEffectTimer / 30);
    ctx.drawImage(inkImg, (window.innerWidth - 650) / 2, (window.innerHeight - 450) / 2, 650, 450);
    ctx.restore(); inkEffectTimer -= 1 * timeFactor;
  }
  requestAnimationFrame(update);
}