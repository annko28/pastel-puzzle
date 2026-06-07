let isPaused = false;
const bgm = document.getElementById('bgm');
const pauseBtn = document.getElementById('pause-btn');

function togglePause() {
    isPaused = !isPaused;
    if (isPaused) {
        bgm.pause();
        pauseBtn.innerText = "RESUME";
    } else {
        bgm.play();
        pauseBtn.innerText = "PAUSE";
    }
}

pauseBtn.addEventListener('click', togglePause);

// --- 既存の移動処理のドロップ部分に以下を追加 ---
// function drop() {
//    if (isPaused) return; // これを追加
//    ...
// }
