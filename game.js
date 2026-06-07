const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const bgm = document.getElementById('bgm');

// グリッドサイズ設定
const ROW = 20;
const COL = 10;
const SQ = 30; // 300px / 10マス = 30px
const VACANT = '#fdf1f2'; // 空白マスの色

// パステルカラーの定義
const COLORS = [
    '#ffb5a7', // ピンク
    '#fcd5ce', // 薄ピンク
    '#ffcdb2', // パステルオレンジ
    '#b5e2fa', // パステルブルー
    '#edafb8', // ローズピンク
    '#d8e2dc', // ミントグレー
    '#e8aeb7'  // マゼンタパステル
];

// ブロック（テトロミノ）の形定義
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
let gameInterval;
let currentDropSpeed = 1000; // 初期スピード（1秒に1マス）

// 1ステージあたりの必要消去ライン数
const LINES_PER_STAGE = 10; 

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
    ctx.strokeStyle = '#ffffff'; // マスの境界線を白にして柔らかく
    ctx.lineWidth = 1;
    ctx.strokeRect(x * SQ, y * SQ, SQ, SQ);
}

// 盤面全体を描画
function drawBoard() {
    for(let r = 0; r < ROW; r++) {
        for(let c = 0; c < COL; c++) {
            drawSquare(c, r, board[r][c]);
        }
    }
}

// ブロックのオブジェクトクラス
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
                if(this.activeTetromino[r][c]) {
                    if(this.y + r >= 0) {
                        drawSquare(this.x + c, this.y + r, this.color);
                    }
                }
            }
        }
    }

    unDraw() {
        for(let r = 0; r < this.activeTetromino.length; r++) {
            for(let c = 0; c < this.activeTetromino[r].length; c++) {
                if(this.activeTetromino[r][c]) {
                    if(this.y + r >= 0) {
                        drawSquare(this.x + c, this.y + r, VACANT);
                    }
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

    // 衝突判定
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

    // ブロックを盤面に固定
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

// ラインが揃ったかチェック
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

    // UI更新
    document.getElementById('score').innerText = score;
    document.getElementById('lines').innerText = `${linesCleared % LINES_PER_STAGE}`;

    drawBoard();

    // ステージクリア判定
    if(linesCleared >= currentStage * LINES_PER_STAGE) {
        handleStageClear();
    }
}

// スムーズなキー操作の実装（長押し対応）
const keys = {};
window.addEventListener('keydown', e => {
    if(["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(e.code)) {
        e.preventDefault(); // 画面スクロール防止
    }
    if(gameOver || document.getElementById('clear-screen').classList.contains('hidden') === false) return;
    
    if(!keys[e.code]) {
        keys[e.code] = true;
        if(e.code === 'ArrowUp') p.rotate();
    }
});

window.addEventListener('keyup', e => { keys[e.code] = false; });

// 直感的な操作ループ（30FPSほどで入力を監視し、移動を滑らかに）
let lastInputTime = 0;
function handleInput(timestamp) {
    if(timestamp - lastInputTime > 80) { // 80ミリ秒ごとに入力を受け付ける（長押し時の移動速度）
        if(keys['ArrowLeft']) p.moveLeft();
        if(keys['ArrowRight']) p.moveRight();
        if(keys['ArrowDown']) p.moveDown();
        lastInputTime = timestamp;
    }
    if(!gameOver) requestAnimationFrame(handleInput);
}

// 自動落下システム
let dropStart = Date.now();
function drop(timestamp) {
    let now = Date.now();
    let delta = now - dropStart;
    if(delta > currentDropSpeed){
        p.moveDown();
        dropStart = Date.now();
    }

    // クリア画面が隠れていて（ゲーム中）、ゲームオーバーでなければ落下を継続
    let isClearScreenHidden = document.getElementById('clear-screen').classList.contains('hidden');
    if (!gameOver && isClearScreenHidden) {
        requestAnimationFrame(drop);
    }
}

// ステージクリア処理
function handleStageClear() {
    clearInterval(gameInterval);
    bgm.pause();
    
    document.getElementById('clear-screen').classList.remove('hidden');
    
    if(currentStage === 5) {
        document.getElementById('clear-text').innerText = "ALL STAGES CLEAR! 💕";
        document.getElementById('next-btn').style.display = 'none';
    }
}

// 次のステージへ進む
function nextStage() {
    currentStage++;
    document.getElementById('stage').innerText = currentStage;
    document.getElementById('lines').innerText = "0";
    
    // スピードアップ（徐々に落下間隔を短くする）
    currentDropSpeed = Math.max(200, 1000 - (currentStage - 1) * 200); 
    
    document.getElementById('clear-screen').classList.add('hidden');
    
    initBoard();
    drawBoard();
    generateNextPiece();
    bgm.play();
    
    dropStart = Date.now();
    requestAnimationFrame(drop);
}

// ゲームオーバー処理
function handleGameOver() {
    gameOver = true;
    bgm.pause();
    document.getElementById('gameover-screen').classList.remove('hidden');
}

// ゲーム開始・再起動
function startGame() {
    initBoard();
    drawBoard();
    generateNextPiece();
    
    score = 0;
    linesCleared = 0;
    currentStage = 1;
    currentDropSpeed = 1000;
    gameOver = false;
    
    document.getElementById('score').innerText = "0";
    document.getElementById('stage').innerText = "1";
    document.getElementById('lines').innerText = "0";
    
    document.getElementById('clear-screen').classList.add('hidden');
    document.getElementById('gameover-screen').classList.add('hidden');
    document.getElementById('next-btn').style.display = 'block';
    document.getElementById('clear-text').innerText = "STAGE CLEAR!";

    bgm.currentTime = 0;
    bgm.play().catch(e => console.log("ユーザー操作前にオーディオ再生はブロックされます"));

    dropStart = Date.now();
    requestAnimationFrame(drop);
    requestAnimationFrame(handleInput);
}

// イベントリスナー設定
document.getElementById('start-btn').addEventListener('click', startGame);
document.getElementById('next-btn').addEventListener('click', nextStage);
document.getElementById('retry-btn').addEventListener('click', startGame);

// 初期盤面だけ描画しておく
initBoard();
drawBoard();
