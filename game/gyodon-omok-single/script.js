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
let winningStones = []; // 승리한 돌들의 좌표 저장용

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
    const isMobile = window.innerWidth <= 768;
    boardRect.size = isMobile ? minDim * 0.9 : minDim * 0.8; 
    
    boardRect.x = (window.innerWidth - boardRect.size) / 2;
    boardRect.y = (window.innerHeight - boardRect.size) / 2 + (isMobile ? 40 : 20);
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

    if (winningStones.length > 0) {
        ctx.save();
        ctx.strokeStyle = "red";
        ctx.lineWidth = 4;
        winningStones.forEach(pos => {
            ctx.beginPath();
            ctx.arc(boardRect.x + pos.c * cellSize, boardRect.y + pos.r * cellSize, cellSize * 0.45, 0, Math.PI * 2);
            ctx.stroke();
        });
        ctx.restore();
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
    scoreEl.innerText = currentPlayer === 1 ? "PLAYER 1 차례" : "COMPUTER 차례";
    scoreEl.className = currentPlayer === 1 ? "p1-turn" : "p2-turn";
    document.getElementById("profile-p1").classList.toggle("active", currentPlayer === 1);
    document.getElementById("profile-p2").classList.toggle("active", currentPlayer === 2);
    
    resetTimer();

    if (currentPlayer === 2 && gameState === "PLAYING") {
        setTimeout(makeComputerMove, 1500); // 0.6초에서 1.5초로 변경
    }
}

function makeComputerMove() {
    if (gameState !== "PLAYING" || currentPlayer !== 2) return;
    
    let targetR, targetC;
    let bestScore = -1;
    let bestMoves = [];

    for (let r = 0; r < BOARD_SIZE; r++) {
        for (let c = 0; c < BOARD_SIZE; c++) {
            if (board[r][c] === 0) {
                let attackScore = evaluateMove(r, c, 2);
                let defenseScore = evaluateMove(r, c, 1);
                let totalScore = Math.max(attackScore, defenseScore * 0.95);

                if (totalScore > bestScore) {
                    bestScore = totalScore;
                    bestMoves = [{ r, c }];
                } else if (totalScore === bestScore) {
                    bestMoves.push({ r, c });
                }
            }
        }
    }
    
    const bestMove = bestMoves[Math.floor(Math.random() * bestMoves.length)];
    targetR = bestMove.r;
    targetC = bestMove.c;
    
    if (targetR !== undefined) {
        board[targetR][targetC] = 2;
        if (checkWin(targetR, targetC)) {
            draw();
            setTimeout(() => showGameOver(2), 800);
        } else {
            switchTurn();
            draw();
        }
    }
}

function evaluateMove(r, c, player) {
    const dirs = [[0,1],[1,0],[1,1],[1,-1]];
    let totalValue = 0;
    let openThreeCount = 0;

    for (let [dr, dc] of dirs) {
        let count = 1;
        let blocked = 0;

        for (let s of [1, -1]) {
            let nr = r + dr * s, nc = c + dc * s;
            while (nr >= 0 && nr < BOARD_SIZE && nc >= 0 && nc < BOARD_SIZE && board[nr][nc] === player) {
                count++;
                nr += dr * s;
                nc += dc * s;
            }
            if (nr < 0 || nr >= BOARD_SIZE || nc < 0 || nc >= BOARD_SIZE || (board[nr][nc] !== 0 && board[nr][nc] !== player)) {
                blocked++;
            }
        }

        if (count >= 5) totalValue += 100000;
        else if (count === 4) {
            if (blocked === 0) totalValue += 10000;
            else if (blocked === 1) totalValue += 5000;
        }
        else if (count === 3) {
            if (blocked === 0) {
                totalValue += 1000;
                openThreeCount++;
            }
            else if (blocked === 1) totalValue += 500;
        }
        else if (count === 2) {
            if (blocked === 0) totalValue += 100;
        }
    }

    if (openThreeCount >= 2) {
        return 0; 
    }

    return totalValue;
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
    if (currentPlayer === 2) {
        makeComputerMove();
    } else {
        let emptyCells = [];
        for (let r = 0; r < BOARD_SIZE; r++) {
            for (let c = 0; c < BOARD_SIZE; c++) {
                if (board[r][c] === 0) emptyCells.push({ r, c });
            }
        }
        if (emptyCells.length > 0) {
            const { r, c } = emptyCells[Math.floor(Math.random() * emptyCells.length)];
            board[r][c] = currentPlayer;
            if (checkWin(r, c)) {
                draw();
                setTimeout(() => showGameOver(currentPlayer), 800);
            } else {
                switchTurn();
                draw();
            }
        }
    }
}

function handleInput(e) {
    if (gameState === "START") { 
        startCharacterSelection(); 
        return; 
    }
    if (gameState !== "PLAYING" || currentPlayer === 2) return; 
    
    const rect = canvas.getBoundingClientRect();
    const clientX = (e.clientX || (e.touches && e.touches[0].clientX));
    const clientY = (e.clientY || (e.touches && e.touches[0].clientY));
    const c = Math.round((clientX - rect.left - boardRect.x) / cellSize);
    const r = Math.round((clientY - rect.top - boardRect.y) / cellSize);
    
    if (r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE && board[r][c] === 0) {
        board[r][c] = 1; 
        if (checkWin(r, c)) {
            draw();
            setTimeout(() => showGameOver(1), 800);
        } else {
            switchTurn();
            draw();
        }
    }
}

function checkWin(r, c) {
    const p = board[r][c];
    const dirs = [[0,1],[1,0],[1,1],[1,-1]];
    for (let [dr, dc] of dirs) {
        let line = [{ r, c }]; 
        for (let s of [1, -1]) {
            let nr = r + dr*s, nc = c + dc*s;
            while(nr>=0 && nr<BOARD_SIZE && nc>=0 && nc<BOARD_SIZE && board[nr][nc] === p) {
                line.push({ r: nr, c: nc });
                nr += dr*s; nc += dc*s;
            }
        }
        if (line.length >= 5) {
            winningStones = line; 
            return true;
        }
    }
    return false;
}

function startCharacterSelection() {
    gameState = "SELECTING_P1";
    document.getElementById("start-overlay").classList.add("hidden");
    document.getElementById("char-select-overlay").classList.remove("hidden");

    const allChars = ["1", "2", "3", "4"];
    p2Char = allChars[Math.floor(Math.random() * allChars.length)];
    
    document.querySelectorAll(".char-item").forEach(item => {
        const charId = item.querySelector(".char-option").getAttribute("data-id");
        if (charId === p2Char) {
            item.style.opacity = "0.3";
            item.style.pointerEvents = "none";
            item.style.filter = "grayscale(1)";
        } else {
            item.style.opacity = "1";
            item.style.pointerEvents = "auto";
            item.style.filter = "none";
        }
    });
}

document.getElementById("start-overlay").onclick = startCharacterSelection;

document.querySelectorAll(".char-option").forEach(el => {
    el.onclick = (e) => {
        e.stopPropagation();
        const id = el.getAttribute("data-id");
        if (id === p2Char) return;

        if (gameState === "SELECTING_P1") {
            p1Char = id;
            document.getElementById("p1-display-img").src = `images/char${id}.png`;
            document.getElementById("p2-display-img").src = `images/char${p2Char}.png`;
            
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

function showGameOver(winner) {
    gameState = "GAMEOVER";
    clearInterval(timerInterval);
    document.getElementById("winner-img").src = `images/char${winner === 1 ? p1Char : p2Char}.png`;
    document.getElementById("winner-text").innerText = winner === 1 ? "YOU WIN!" : "COMPUTER WIN!";
    document.getElementById("gameover-overlay").classList.remove("hidden");
}

document.getElementById("restart-btn").onclick = () => location.reload();
window.addEventListener("resize", resizeCanvas);
canvas.addEventListener("mousedown", handleInput);
canvas.addEventListener("touchstart", (e) => { 
    if (gameState === "PLAYING" && currentPlayer === 1) e.preventDefault(); 
    handleInput(e); 
}, {passive: false});
resizeCanvas();