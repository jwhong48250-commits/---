/* -------------------- 유틸 & 상태 -------------------- */
const boardEl = document.getElementById("sudoku");
const difficultyEl = document.getElementById("difficulty");
const newBtn = document.getElementById("newBtn");
const hintBtn = document.getElementById("hintBtn");
const checkBtn = document.getElementById("checkBtn");
const timerEl = document.getElementById("timer");
const startBtn = document.getElementById("startBtn");
const pauseBtn = document.getElementById("pauseBtn");
const resetBtn = document.getElementById("resetBtn");
const saveBtn = document.getElementById("saveBtn");
const loadBtn = document.getElementById("loadBtn");
const clearSaveBtn = document.getElementById("clearSaveBtn");
const autoHighlightWrong = document.getElementById("autoHighlightWrong");
const animateCells = document.getElementById("animateCells");

const numBtns = Array.from(document.querySelectorAll(".num-btn"));
const eraseBtn = document.getElementById("eraseBtn");

let solution = null; // 완전한 정답 9x9
let puzzle = null; // 초기 퍼즐 (고정값)
let current = null; // 현재 입력 상태
let selectedCell = null; // DOM element
let timer = { running: false, startTime: 0, elapsed: 0, intervalId: null };

const STORAGE_KEY = "sudoku_v1_save";

/* -------------------- 랜덤 헬퍼 -------------------- */
function randRange(a, b) {
  return Math.floor(Math.random() * (b - a + 1)) + a;
}
function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/* -------------------- 보드 렌더링 -------------------- */
function renderBoard() {
  boardEl.innerHTML = "";
  boardEl.setAttribute("role", "grid");
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      const div = document.createElement("div");
      div.className = "cell";
      div.dataset.row = r;
      div.dataset.col = c;
      const val = current[r][c];
      if (puzzle[r][c] !== 0) {
        div.classList.add("prefill");
        div.textContent = puzzle[r][c];
        div.dataset.preset = "1";
      } else {
        if (val) div.textContent = val;
      }
      div.addEventListener("click", () => selectCell(div));
      boardEl.appendChild(div);
    }
  }
  apply3x3Borders();
}

/* 3x3 경계 정렬 보정(정렬 문제 방지) */
function apply3x3Borders() {
  // (CSS handles most) — ensure visual alignment via consistent sizes (CSS already)
  // leave stub for future adjustments if needed
}

/* 선책 셀 표시 */
function selectCell(el) {
  if (selectedCell) selectedCell.classList.remove("selected");
  if (el.classList.contains("prefill")) {
    selectedCell = null;
    return;
  }
  selectedCell = el;
  el.classList.add("selected");
}

/* -------------------- 입력 처리 -------------------- */
numBtns.forEach((b) => {
  b.addEventListener("click", () => {
    if (!selectedCell) return;
    const n = parseInt(b.dataset.num);
    const r = +selectedCell.dataset.row,
      c = +selectedCell.dataset.col;
    current[r][c] = n;
    selectedCell.textContent = n;
    selectedCell.classList.remove("wrong");
    selectedCell.classList.remove("selected");
    selectedCell = null;
    if (autoHighlightWrong.checked) highlightWrongCells();
  });
});
eraseBtn.addEventListener("click", () => {
  if (!selectedCell) return;
  const r = +selectedCell.dataset.row,
    c = +selectedCell.dataset.col;
  current[r][c] = 0;
  selectedCell.textContent = "";
  selectedCell.classList.remove("wrong");
  selectedCell.classList.remove("selected");
  selectedCell = null;
  if (autoHighlightWrong.checked) highlightWrongCells();
});

/* -------------------- 체크 / 하이라이트 -------------------- */
function highlightWrongCells() {
  // 모든 사용자가 입력한 숫자와 solution 비교
  const cells = document.querySelectorAll(".cell");
  cells.forEach((cell) => cell.classList.remove("wrong"));
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (puzzle[r][c] !== 0) continue; // preset skip
      const val = current[r][c];
      if (val && solution[r][c] !== val) {
        const idx = r * 9 + c;
        const cell = boardEl.children[idx];
        cell.classList.add("wrong");
      }
    }
  }
}

/* 전체 정답 체크 */
function checkAll() {
  let ok = true;
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (current[r][c] !== solution[r][c]) ok = false;
    }
  }
  if (ok) {
    stopTimer();
    setTimeout(() => alert("🎉 축하합니다! 정답을 완성했습니다!"), 100);
  } else {
    highlightWrongCells();
    // 애니메이션으로 틀린 칸 강조
    const wrong = document.querySelectorAll(".cell.wrong");
    if (wrong.length)
      wrong.forEach((el) =>
        el.animate(
          [
            { transform: "translateY(0)" },
            { transform: "translateY(-6px)" },
            { transform: "translateY(0)" },
          ],
          { duration: 220 }
        )
      );
    if (wrong.length === 0) alert("아직 틀린 칸은 없지만 정답이 아닙니다.");
  }
}

/* -------------------- 힌트 -------------------- */
function giveHint() {
  // 빈 칸 중 하나 채우기
  const empties = [];
  for (let r = 0; r < 9; r++)
    for (let c = 0; c < 9; c++) if (current[r][c] === 0) empties.push([r, c]);
  if (empties.length === 0) return alert("빈 칸이 없습니다.");
  const [r, c] = empties[randRange(0, empties.length - 1)];
  current[r][c] = solution[r][c];
  const idx = r * 9 + c;
  const cell = boardEl.children[idx];
  cell.textContent = solution[r][c];
  cell.classList.remove("selected");
  // 애니메이션
  if (animateCells.checked) {
    cell.animate(
      [
        { transform: "scale(0.7)" },
        { transform: "scale(1.05)" },
        { transform: "scale(1)" },
      ],
      { duration: 360 }
    );
  }
  if (autoHighlightWrong.checked) highlightWrongCells();
  checkAll();
}

/* -------------------- 타이머 -------------------- */
function formatTime(ms) {
  const s = Math.floor(ms / 1000);
  const mm = Math.floor(s / 60);
  const ss = s % 60;
  return `${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
}
function startTimer() {
  if (timer.running) return;
  timer.running = true;
  timer.startTime = Date.now() - timer.elapsed;
  timer.intervalId = setInterval(() => {
    timer.elapsed = Date.now() - timer.startTime;
    timerEl.textContent = formatTime(timer.elapsed);
  }, 300);
}
function stopTimer() {
  if (!timer.running) return;
  timer.running = false;
  clearInterval(timer.intervalId);
}
function resetTimer() {
  stopTimer();
  timer.elapsed = 0;
  timer.startTime = 0;
  timerEl.textContent = "00:00";
}
startBtn.addEventListener("click", startTimer);
pauseBtn.addEventListener("click", stopTimer);
resetBtn.addEventListener("click", () => {
  resetTimer();
});

/* -------------------- 저장/불러오기 -------------------- */
function saveGame() {
  const state = {
    puzzle,
    current,
    solution,
    difficulty: difficultyEl.value,
    elapsed: timer.elapsed,
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  alert("저장되었습니다.");
}
function loadGame() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return alert("저장된 퍼즐이 없습니다.");
  try {
    const st = JSON.parse(raw);
    puzzle = st.puzzle;
    current = st.current;
    solution = st.solution;
    difficultyEl.value = st.difficulty || "normal";
    timer.elapsed = st.elapsed || 0;
    timerEl.textContent = formatTime(timer.elapsed);
    renderBoard();
  } catch (e) {
    console.error(e);
    alert("불러오기 실패");
  }
}
saveBtn.addEventListener("click", saveGame);
loadBtn.addEventListener("click", loadGame);
clearSaveBtn.addEventListener("click", () => {
  localStorage.removeItem(STORAGE_KEY);
  alert("저장 삭제됨");
});

/* -------------------- 퍼즐 생성기 (백트래킹 + 유일성 검사) -------------------- */

/* 빈 9x9 생성 */
function createEmpty() {
  const a = [];
  for (let i = 0; i < 9; i++) {
    a.push(new Array(9).fill(0));
  }
  return a;
}

/* check valid place */
function isValid(board, r, c, val) {
  for (let i = 0; i < 9; i++) {
    if (board[r][i] === val) return false;
    if (board[i][c] === val) return false;
  }
  const br = Math.floor(r / 3) * 3,
    bc = Math.floor(c / 3) * 3;
  for (let i = 0; i < 3; i++)
    for (let j = 0; j < 3; j++) if (board[br + i][bc + j] === val) return false;
  return true;
}

/* fill full board (backtracking) */
function fillFull(board) {
  // find next empty
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (board[r][c] === 0) {
        const nums = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]);
        for (const n of nums) {
          if (isValid(board, r, c, n)) {
            board[r][c] = n;
            if (fillFull(board)) return true;
            board[r][c] = 0;
          }
        }
        return false;
      }
    }
  }
  return true; // filled
}

/* count solutions up to limit (stop early) */
function countSolutions(board, limit = 2) {
  const b = board.map((row) => row.slice());
  let count = 0;
  function dfs() {
    if (count >= limit) return;
    // find empty
    let found = false,
      rr = -1,
      cc = -1;
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (b[r][c] === 0) {
          rr = r;
          cc = c;
          found = true;
          break;
        }
      }
      if (found) break;
    }
    if (!found) {
      count++;
      return;
    }
    for (let n = 1; n <= 9; n++) {
      if (isValid(b, rr, cc, n)) {
        b[rr][cc] = n;
        dfs();
        b[rr][cc] = 0;
        if (count >= limit) return;
      }
    }
  }
  dfs();
  return count;
}

/* generate puzzle with unique solution - difficulty controls removals */
function generatePuzzle(difficulty = "normal") {
  // try until success (with safe attempts)
  // difficulty removal counts (target blanks)
  const blanksByDifficulty = { easy: 40, normal: 49, hard: 54 }; // approx. number of blanks
  const targetBlank = blanksByDifficulty[difficulty] || 49;

  // make full board
  let full = createEmpty();
  fillFull(full);

  // positions list shuffle
  const positions = [];
  for (let r = 0; r < 9; r++)
    for (let c = 0; c < 9; c++) positions.push([r, c]);
  shuffle(positions);

  // start with full (copy)
  const puzzleBoard = full.map((row) => row.slice());

  // greedily remove while keeping uniqueness
  let removed = 0;
  for (const [r, c] of positions) {
    if (removed >= targetBlank) break;
    const backup = puzzleBoard[r][c];
    puzzleBoard[r][c] = 0;

    // check uniqueness
    const sols = countSolutions(puzzleBoard, 2);
    if (sols !== 1) {
      // revert
      puzzleBoard[r][c] = backup;
    } else {
      removed++;
    }
  }

  // if we couldn't reach targetBlank (rare) we accept current puzzle
  return { puzzle: puzzleBoard, solution: full };
}

/* -------------------- 퍼즐 초기화 / 재시작 -------------------- */
async function newPuzzle(mode) {
  // disable UI while generating
  newBtn.disabled = true;
  newBtn.textContent = "생성중...";
  await new Promise((r) => setTimeout(r, 10)); // allow UI update

  const { puzzle: genPuzzle, solution: genSolution } = generatePuzzle(mode);
  puzzle = genPuzzle;
  solution = genSolution;
  // set current = puzzle copy
  current = puzzle.map((row) => row.slice());
  renderBoard();
  resetTimer();
  newBtn.disabled = false;
  newBtn.textContent = "새 퍼즐";
}

/* -------------------- 초기화 이벤트 연결 -------------------- */
newBtn.addEventListener("click", () => newPuzzle(difficultyEl.value));
hintBtn.addEventListener("click", giveHint);
checkBtn.addEventListener("click", () => {
  highlightWrongCells();
  checkAll();
});

/* -------------------- 초기 로딩 -------------------- */
window.addEventListener("load", () => {
  // attach number buttons dataset already set
  document.querySelectorAll(".num-btn").forEach((b) => {
    if (b.dataset.num) b.dataset.num = b.dataset.num;
  });

  // generate initial puzzle
  newPuzzle(difficultyEl.value);
});

/* -------------------- 기타: 키보드 입력 지원 -------------------- */
document.addEventListener("keydown", (e) => {
  if (!selectedCell) return;
  if (e.key >= "1" && e.key <= "9") {
    const n = parseInt(e.key);
    const r = +selectedCell.dataset.row,
      c = +selectedCell.dataset.col;
    current[r][c] = n;
    selectedCell.textContent = n;
    selectedCell.classList.remove("wrong");
    selectedCell.classList.remove("selected");
    selectedCell = null;
    if (autoHighlightWrong.checked) highlightWrongCells();
  } else if (e.key === "Backspace" || e.key === "Delete" || e.key === "0") {
    const r = +selectedCell.dataset.row,
      c = +selectedCell.dataset.col;
    current[r][c] = 0;
    selectedCell.textContent = "";
    selectedCell.classList.remove("selected");
    selectedCell = null;
    if (autoHighlightWrong.checked) highlightWrongCells();
  }
});
