document.addEventListener('DOMContentLoaded', () => {
    const gameBoard = document.getElementById('game-board');
    const levelDisplay = document.getElementById('level-display');
    const timerBar = document.getElementById('timer-bar');
    
    const nickOverlay = document.getElementById("nickname-overlay");
    const infoModal = document.getElementById("modal-overlay");
    const startOverlay = document.getElementById("start-overlay");
    const clearOverlay = document.getElementById("clear-overlay");
    const gameOverModal = document.getElementById("gameover-overlay");
    const countdownOverlay = document.getElementById("countdown-overlay");
    const countdownText = document.getElementById("countdown-text");

    let currentLevel = 1;
    let totalTime = 0;
    let timeLeft = 0;
    let timerInterval;
    let flippedCards = [];
    let matchedPairs = 0;
    let canFlip = false; 
    let isGameRunning = false; // [추가] 게임이 실제 진행 중인지 확인하는 변수
    let userNickname = localStorage.getItem("sayuri_nickname");
    let hasSeenGuide = sessionStorage.getItem("sayuri_guide_seen");

    const levelSettings = [
        { rows: 2, cols: 2, pairs: 2, time: 6 },
        { rows: 2, cols: 3, pairs: 3, time: 10 },
        { rows: 2, cols: 4, pairs: 4, time: 14 },
        { rows: 3, cols: 4, pairs: 6, time: 22 },
        { rows: 4, cols: 4, pairs: 8, time: 30 },
        { rows: 4, cols: 5, pairs: 10, time: 38 },
        { rows: 4, cols: 6, pairs: 12, time: 48 },
        { rows: 5, cols: 6, pairs: 15, time: 65 },
        { rows: 6, cols: 6, pairs: 18, time: 80 },
        { rows: 6, cols: 6, pairs: 18, time: 60 }
    ];

    const imagePaths = Array.from({ length: 18 }, (_, i) => `images/card${i + 1}.png`);
    const cardBackPath = 'images/card-back.png';

    if (!userNickname) {
        nickOverlay.classList.remove("hidden");
    } else if (!hasSeenGuide) {
        infoModal.classList.remove("hidden");
    } else {
        startOverlay.classList.remove("hidden");
    }

    document.getElementById("save-nickname-btn").onclick = () => {
        const input = document.getElementById("nickname-input").value.trim();
        if (input) {
            localStorage.setItem("sayuri_nickname", input);
            userNickname = input;
            nickOverlay.classList.add("hidden");
            if (!hasSeenGuide) infoModal.classList.remove("hidden");
            else startOverlay.classList.remove("hidden");
        }
    };

    // [수정] 도움말 닫기 버튼 로직
    document.getElementById("close-btn").onclick = () => {
        infoModal.classList.add("hidden");
        
        // 가이드를 처음 보는 경우에만 시작 화면을 보여줌
        if (!hasSeenGuide) {
            sessionStorage.setItem("sayuri_guide_seen", "true");
            hasSeenGuide = "true";
            startOverlay.classList.remove("hidden");
        }
        // 이미 게임 중이거나 시작 화면을 본 적이 있다면 아무것도 하지 않음 (즉시 게임 화면 유지)
    };

    startOverlay.onclick = () => {
        if (!startOverlay.classList.contains("hidden")) {
            startOverlay.classList.add("hidden");
            isGameRunning = true; // 게임 시작 상태로 변경
            startLevel();
        }
    };

    function startLevel() {
        const setting = levelSettings[currentLevel - 1];
        matchedPairs = 0;
        flippedCards = [];
        canFlip = false; 
        totalTime = setting.time;
        timeLeft = totalTime;
        
        levelDisplay.innerText = `LEVEL ${currentLevel}`;
        updateTimerBar();
        
        setupBoard(setting);

        const allCards = document.querySelectorAll('.card');
        allCards.forEach(card => card.classList.add('flipped'));

        countdownOverlay.classList.remove("hidden");
        let count = 3;
        countdownText.innerText = count;

        const countInterval = setInterval(() => {
            count--;
            if (count > 0) {
                countdownText.innerText = count;
            } else {
                clearInterval(countInterval);
                countdownOverlay.classList.add("hidden");
                
                allCards.forEach(card => card.classList.remove('flipped'));
                
                setTimeout(() => {
                    canFlip = true; 
                    startTimer();
                }, 400); 
            }
        }, 1000);
    }

    function setupBoard(setting) {
        gameBoard.innerHTML = '';
        gameBoard.style.gridTemplateColumns = `repeat(${setting.cols}, 1fr)`;

        const boardPadding = 40; 
        const availableWidth = window.innerWidth - boardPadding;
        const availableHeight = window.innerHeight - 180; 

        const cardWidth = availableWidth / setting.cols - 10;
        const cardHeight = availableHeight / setting.rows - 10;
        const cardSize = Math.min(cardWidth, cardHeight, 110); 

        let gameImages = [...imagePaths.slice(0, setting.pairs), ...imagePaths.slice(0, setting.pairs)];
        gameImages.sort(() => Math.random() - 0.5);

        gameImages.forEach((img) => {
            const card = document.createElement('div');
            card.classList.add('card');
            card.style.width = `${cardSize}px`;
            card.style.height = `${cardSize}px`;
            card.dataset.value = img;

            card.innerHTML = `
                <div class="card-inner">
                    <div class="card-front"><img src="${img}"></div>
                    <div class="card-back"><img src="${cardBackPath}"></div>
                </div>
            `;
            card.onclick = () => flipCard(card);
            gameBoard.appendChild(card);
        });
    }

    function flipCard(card) {
        if (!canFlip || card.classList.contains('flipped') || card.classList.contains('matched')) return;
        card.classList.add('flipped');
        flippedCards.push(card);
        if (flippedCards.length === 2) {
            canFlip = false;
            checkMatch();
        }
    }

    function checkMatch() {
        const [c1, c2] = flippedCards;
        const isMatch = c1.dataset.value === c2.dataset.value;

        if (isMatch) {
            matchedPairs++;
            c1.classList.add('matched');
            c2.classList.add('matched');
            flippedCards = [];
            canFlip = true;

            if (matchedPairs === levelSettings[currentLevel - 1].pairs) {
                clearInterval(timerInterval);
                setTimeout(showClear, 400);
            }
        } else {
            setTimeout(() => {
                c1.classList.remove('flipped');
                c2.classList.remove('flipped');
                flippedCards = [];
                canFlip = true;
            }, 500); 
        }
    }

    function startTimer() {
        clearInterval(timerInterval);
        const interval = 100; 
        timerInterval = setInterval(() => {
            // [수정] 도움말 창이 떠있을 때는 시간이 흐르지 않도록 방어 로직 추가
            if (!infoModal.classList.contains("hidden")) return;

            timeLeft -= (interval / 1000);
            updateTimerBar();

            if (timeLeft <= 0) {
                clearInterval(timerInterval);
                showGameOver();
            }
        }, interval);
    }

    function updateTimerBar() {
        const percentage = Math.max(0, (timeLeft / totalTime) * 100);
        timerBar.style.width = `${percentage}%`;
        
        if (percentage < 30) {
            timerBar.style.backgroundColor = "#ff4d6d";
        } else {
            timerBar.style.backgroundColor = "var(--soft-pink)";
        }
    }

    function showClear() {
        isGameRunning = false; // 레벨 클리어 시 상태 초기화
        if (currentLevel >= 10) {
            document.getElementById('clear-title').innerText = "ALL CLEAR! ✨";
            document.getElementById('clear-msg').innerText = "최고의 짝 맞추기 왕입니다!";
            const nextBtn = document.getElementById('next-btn');
            nextBtn.innerText = "처음으로";
            nextBtn.onclick = () => location.reload();
        } else {
            const nextBtn = document.getElementById('next-btn');
            nextBtn.onclick = () => {
                clearOverlay.classList.add("hidden");
                currentLevel++;
                isGameRunning = true;
                startLevel();
            };
        }
        clearOverlay.classList.remove("hidden");
    }

    function showGameOver() {
        isGameRunning = false;
        gameOverModal.classList.remove("hidden");
    }

    document.getElementById("restart-btn").onclick = () => location.reload();
    document.getElementById("info-btn").onclick = () => infoModal.classList.remove("hidden");
});