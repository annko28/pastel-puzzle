const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const bgm = document.getElementById('bgm');

// グリッドサイズ設定
const ROW = 20;
const COL = 10;
const SQ = 30; // 300px / 10マス = 30px
const VACANT = '#fdf1f2'; // 空白マスの色

// パステルカラーの定義
const COLORS = ['#ffb5a7', '#fcd5ce', '#ffcdb2', '#b5e2fa', '#edafb8', '#d8e2dc', '#e8aeb7'];

// ブロックの形定義
const PIECES = [
    [[1,1,1,1]], // I
    [[1,1,1],[0,1,0]], // T
    [[1,1,1],[1,0,0]], // L
    [[1,1,1],[0,0,1]], // J
    [[1,1],[1,1]], // O
    [[1,1,0],[0,1,1]], // Z
    [[0,1,1],[1,1,0]]  // S
];

// ゲーム変数
let board = [];
let score = 0;
let linesCleared = 0;
let currentStage = 1;
let gameOver = false;
let isPaused = false; // 一時停止フラグ
let currentDropSpeed = 1000;
const LINES_PER_STAGE = 10;

// アニメーション制御用
let dropStart = Date.now();
let animationIdDrop;
let animationIdInput;

// 盤面の初期化
function initBoard() {
    for(let r = 0; r < ROW; r++) {
        board[r] = [];
        for(let c = 0; c < COL; c++) {
            board[r][c] = VACANT;
        }
    }
}

// マスを描画
function drawSquare(x, y, color) {
    ctx.fillStyle = color;
    ctx.fillRect(x * SQ, y * SQ, SQ, SQ);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.strokeRect(x * SQ, y * SQ, SQ, SQ);
}

function drawBoard() {
    for(let r = 0; r < ROW; r++) {
        for(let c = 0; c < COL; c++) {
            drawSquare(c, r, board[r][c]);
        }
    }
}

// ブロックオブジェクト
class Piece {
    constructor(tetromino, color) {
        this.tetromino = tetromino;
        this.color = color;
        this.activeTetromino = this.tetromino;
        this.x = 3;
        this.y = -1;
    }

    draw() {
        for(let r = 0; r < this.activeTetromino.length; r++) {
            for(let c = 0; c < this.activeTetromino[r].length; c++) {
                if(this.activeTetromino[r][c] && this.y + r >= 0) {
                    drawSquare(this.x + c, this.y + r, this.color);
                }
            }
        }
    }

    unDraw() {
        for(let r = 0; r < this.activeTetromino.length; r++) {
            for(let c = 0; c < this.activeTetromino[r].length; c++) {
                if(this.activeTetromino[r][c] && this.y + r >= 0) {
                    drawSquare(this.x + c, this.y + r, VACANT);
                }
            }
        }
    }

    moveDown() {
        if(!this.collision(0, 1, this.activeTetromino)) {
            this.unDraw();
            this.y++;
            this.draw();
        } else {
            this.lock();
            generateNextPiece();
        }
    }

    moveRight() {
        if(!this.collision(1, 0, this.activeTetromino)) {
            this.unDraw();
            this.x++;
            this.draw();
        }
    }

    moveLeft() {
        if(!this.collision(-1, 0, this.activeTetromino)) {
            this.unDraw();
            this.x--;
            this.draw();
        }
    }

    rotate() {
        let nextPattern = [];
        for(let c = 0; c < this.activeTetromino[0].length; c++) {
            nextPattern[c] = [];
            for(let r = 0; r < this.activeTetromino.length; r++) {
                nextPattern[c][r] = this.activeTetromino[this.activeTetromino.length - 1 - r][c];
            }
        }
        if(!this.collision(0, 0, nextPattern)) {
            this.unDraw();
            this.activeTetromino = nextPattern;
            this.draw();
        }
    }

    collision(x, y, piece) {
        for(let r = 0; r < piece.length; r++) {
            for(let c = 0; c < piece[r].length; c++) {
                if(!piece[r][c]) continue;
                let nextX = this.x + c + x;
                let nextY = this.y + r + y;
                if(nextX < 0 || nextX >= COL || nextY >= ROW) return true;
                if(nextY < 0) continue;
                if(board[nextY][nextX] !== VACANT) return true;
            }
        }
        return false;
    }

    lock() {
        for(let r = 0; r < this.activeTetromino.length; r++) {
            for(let c = 0; c < this.activeTetromino[r].length; c++) {
                if(!this.activeTetromino[r][c]) continue;
                if(this.y + r < 0) {
                    handleGameOver();
                    return;
                }
                board[this.y + r][this.x + c] = this.color;
            }
        }
        checkLineClear();
    }
}

let p;
function generateNextPiece() {
    let r = Math.floor(Math.random() * PIECES.length);
    p = new Piece(PIECES[r], COLORS[r]);
    p.draw();
}

// ライン消去
function checkLineClear() {
    let linesThisTurn = 0;
    for(let r = 0; r < ROW; r++) {
        let isRowFull = true;
        for(let c = 0; c < COL; c++) {
            if(board[r][c] === VACANT) isRowFull = false;
        }
        if(isRowFull) {
            board.splice(r, 1);
            board.unshift(new Array(COL).fill(VACANT));
            linesThisTurn++;
            linesCleared++;
            score += 100 * linesThisTurn;
        }
    }
    document.getElementById('score').innerText = score;
    document.getElementById('lines').innerText = `${linesCleared % LINES_PER_STAGE}`;
    drawBoard();

    if(linesCleared > 0 && linesCleared % LINES_PER_STAGE === 0) {
        handleStageClear();
    }
}

// キーボード操作（PC用）
const keys = {};
window.addEventListener('keydown', e => {
    if(["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(e.code)) e.preventDefault();
    if(gameOver || isPaused || document.getElementById('clear-screen').classList.contains('hidden') === false) return;
    
    if(!keys[e.code]) {
        keys[e.code] = true;
        if(e.code === 'ArrowUp') p.rotate();
    }
});
window.addEventListener('keyup', e => { keys[e.code] = false; });

let lastInputTime = 0;
function handleInput(timestamp) {
    if (!isPaused && !gameOver && document.getElementById('clear-screen').classList.contains('hidden')) {
        if(timestamp - lastInputTime > 80) {
            if(keys['ArrowLeft']) p.moveLeft();
            if(keys['ArrowRight']) p.moveRight();
            if(keys['ArrowDown']) p.moveDown();
            lastInputTime = timestamp;
        }
    }
    if(!gameOver) animationIdInput = requestAnimationFrame(handleInput);
}

// 自動落下システム
function drop(timestamp) {
    // 一時停止中、ゲームオーバー、クリア画面表示中は落下しない
    if (!isPaused && !gameOver && document.getElementById('clear-screen').classList.contains('hidden')) {
        let now = Date.now();
        let delta = now - dropStart;
        if(delta > currentDropSpeed){
            p.moveDown();
            dropStart = Date.now();
        }
    }
    if (!gameOver) {
        animationIdDrop = requestAnimationFrame(drop);
    }
}

// 各種画面の表示処理
function handleStageClear() {
    bgm.pause();
    document.getElementById('clear-screen').classList.remove('hidden');
    if(currentStage === 5) {
        document.querySelector('#clear-screen .overlay-text').innerText = "ALL STAGES CLEAR! 💕";
        document.getElementById('next-btn').style.display = 'none';
    }
}

function nextStage() {
    currentStage++;
    document.getElementById('stage').innerText = currentStage;
    document.getElementById('lines').innerText = "0";
    currentDropSpeed = Math.max(200, 1000 - (currentStage - 1) * 200); 
    
    document.getElementById('clear-screen').classList.add('hidden');
    initBoard();
    drawBoard();
    generateNextPiece();
    bgm.play();
    dropStart = Date.now();
}

function handleGameOver() {
    gameOver = true;
    bgm.pause();
    document.getElementById('gameover-screen').classList.remove('hidden');
    document.getElementById('pause-btn').disabled = true;
}

// 一時停止機能
function togglePause() {
    if (gameOver || !document.getElementById('clear-screen').classList.contains('hidden')) return;
    
    isPaused = !isPaused;
    const pauseBtn = document.getElementById('pause-btn');
    const pauseScreen = document.getElementById('pause-screen');

    if (isPaused) {
        pauseBtn.innerText = "RESUME";
        bgm.pause();
        pauseScreen.classList.remove('hidden');
    } else {
        pauseBtn.innerText = "PAUSE";
        bgm.play();
        pauseScreen.classList.add('hidden');
        dropStart = Date.now(); // 再開時にいきなり落ちないようにリセット
    }
}

// ゲーム開始
function startGame() {
    initBoard();
    drawBoard();
    generateNextPiece();
    
    score = 0;
    linesCleared = 0;
    currentStage = 1;
    currentDropSpeed = 1000;
    gameOver = false;
    isPaused = false;
    
    document.getElementById('score').innerText = "0";
    document.getElementById('stage').innerText = "1";
    document.getElementById('lines').innerText = "0";
    
    document.getElementById('clear-screen').classList.add('hidden');
    document.getElementById('gameover-screen').classList.add('hidden');
    document.getElementById('pause-screen').classList.add('hidden');
    document.getElementById('next-btn').style.display = 'block';
    
    // 一時停止ボタンを有効化
    const pauseBtn = document.getElementById('pause-btn');
    pauseBtn.disabled = false;
    pauseBtn.innerText = "PAUSE";

    bgm.currentTime = 0;
    bgm.play().catch(e => console.log("再生ブロック"));

    // アニメーションループが重複しないように一度キャンセル
    cancelAnimationFrame(animationIdDrop);
    cancelAnimationFrame(animationIdInput);

    dropStart = Date.now();
    animationIdDrop = requestAnimationFrame(drop);
    animationIdInput = requestAnimationFrame(handleInput);
}

// イベントリスナー
document.getElementById('start-btn').addEventListener('click', startGame);
document.getElementById('pause-btn').addEventListener('click', togglePause);
document.getElementById('next-btn').addEventListener('click', nextStage);
document.getElementById('retry-btn').addEventListener('click', startGame);

// スマホ用ボタン操作（長押しで連続移動できるように調整）
let btnInterval;
const setupTouchBtn = (btn, action) => {
    if(!btn) return;
    
    // タッチした時
    btn.addEventListener('touchstart', (e) => { 
        e.preventDefault(); 
        if(!isPaused && !gameOver && document.getElementById('clear-screen').classList.contains('hidden')) {
            action(); // まず1回動かす
            // 長押しで連続移動（回転以外）
            if(btn.id !== 'btn-rotate') {
                btnInterval = setInterval(action, 100);
            }
        }
    }, { passive: false });

    // 指を離した時
    btn.addEventListener('touchend', (e) => {
        e.preventDefault();
        clearInterval(btnInterval);
    });
};

setupTouchBtn(document.getElementById('btn-left'), () => p.moveLeft());
setupTouchBtn(document.getElementById('btn-right'), () => p.moveRight());
setupTouchBtn(document.getElementById('btn-rotate'), () => p.rotate());
setupTouchBtn(document.getElementById('btn-down'), () => p.moveDown());

// 初期表示
initBoard();
drawBoard();
