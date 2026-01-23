const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
let dpr = window.devicePixelRatio || 1;

const BOARD_SIZE = 15;
let board = Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(0));
let cellSize = 0;
let boardRect = { x: 0, y: 0, size: 0 };

let p1Char = null, p2Char = null;
let currentPlayer = 1;
let gameState = "START";
let timeLeft = 30;
let timerInterval = null;

// 벌칙 리스트
const penalties = [
    "커피 쏘기",
    "딱밤 맞기",
    "당장 심부름 하기",
    "간식 쏘기",
    "노래 한 곡 부르기",
    "소원 들어주기 3회권",
    "물 떠다주기",
    "소원 들어주기 1회권",
    "심부름 1회권",
    "심부름 3회권"
];

const charImages = {};
[1, 2, 3, 4].forEach(id => {
    const img = new Image();
    img.src = `images/char${id}.png`;
    charImages[id] = img;
});

function resizeCanvas() {
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;
    canvas.style.width = window.innerWidth + "px";
    canvas.style.height = window.innerHeight + "px";
    ctx.scale(dpr, dpr);
    const minDim = Math.min(window.innerWidth, window.innerHeight);
    boardRect.size = minDim * 0.88;
    boardRect.x = (window.innerWidth - boardRect.size) / 2;
    boardRect.y = (window.innerHeight - boardRect.size) / 2 + 30;
    cellSize = boardRect.size / (BOARD_SIZE - 1);
    draw();
}

function drawBoard() {
    ctx.save();
    ctx.fillStyle = "rgba(255, 230, 180, 0.8)";
    if (ctx.roundRect) {
        ctx.beginPath();
        ctx.roundRect(boardRect.x - 10, boardRect.y - 10, boardRect.size + 20, boardRect.size + 20, 10);
        ctx.fill();
    } else {
        ctx.fillRect(boardRect.x - 10, boardRect.y - 10, boardRect.size + 20, boardRect.size + 20);
    }
    ctx.beginPath();
    ctx.strokeStyle = "#5d4037";
    ctx.lineWidth = 1;
    for (let i = 0; i < BOARD_SIZE; i++) {
        ctx.moveTo(boardRect.x, boardRect.y + i * cellSize);
        ctx.lineTo(boardRect.x + boardRect.size, boardRect.y + i * cellSize);
        ctx.moveTo(boardRect.x + i * cellSize, boardRect.y);
        ctx.lineTo(boardRect.x + i * cellSize, boardRect.y + boardRect.size);
    }
    ctx.stroke();
    ctx.restore();
}

function drawStones() {
    for (let r = 0; r < BOARD_SIZE; r++) {
        for (let c = 0; c < BOARD_SIZE; c++) {
            if (board[r][c] !== 0) {
                const charId = board[r][c] === 1 ? p1Char : p2Char;
                const img = charImages[charId];
                if (img && img.complete) {
                    let scaleAdjust = (charId === "4") ? 1.3 : 1.1;
                    const stoneSize = cellSize * 0.9 * scaleAdjust;
                    ctx.drawImage(img, boardRect.x + c * cellSize - stoneSize / 2, boardRect.y + r * cellSize - stoneSize / 2, stoneSize, stoneSize);
                }
            }
        }
    }
}

function draw() {
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    if (gameState !== "START") {
        drawBoard();
        drawStones();
    }
}

function switchTurn() {
    currentPlayer = currentPlayer === 1 ? 2 : 1;
    const scoreEl = document.getElementById("score");
    scoreEl.innerText = `PLAYER ${currentPlayer} 차례`;
    scoreEl.className = currentPlayer === 1 ? "p1-turn" : "p2-turn";
    document.getElementById("profile-p1").classList.toggle("active", currentPlayer === 1);
    document.getElementById("profile-p2").classList.toggle("active", currentPlayer === 2);
    resetTimer();
}

function resetTimer() {
    clearInterval(timerInterval);
    timeLeft = 30;
    timerInterval = setInterval(() => {
        timeLeft -= 0.1;
        document.getElementById("timer-bar").style.width = `${(timeLeft / 30) * 100}%`;
        if (timeLeft <= 0) {
            clearInterval(timerInterval);
            placeRandomStone();
        }
    }, 100);
}

function placeRandomStone() {
    if (gameState !== "PLAYING") return;
    let emptyCells = [];
    for (let r = 0; r < BOARD_SIZE; r++) {
        for (let c = 0; c < BOARD_SIZE; c++) {
            if (board[r][c] === 0) emptyCells.push({ r, c });
        }
    }
    if (emptyCells.length > 0) {
        const { r, c } = emptyCells[Math.floor(Math.random() * emptyCells.length)];
        board[r][c] = currentPlayer;
        if (checkWin(r, c)) showGameOver(currentPlayer);
        else switchTurn();
        draw();
    }
}

function handleInput(e) {
    if (gameState === "START") { 
        startCharacterSelection(); 
        return; 
    }
    if (gameState !== "PLAYING") return;
    const rect = canvas.getBoundingClientRect();
    const clientX = e.clientX || (e.touches && e.touches[0].clientX);
    const clientY = e.clientY || (e.touches && e.touches[0].clientY);
    const c = Math.round((clientX - rect.left - boardRect.x) / cellSize);
    const r = Math.round((clientY - rect.top - boardRect.y) / cellSize);
    if (r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE && board[r][c] === 0) {
        board[r][c] = currentPlayer;
        if (checkWin(r, c)) showGameOver(currentPlayer);
        else switchTurn();
        draw();
    }
}

function checkWin(r, c) {
    const p = board[r][c];
    const dirs = [[0,1],[1,0],[1,1],[1,-1]];
    for (let [dr, dc] of dirs) {
        let count = 1;
        for (let s of [1, -1]) {
            let nr = r + dr*s, nc = c + dc*s;
            while(nr>=0 && nr<BOARD_SIZE && nc>=0 && nc<BOARD_SIZE && board[nr][nc] === p) {
                count++; nr += dr*s; nc += dc*s;
            }
        }
        if (count >= 5) return true;
    }
    return false;
}

function startCharacterSelection() {
    gameState = "SELECTING_P1";
    document.getElementById("start-overlay").classList.add("hidden");
    document.getElementById("char-select-overlay").classList.remove("hidden");
}

document.getElementById("start-overlay").onclick = startCharacterSelection;

document.querySelectorAll(".char-option").forEach(el => {
    el.onclick = (e) => {
        e.stopPropagation();
        const id = el.getAttribute("data-id");
        if (gameState === "SELECTING_P1") {
            p1Char = id;
            document.getElementById("p1-display-img").src = `images/char${id}.png`;
            el.parentElement.classList.add("selected-item");
            gameState = "SELECTING_P2";
            document.getElementById("select-subtitle").innerText = "플레이어 2의 캐릭터를 골라주세요.";
        } else if (gameState === "SELECTING_P2") {
            p2Char = id;
            document.getElementById("p2-display-img").src = `images/char${id}.png`;
            document.getElementById("char-select-overlay").classList.add("hidden");
            document.getElementById("status-bar").classList.remove("hidden");
            document.getElementById("player-profiles").classList.remove("hidden");
            document.getElementById("bottom-timer-container").classList.remove("hidden");
            document.getElementById("profile-p1").classList.add("active");
            gameState = "PLAYING";
            resetTimer();
            draw();
        }
    };
});

// 벌칙 룰렛 시작 함수
function startPenaltyRoulette() {
    const penaltyText = document.getElementById("penalty-text");
    let count = 0;
    const maxCycles = 20; // 룰렛 도는 횟수
    
    const interval = setInterval(() => {
        penaltyText.innerText = penalties[Math.floor(Math.random() * penalties.length)];
        count++;
        
        if (count >= maxCycles) {
            clearInterval(interval);
            // 최종 당첨 강조 효과
            penaltyText.style.color = "#ff3e3e";
            penaltyText.style.fontSize = "20px";
        }
    }, 100);
}

function showGameOver(winner) {
    gameState = "GAMEOVER";
    clearInterval(timerInterval);
    document.getElementById("winner-img").src = `images/char${winner === 1 ? p1Char : p2Char}.png`;
    document.getElementById("winner-text").innerText = `PLAYER ${winner} WIN!`;
    document.getElementById("gameover-overlay").classList.remove("hidden");
    
    // 벌칙 룰렛 텍스트 초기화 및 시작
    const pt = document.getElementById("penalty-text");
    pt.style.color = "#333";
    pt.style.fontSize = "18px";
    startPenaltyRoulette();
}

document.getElementById("restart-btn").onclick = () => location.reload();
window.addEventListener("resize", resizeCanvas);
canvas.addEventListener("mousedown", handleInput);
canvas.addEventListener("touchstart", (e) => { if (gameState === "PLAYING") e.preventDefault(); handleInput(e); }, {passive: false});
resizeCanvas();