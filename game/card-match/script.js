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
    let userNickname = localStorage.getItem("sayuri_nickname");
    let hasSeenGuide = sessionStorage.getItem("sayuri_guide_seen");

    // 난이도 조정을 위해 시간을 단축했습니다.
    const levelSettings = [
        { rows: 2, cols: 2, pairs: 2, time: 6 },   // 10 -> 6
        { rows: 2, cols: 3, pairs: 3, time: 10 },  // 15 -> 10
        { rows: 2, cols: 4, pairs: 4, time: 14 },  // 20 -> 14
        { rows: 3, cols: 4, pairs: 6, time: 22 },  // 30 -> 22
        { rows: 4, cols: 4, pairs: 8, time: 30 },  // 40 -> 30
        { rows: 4, cols: 5, pairs: 10, time: 38 }, // 50 -> 38
        { rows: 4, cols: 6, pairs: 12, time: 48 }, // 60 -> 48
        { rows: 5, cols: 6, pairs: 15, time: 65 }, // 80 -> 65
        { rows: 6, cols: 6, pairs: 18, time: 80 }, // 100 -> 80
        { rows: 6, cols: 6, pairs: 18, time: 60 }  // 80 -> 60 (최종 보스 단계)
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

    document.getElementById("close-btn").onclick = () => {
        infoModal.classList.add("hidden");
        sessionStorage.setItem("sayuri_guide_seen", "true");
        hasSeenGuide = "true";
        startOverlay.classList.remove("hidden");
    };

    startOverlay.onclick = () => {
        if (!startOverlay.classList.contains("hidden")) {
            startOverlay.classList.add("hidden");
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

        // [수정] 카드 앞면 먼저 보여주기
        const allCards = document.querySelectorAll('.card');
        allCards.forEach(card => card.classList.add('flipped'));

        // [수정] 앞면이 보이는 상태에서 3초 카운트다운 시작
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
                
                // 카드 다시 덮기
                allCards.forEach(card => card.classList.remove('flipped'));
                
                // 카드 뒤집히는 애니메이션(0.4s) 대기 후 게임 시작
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
                startLevel();
            };
        }
        clearOverlay.classList.remove("hidden");
    }

    function showGameOver() {
        gameOverModal.classList.remove("hidden");
    }

    document.getElementById("restart-btn").onclick = () => location.reload();
    document.getElementById("info-btn").onclick = () => infoModal.classList.remove("hidden");
});