const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// --- 고해상도 대응 설정 ---
let dpr = window.devicePixelRatio || 1;

function resizeCanvas() {
  dpr = window.devicePixelRatio || 1;
  canvas.style.width = window.innerWidth + "px";
  canvas.style.height = window.innerHeight + "px";
  canvas.width = Math.floor(window.innerWidth * dpr);
  canvas.height = Math.floor(window.innerHeight * dpr);
  ctx.scale(dpr, dpr);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
}
resizeCanvas();
window.addEventListener("resize", resizeCanvas);

// --- 게임 상태 변수 ---
let gameOver = false;
let gameWon = false; 
let gameStarted = false; 
let isModalOpen = false; 
let score = 0;
const GOAL_SCORE = 1000; 

// [수정] 하드 모드 전용 베스트 스코어 키 사용
let bestScore = localStorage.getItem("bestScore_Hard") || 0; 
const scoreEl = document.getElementById("score");

// 기기별 속도 차이 해결 변수
let lastTime = 0;
const targetFPS = 60;

let bgX = 0;
const particles = [];
const floatingTexts = [];
const platforms = [];
const platformWidth = 90; 
const platformGap = 240;  
const gravity = 0.8;      

const ball = { x: 100, y: 0, radius: 50, vy: 0, jumpPower: -14, jumpCount: 0, angle: 0 }; 

// 이미지 로드
const hangyodonImg = new Image(); hangyodonImg.src = "images/hangyodon.png";
const cloudImg = new Image(); cloudImg.src = "images/cloud.png";
const bgImg = new Image(); bgImg.src = "images/main.png";
const itemImg = new Image(); itemImg.src = "images/item.png";
const miniImg = new Image(); miniImg.src = "images/mini.png";   
const houseImg = new Image(); houseImg.src = "images/house.png"; 

// 모달 및 UI 제어
const modal = document.getElementById("modal-overlay");
const infoBtn = document.getElementById("info-btn");
const closeBtn = document.getElementById("close-btn");

infoBtn.addEventListener("click", (e) => {
  e.stopPropagation();
  isModalOpen = true;
  modal.classList.remove("hidden");
});

closeBtn.addEventListener("click", () => {
  isModalOpen = false;
  modal.classList.add("hidden");
});

function createPlatform(x, isFirst = false) {
  let y = isFirst ? window.innerHeight - 200 : window.innerHeight - 150 - Math.random() * 300; 
  const lastPlatform = platforms[platforms.length - 1];
  const wasLastTrap = lastPlatform ? lastPlatform.isTrap : false;
  
  const isTrap = !isFirst && !wasLastTrap && score >= 10 && Math.random() < 0.45;

  return {
    x: x, y: y, initialY: y,
    isTrap: isTrap,
    isBroken: false, 
    hasItem: !isFirst && !isTrap && Math.random() < 0.3, 
    itemCollected: false,
    itemOffsetX: (Math.random() - 0.5) * 70,
    itemOffsetY: -60 - Math.random() * 140,
    isMoving: !isFirst && score >= 20 && Math.random() < 0.5,
    moveOffset: Math.random() * Math.PI * 2
  };
}

function initGame() {
  platforms.length = 0;
  platforms.push(createPlatform(ball.x - 20, true)); 
  ball.y = platforms[0].y - 25;
  ball.vy = 0; ball.jumpCount = 0;
  for (let i = 1; i < 6; i++) platforms.push(createPlatform(i * platformGap + 100));
}

function createParticles(x, y, color = "white", count = 5) {
  for (let i = 0; i < count; i++) {
    particles.push({
      x: x, y: y,
      vx: (Math.random() - 0.5) * (count > 10 ? 12 : 6), 
      vy: (Math.random() - 1) * (count > 10 ? 12 : 4),
      life: 1.0,
      size: Math.random() * 5 + 2,
      color: color
    });
  }
}

function createFloatingText(x, y, text, color = "yellow") {
  floatingTexts.push({ x: x, y: y, vy: -2, life: 1.0, text: text, color: color });
}

function jump() {
  if (isModalOpen || gameOver || gameWon) return; 
  
  if (!gameStarted) { 
    gameStarted = true; 
    infoBtn.style.display = "none"; 
    lastTime = performance.now();
    requestAnimationFrame(update); 
    return; 
  }

  if (ball.jumpCount < 2) { 
    ball.vy = ball.jumpPower; 
    ball.jumpCount++; 
  }
}

function handleCanvasClick(e) {
  if (!gameWon && !gameOver) {
    jump();
    return;
  }

  const rect = canvas.getBoundingClientRect();
  const clickX = (e.clientX || (e.touches && e.touches[0].clientX)) - rect.left;
  const clickY = (e.clientY || (e.touches && e.touches[0].clientY)) - rect.top;

  const cx = window.innerWidth / 2;
  const cy = window.innerHeight / 2;

  if (clickX > cx - 100 && clickX < cx + 100 && clickY > cy + 110 && clickY < cy + 170) {
    restartGame();
  }
}

canvas.addEventListener("touchstart", (e) => { 
  e.preventDefault(); 
  handleCanvasClick(e);
}, {passive: false});

canvas.addEventListener("click", (e) => {
  handleCanvasClick(e);
});

function drawProgressBar() {
  const barWidth = window.innerWidth * 0.7;
  const barHeight = 12;
  const barX = (window.innerWidth - barWidth) / 2;
  const barY = window.innerHeight - 50;
  
  ctx.fillStyle = "rgba(255, 255, 255, 0.2)";
  ctx.beginPath(); ctx.roundRect(barX, barY, barWidth, barHeight, 6); ctx.fill();

  const progressTotal = Math.min(score / GOAL_SCORE, 1);
  const currentProgressWidth = barWidth * progressTotal;

  const segments = [
    { start: 0, end: 300, color: "#81D4FA" },
    { start: 300, end: 600, color: "#f59d82" },
    { start: 600, end: 1000, color: "#7c90ff" }
  ];

  segments.forEach((seg) => {
    if (score > seg.start) {
      const segStartPos = (seg.start / GOAL_SCORE) * barWidth;
      const segEndScore = Math.min(score, seg.end);
      const segWidth = ((segEndScore - seg.start) / GOAL_SCORE) * barWidth;
      ctx.fillStyle = seg.color;
      ctx.fillRect(barX + segStartPos, barY, segWidth, barHeight);
    }
  });

  ctx.drawImage(houseImg, barX + barWidth + 5, barY - 25, 40, 40);
  const iconX = barX + currentProgressWidth - 17.5;
  ctx.drawImage(miniImg, iconX, barY - 40, 35, 35); 
}

function drawBall() {
  ctx.save();
  ctx.translate(ball.x, ball.y);
  ball.angle = ball.vy * 0.02; 
  ctx.rotate(ball.angle); 
  ctx.drawImage(hangyodonImg, -50, -25, 100, 50);
  ctx.restore();
}

function drawPlatforms() {
  platforms.forEach(p => {
    if (p.isBroken) return;
    
    ctx.save();
    if (p.isTrap) {
      ctx.filter = "brightness(40%) sepia(100%) hue-rotate(190deg) saturate(200%)";
      ctx.drawImage(cloudImg, p.x - 20, p.y - 10, platformWidth + 40, 60);
    } else {
      ctx.drawImage(cloudImg, p.x - 20, p.y - 10, platformWidth + 40, 60);
    }
    ctx.restore();

    if (p.hasItem && !p.itemCollected) {
      ctx.drawImage(itemImg, p.x + (platformWidth/2) + p.itemOffsetX - 20, p.y + p.itemOffsetY, 40, 40);
    }
  });
}

function drawBackground(timeFactor) {
  let bgSpeed = (0.5 + (score * 0.003)) * timeFactor; 
  if (gameStarted && !gameOver && !gameWon && !isModalOpen) bgX -= bgSpeed;
  if (bgX <= -window.innerWidth) bgX = 0;
  
  ctx.drawImage(bgImg, bgX, 0, window.innerWidth, window.innerHeight);
  ctx.save();
  ctx.translate(bgX + window.innerWidth * 2, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(bgImg, 0, 0, window.innerWidth, window.innerHeight);
  ctx.restore();

  if (score >= 300 && score < 600) {
    ctx.fillStyle = "rgba(255, 100, 0, 0.15)"; ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);
  } else if (score >= 600) {
    ctx.fillStyle = "rgba(0, 0, 50, 0.35)"; ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);
  }
}

function drawParticles(timeFactor) {
  particles.forEach((p, index) => {
    p.x += p.vx * timeFactor; p.y += p.vy * timeFactor; p.life -= 0.02 * timeFactor;
    if (p.life <= 0) particles.splice(index, 1);
    else {
      ctx.fillStyle = p.color === "black" ? `rgba(50, 50, 50, ${p.life})` : 
                      p.color === "gold" ? `rgba(255, 215, 0, ${p.life})` : `rgba(255, 255, 255, ${p.life})`;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill();
    }
  });
}

function drawFloatingTexts(timeFactor) {
  floatingTexts.forEach((ft, index) => {
    ft.y += ft.vy * timeFactor; ft.life -= 0.02 * timeFactor;
    if (ft.life <= 0) floatingTexts.splice(index, 1);
    else {
      ctx.font = `bold ${ft.text.includes('50') ? '30px' : '20px'} 'Gowun Dodum'`;
      ctx.fillStyle = ft.color === "gold" ? `rgba(255, 215, 0, ${ft.life})` : `rgba(255, 255, 0, ${ft.life})`;
      ctx.textAlign = "center";
      ctx.fillText(ft.text, ft.x, ft.y);
    }
  });
}

function restartGame() {
  gameOver = false; gameWon = false; gameStarted = true;
  infoBtn.style.display = "none"; 
  score = 0; scoreEl.innerText = "SCORE: 0";
  particles.length = 0; floatingTexts.length = 0;
  initGame();
  lastTime = performance.now();
  requestAnimationFrame(update);
}

function drawStartScreen() {
  infoBtn.style.display = "flex"; 
  drawBackground(1); drawPlatforms(); drawBall();
  ctx.fillStyle = "rgba(0, 0, 0, 0.4)"; ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);
  ctx.fillStyle = "#FFFFFF"; ctx.font = "bold 35px 'Gowun Dodum'"; ctx.textAlign = "center";
  ctx.fillText("교동이 데려다주기!", window.innerWidth / 2, window.innerHeight / 2 - 20);
  ctx.font = "20px 'Gowun Dodum'";
  ctx.fillText("최고 기록 : " + bestScore, window.innerWidth / 2, window.innerHeight / 2 + 30);
  ctx.fillText("화면을 클릭해서 시작하세요", window.innerWidth / 2, window.innerHeight / 2 + 70);
}

function drawWinScreen() {
  if (!gameWon) return;
  ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
  ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);
  if (Math.random() < 0.1) {
    createParticles(Math.random() * window.innerWidth, Math.random() * window.innerHeight, "gold", 15);
  }
  drawParticles(1);
  const cx = window.innerWidth / 2;
  const cy = window.innerHeight / 2;
  ctx.fillStyle = "white";
  ctx.beginPath();
  ctx.roundRect(cx - 150, cy - 180, 300, 350, 20); ctx.fill();
  ctx.drawImage(houseImg, cx - 40, cy - 150, 80, 80);
  ctx.drawImage(hangyodonImg, cx - 40, cy - 70, 80, 40);
  ctx.fillStyle = "#333";
  ctx.font = "bold 25px 'Gowun Dodum'"; ctx.fillText("미션 성공!", cx, cy + 30);
  ctx.font = "18px 'Gowun Dodum'"; ctx.fillText("교동이가 집에 도착했어요!", cx, cy + 65);
  ctx.fillStyle = "#03A9F4";
  ctx.font = "bold 22px 'Gowun Dodum'"; ctx.fillText("SCORE: " + score, cx, cy + 100);
  ctx.fillStyle = "#1bb8f7";
  ctx.beginPath();
  ctx.roundRect(cx - 75, cy + 125, 150, 40, 10); ctx.fill();
  ctx.fillStyle = "white";
  ctx.font = "bold 18px 'Gowun Dodum'";
  ctx.fillText("다시 하기", cx, cy + 152);
  requestAnimationFrame(drawWinScreen);
}

function drawGameOverScreen() {
  ctx.fillStyle = "rgba(0, 0, 0, 0.6)"; ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);
  const cx = window.innerWidth / 2;
  const cy = window.innerHeight / 2;
  ctx.fillStyle = "white";
  ctx.beginPath();
  ctx.roundRect(cx - 150, cy - 180, 300, 350, 20); ctx.fill();
  ctx.fillStyle = "#FF5252";
  ctx.font = "bold 35px 'Gowun Dodum'"; ctx.fillText("GAME OVER", cx, cy - 50);
  ctx.fillStyle = "#333";
  ctx.font = "bold 25px 'Gowun Dodum'"; ctx.fillText("최종 점수: " + score, cx, cy + 20);
  
  // [수정] 하드 모드 기록 출력
  ctx.fillStyle = "#FFC107"; ctx.fillText("최고 기록 : " + bestScore, cx, cy + 60);
  
  ctx.fillStyle = "#1bb8f7";
  ctx.beginPath();
  ctx.roundRect(cx - 75, cy + 125, 150, 40, 10); ctx.fill();
  ctx.fillStyle = "white";
  ctx.font = "bold 18px 'Gowun Dodum'";
  ctx.fillText("재시작", cx, cy + 152);
}

function update(timestamp) {
  if (!gameStarted || isModalOpen || gameOver || gameWon) return; 

  const deltaTime = timestamp - lastTime;
  lastTime = timestamp;
  const timeFactor = deltaTime / (1000 / targetFPS);

  if (score >= GOAL_SCORE) {
    score = GOAL_SCORE;
    if (score > bestScore) { 
      bestScore = score; 
      // [수정] 하드 모드 전용 저장
      localStorage.setItem("bestScore_Hard", bestScore); 
    }
    gameWon = true;
    infoBtn.style.display = "flex";
    requestAnimationFrame(drawWinScreen);
    return;
  }

  drawBackground(timeFactor);
  ball.vy += gravity * timeFactor;
  ball.y += ball.vy * timeFactor;

  if (ball.y < 25) { ball.y = 25; ball.vy = 0; }

  let gameSpeed = (4 + (score * 0.006)) * timeFactor; 
  
  platforms.forEach(p => {
    p.x -= gameSpeed;
    if (p.isMoving) {
      p.moveOffset += 0.05 * timeFactor; 
      p.y = p.initialY + Math.sin(p.moveOffset) * 60; 
    }
  });

  if (platforms[0].x + platformWidth < 0) {
    platforms.shift();
    platforms.push(createPlatform(platforms[platforms.length - 1].x + platformGap));
    score++; 
    scoreEl.innerText = "SCORE: " + score;
  }

  platforms.forEach(p => {
    if (p.isBroken) return;
    const footPos = ball.y + 25; 
    if (ball.x + 15 > p.x && ball.x - 15 < p.x + platformWidth && footPos > p.y && footPos < p.y + 35 && ball.vy >= 0) {
      if (p.isTrap) {
        createParticles(ball.x, footPos, "black", 15);
        ball.y = p.y - 25; ball.vy = -10; ball.jumpCount = 0; 
        p.isBroken = true; 
      } else {
        ball.y = p.y - 25; ball.vy = -12; ball.jumpCount = 0; 
        createParticles(ball.x, footPos, "white");
      }
    }
    
    if (p.hasItem && !p.itemCollected && !p.isBroken) {
      const itemX = p.x + (platformWidth/2) + p.itemOffsetX;
      const itemY = p.y + p.itemOffsetY + 20;
      const distance = Math.sqrt(Math.pow(ball.x - itemX, 2) + Math.pow(ball.y - itemY, 2));
      if (distance < 45) { 
        p.itemCollected = true;
        const randomBonus = (Math.floor(Math.random() * 5) + 1) * 10; 
        score += randomBonus;
        scoreEl.innerText = "SCORE: " + score;
        if (randomBonus === 50) {
          createParticles(itemX, itemY, "gold", 20); 
          createFloatingText(itemX, itemY, "LUCKY! +50", "gold");
        } else {
          createParticles(itemX, itemY, "white", 5);
          createFloatingText(itemX, itemY, "+" + randomBonus);
        }
      }
    }
  });

  if (ball.y - 25 > window.innerHeight) gameOver = true;

  drawPlatforms(); 
  drawParticles(timeFactor); 
  drawFloatingTexts(timeFactor); 
  drawBall();
  drawProgressBar(); 

  if (gameOver) {
    infoBtn.style.display = "flex"; 
    if (score > bestScore) { 
      bestScore = score; 
      // [수정] 하드 모드 전용 저장
      localStorage.setItem("bestScore_Hard", bestScore); 
    }
    drawGameOverScreen();
    return;
  }
  requestAnimationFrame(update);
}

let imagesLoaded = 0; const totalImages = 6;
[hangyodonImg, cloudImg, bgImg, itemImg, miniImg, houseImg].forEach(img => {
  img.onload = () => { if (++imagesLoaded === totalImages) { initGame(); drawStartScreen(); } };
});