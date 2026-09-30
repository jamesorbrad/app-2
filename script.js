const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
const W = canvas.width;
const H = canvas.height;

const overlay = document.getElementById("overlay");
const overlayTitle = document.getElementById("overlay-title");
const overlayText = document.getElementById("overlay-text");
const overlayBtn = document.getElementById("overlay-btn");

// ----- Settings -----
const COLS = 7;
const ROWS = 6;
const BRICK_GAP = 4;
const SIDE = 15;
const TOP = 60;
const BRICK_W = (W - 2 * SIDE - (COLS - 1) * BRICK_GAP) / COLS;
const BRICK_H = 18;
const ROW_COLOURS = ["#ff4d6d", "#ff9f1c", "#ffd60a", "#2ec4b6", "#3a86ff", "#9b5de5"];
const SPEED = 6;          // ball speed in pixels per frame (at 60 frames per second)
const PADDLE_SPEED = 8;   // keyboard paddle speed

// ----- Game objects -----
const paddle = { w: 72, h: 12, x: W / 2, y: H - 40 };   // x is the centre of the paddle
const ball = { r: 7, x: 0, y: 0, vx: 0, vy: 0 };
let bricks = [];
let score = 0;
let lives = 3;
let state = "menu";       // menu, ready, playing or over
let lastTime = 0;
const keys = { left: false, right: false };

// ----- Helpers -----
function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function buildBricks() {
  bricks = [];
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      bricks.push({
        x: SIDE + col * (BRICK_W + BRICK_GAP),
        y: TOP + row * (BRICK_H + BRICK_GAP),
        colour: ROW_COLOURS[row],
        alive: true
      });
    }
  }
}

function resetBall() {
  state = "ready";
  ball.vx = 0;
  ball.vy = 0;
  ball.x = paddle.x;
  ball.y = paddle.y - paddle.h / 2 - ball.r - 1;
}

function launchBall() {
  if (state !== "ready") return;
  const angle = (Math.random() - 0.5) * 0.8;
  ball.vx = SPEED * Math.sin(angle);
  ball.vy = -SPEED * Math.cos(angle);
  state = "playing";
}

function showOverlay(title, text, buttonLabel, extraClass) {
  overlayTitle.textContent = title;
  overlayText.textContent = text;
  overlayBtn.textContent = buttonLabel;
  overlay.className = extraClass || "";
}

function startGame() {
  score = 0;
  lives = 3;
  buildBricks();
  resetBall();
  overlay.className = "hidden";
}

function winGame() {
  state = "over";
  showOverlay(
    "Happy Birthday Lysney, you bloody legend!",
    "You cleared every brick. Final score: " + score,
    "Play again",
    "win"
  );
}

function loseGame() {
  state = "over";
  showOverlay("Game over", "Final score: " + score, "Try again", "");
}

// ----- Update -----
function update(dt) {
  if (keys.left) paddle.x -= PADDLE_SPEED * dt;
  if (keys.right) paddle.x += PADDLE_SPEED * dt;
  paddle.x = clamp(paddle.x, paddle.w / 2, W - paddle.w / 2);

  if (state === "ready") {
    ball.x = paddle.x;
    ball.y = paddle.y - paddle.h / 2 - ball.r - 1;
    return;
  }
  if (state !== "playing") return;

  ball.x += ball.vx * dt;
  ball.y += ball.vy * dt;

  // Walls and ceiling
  if (ball.x - ball.r < 0) { ball.x = ball.r; ball.vx = Math.abs(ball.vx); }
  if (ball.x + ball.r > W) { ball.x = W - ball.r; ball.vx = -Math.abs(ball.vx); }
  if (ball.y - ball.r < 0) { ball.y = ball.r; ball.vy = Math.abs(ball.vy); }

  // Paddle
  const paddleTop = paddle.y - paddle.h / 2;
  if (
    ball.vy > 0 &&
    ball.y + ball.r >= paddleTop &&
    ball.y - ball.r <= paddleTop + paddle.h &&
    ball.x >= paddle.x - paddle.w / 2 - ball.r &&
    ball.x <= paddle.x + paddle.w / 2 + ball.r
  ) {
    const hit = clamp((ball.x - paddle.x) / (paddle.w / 2), -1, 1);
    const angle = hit * 1.05;   // up to about 60 degrees
    ball.vx = SPEED * Math.sin(angle);
    ball.vy = -SPEED * Math.cos(angle);
    ball.y = paddleTop - ball.r;
  }

  // Bricks
  for (const b of bricks) {
    if (!b.alive) continue;
    const nearestX = clamp(ball.x, b.x, b.x + BRICK_W);
    const nearestY = clamp(ball.y, b.y, b.y + BRICK_H);
    const dx = ball.x - nearestX;
    const dy = ball.y - nearestY;
    if (dx * dx + dy * dy <= ball.r * ball.r) {
      b.alive = false;
      score += 10;
      if (Math.abs(dx) > Math.abs(dy)) {
        ball.vx = -ball.vx;
      } else {
        ball.vy = -ball.vy;
      }
      break;   // only one brick per frame
    }
  }

  if (bricks.every(function (b) { return !b.alive; })) {
    winGame();
    return;
  }

  // Ball lost off the bottom
  if (ball.y - ball.r > H) {
    lives--;
    if (lives <= 0) {
      loseGame();
    } else {
      resetBall();
    }
  }
}

// ----- Draw -----
function draw() {
  ctx.clearRect(0, 0, W, H);

  for (const b of bricks) {
    if (!b.alive) continue;
    ctx.fillStyle = b.colour;
    ctx.fillRect(b.x, b.y, BRICK_W, BRICK_H);
  }

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(paddle.x - paddle.w / 2, paddle.y - paddle.h / 2, paddle.w, paddle.h);

  ctx.beginPath();
  ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
  ctx.fillStyle = "#ffe600";
  ctx.fill();

  ctx.fillStyle = "#ffffff";
  ctx.font = "16px Arial";
  ctx.textAlign = "left";
  ctx.fillText("Score: " + score, 15, 28);
  ctx.textAlign = "right";
  ctx.fillText("Lives: " + lives, W - 15, 28);

  if (state === "ready") {
    ctx.textAlign = "center";
    ctx.fillText("Tap to launch", W / 2, H / 2 + 60);
  }
}

// ----- Main loop -----
function loop(timestamp) {
  const dt = Math.min((timestamp - lastTime) / 16.667, 2);
  lastTime = timestamp;
  update(dt);
  draw();
  requestAnimationFrame(loop);
}

// ----- Controls -----
function movePaddleTo(event) {
  const rect = canvas.getBoundingClientRect();
  const x = (event.clientX - rect.left) * (W / rect.width);
  paddle.x = clamp(x, paddle.w / 2, W - paddle.w / 2);
}

canvas.addEventListener("pointermove", movePaddleTo);
canvas.addEventListener("pointerdown", function (event) {
  movePaddleTo(event);
  launchBall();
});

window.addEventListener("keydown", function (event) {
  if (event.key === "ArrowLeft") keys.left = true;
  if (event.key === "ArrowRight") keys.right = true;
  if (event.key === " " || event.key === "ArrowUp") {
    event.preventDefault();
    launchBall();
  }
});

window.addEventListener("keyup", function (event) {
  if (event.key === "ArrowLeft") keys.left = false;
  if (event.key === "ArrowRight") keys.right = false;
});

overlayBtn.addEventListener("click", startGame);

// ----- Start -----
buildBricks();
resetBall();
state = "menu";
showOverlay("Brick Breaker", "Drag to move the paddle. Tap to launch the ball.", "Start", "");
requestAnimationFrame(loop);