const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxMPgn8qKd8QJfMYxy-U1vhaYGggowioJ3RPpLENzel_Py6RWX9aZabTA5xJdSDZKoS/exec"; 

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
let dpr = window.devicePixelRatio || 1;

function resizeCanvas() {
  canvas.width = window.innerWidth * dpr;
  canvas.height = window.innerHeight * dpr;
  canvas.style.width = window.innerWidth + "px";
  canvas.style.height = window.innerHeight + "px";
  ctx.scale(dpr, dpr);
  
  if (player) {
    player.y = window.innerHeight - 150;
    player.x = Math.max(0, Math.min(window.innerWidth - player.width, player.x));
  }
}

let score = 0;
let lives = 3; 
let gameOver = false;
let gameStarted = false;
let isModalOpen = false; 
let userNickname = localStorage.getItem("sayuri_nickname");
let hasSeenGuide = sessionStorage.getItem("sayuri_guide_seen");

let items = [];
let scorePopups = []; 
const targetFPS = 60;
let lastTime = performance.now();
let lastSpawnTime = 0;
let inkEffectTimer = 0; 

const keys = { Left: false, Right: false };

const player = {
  x: window.innerWidth / 2 - 65, y: window.innerHeight - 150,
  width: 130, height: 110, speed: 15, targetX: window.innerWidth / 2 - 65, isDragging: false,
  keySpeed: 8 
};

resizeCanvas();
window.addEventListener('resize', resizeCanvas);

let imagesLoaded = 0;
const totalImages = 5; 
function imageLoaded() {
  imagesLoaded++;
  if (imagesLoaded === totalImages) {
    drawInitial();
  }
}

const hangyodonImg = new Image(); hangyodonImg.src = "images/hangyodon.png";
const sayuriImg = new Image(); sayuriImg.src = "images/sayuri.png";
const octopusImg = new Image(); octopusImg.src = "images/octopus.png";
const inkImg = new Image(); inkImg.src = "images/ink.png";
const lifeImg = new Image(); lifeImg.src = "images/hangyodon-logo.png"; 

[hangyodonImg, sayuriImg, octopusImg, inkImg, lifeImg].forEach(img => {
  img.onload = imageLoaded;
});

const nickOverlay = document.getElementById("nickname-overlay");
const infoModal = document.getElementById("modal-overlay");
const startOverlay = document.getElementById("start-overlay");
const gameOverModal = document.getElementById("gameover-overlay");

function drawInitial() {
  ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
  ctx.drawImage(hangyodonImg, player.x, player.y, player.width, player.height);
}

window.addEventListener("load", () => {
  if (!userNickname) {
    isModalOpen = true;
    nickOverlay.classList.remove("hidden");
  } else if (!hasSeenGuide) {
    isModalOpen = true;
    infoModal.classList.remove("hidden");
  } else {
    startOverlay.classList.remove("hidden");
  }
});

document.getElementById("save-nickname-btn").onclick = () => {
  const input = document.getElementById("nickname-input").value.trim();
  if (input) {
    localStorage.setItem("sayuri_nickname", input);
    userNickname = input;
    nickOverlay.classList.add("hidden");
    if (!hasSeenGuide) {
      infoModal.classList.remove("hidden");
    } else {
      isModalOpen = false;
      startOverlay.classList.remove("hidden");
    }
  }
};

document.getElementById("close-btn").onclick = (e) => {
  e.stopPropagation();
  infoModal.classList.add("hidden");
  isModalOpen = false;
  sessionStorage.setItem("sayuri_guide_seen", "true");
  hasSeenGuide = "true";
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

window.addEventListener("keydown", (e) => {
  if (e.key === "ArrowLeft") keys.Left = true;
  if (e.key === "ArrowRight") keys.Right = true;
  if (!gameStarted && (e.key === "ArrowLeft" || e.key === "ArrowRight")) {
    if (!isModalOpen && !startOverlay.classList.contains("hidden")) startGame();
  }
});
window.addEventListener("keyup", (e) => {
  if (e.key === "ArrowLeft") keys.Left = false;
  if (e.key === "ArrowRight") keys.Right = false;
});

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

async function updateRanking() {
  const list = document.getElementById("ranking-list");
  list.style.textAlign = "left";
  list.style.paddingLeft = "20px"; 

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

function drawUI() {
  ctx.save();
  const lifeSize = 35;
  for (let i = 0; i < lives; i++) {
    ctx.drawImage(lifeImg, 20 + (i * (lifeSize + 5)), 80, lifeSize, lifeSize);
  }
  ctx.fillStyle = "#FFD700";
  ctx.font = "bold 24px 'Gowun Dodum'";
  ctx.shadowBlur = 4;
  ctx.shadowColor = "rgba(0,0,0,0.5)";
  for (let i = scorePopups.length - 1; i >= 0; i--) {
    const popup = scorePopups[i];
    ctx.globalAlpha = popup.life / 60;
    ctx.fillText("+10", popup.x, popup.y);
    popup.y -= 1; 
    popup.life -= 1;
    if (popup.life <= 0) scorePopups.splice(i, 1);
  }
  ctx.restore();
}

function update(timestamp) {
  if (gameOver || !gameStarted || isModalOpen) return;
  const deltaTime = timestamp - lastTime;
  lastTime = timestamp;
  const timeFactor = deltaTime / 16.67;
  
  ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

  if (player.isDragging) {
    player.x += (player.targetX - player.x) * 0.25 * timeFactor;
  } else {
    if (keys.Left) player.x -= player.keySpeed * timeFactor;
    if (keys.Right) player.x += player.keySpeed * timeFactor;
  }
  
  player.x = Math.max(0, Math.min(window.innerWidth - player.width, player.x));

  if (timestamp - lastSpawnTime > Math.max(300, 500 - (score/10))) {
    const isOctopus = Math.random() < 0.08; 
    const itemWidth = isOctopus ? 50 : 80;
    let newX;
    let attempts = 0;
    let isTooClose;

    do {
      newX = Math.random() * (window.innerWidth - itemWidth);
      isTooClose = items.some(it => it.y < 200 && Math.abs(it.x - newX) < 100);
      attempts++;
    } while (isTooClose && attempts < 10);

    items.push({ 
      x: newX, 
      y: -80, 
      width: itemWidth, 
      height: isOctopus ? 50 : 80, 
      speed: 2.5 + (score/500), 
      type: isOctopus ? "octopus" : "normal" 
    });
    lastSpawnTime = timestamp;
  }

  for (let i = items.length - 1; i >= 0; i--) {
    const it = items[i];
    it.y += it.speed * timeFactor;
    
    // 판정 범위 수정: 좌우 여백을 넓혀 좁게 만들고, 높이 판정도 더 정밀하게 조정
    const collisionPadding = 45; // 좌우 판정 축소 (값이 클수록 좁아짐)
    const hitAreaHeight = 25;    // 상하 판정 높이 축소

    if (
      it.y + it.height > player.y + 10 && // 캐릭터 머리 살짝 아래부터 판정 시작
      it.y + it.height < player.y + 10 + hitAreaHeight &&
      it.x + it.width > player.x + collisionPadding && 
      it.x < player.x + player.width - collisionPadding
    ) {
      if (it.type === "octopus") { 
        inkEffectTimer = 240; 
      } else { 
        score += 10;
        scorePopups.push({
          x: player.x + player.width - 20,
          y: player.y + 20,
          life: 60
        });
      }
      document.getElementById("score").innerText = "SCORE: " + score;
      items.splice(i, 1); 
      continue;
    }
    
    if (it.y > window.innerHeight) {
      if (it.type === "normal") { 
        lives--; 
        if (lives <= 0) {
          showGameOver(); 
          return;
        }
      }
      items.splice(i, 1);
    }
  }

  items.forEach(it => {
    const img = it.type === "octopus" ? octopusImg : sayuriImg;
    ctx.drawImage(img, it.x, it.y, it.width, it.height);
  });
  
  ctx.drawImage(hangyodonImg, player.x, player.y, player.width, player.height);
  
  drawUI();

  if (inkEffectTimer > 0) {
    ctx.save(); 
    ctx.globalAlpha = Math.min(0.95, inkEffectTimer / 40);
    const side = window.innerWidth * 0.6;
    const drawX = (window.innerWidth - side) / 2;
    const drawY = (window.innerHeight - side) / 2;
    ctx.drawImage(inkImg, drawX, drawY, side, side);
    ctx.restore(); 
    inkEffectTimer -= 1 * timeFactor;
  }
  
  requestAnimationFrame(update);
}