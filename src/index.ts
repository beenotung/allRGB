document.title = 'rule 30';

const style: HTMLStyleElement = document.createElement('style');
style.textContent = `
body {
  padding: 0;
  margin: 0;
  overflow: hidden;
}
`;
document.body.appendChild(style);

const canvas: HTMLCanvasElement = document.createElement('canvas');
document.body.appendChild(canvas);
const w = (canvas.width = screen.availWidth);
const h = (canvas.height = screen.availHeight);
const context = canvas.getContext('2d');
const imageData = context.createImageData(w, h);

function render() {
  context.putImageData(imageData, 0, 0);
}

function clear() {
  for (let i = 0; i < imageData.data.length; i++) {
    imageData.data[i] = 255;
  }
}

function setPixel(x, y, isBlack) {
  const offset = (x + y * w) * 4;
  const color = isBlack ? 0 : 255;
  imageData.data[offset + 0] = color;
  imageData.data[offset + 1] = color;
  imageData.data[offset + 2] = color;
  imageData.data[offset + 3] = 255;
}

const { round } = Math;
/* x -> y -> isBlack */
const halfH = round(h / 2);
let states: number[][];
setPixel(0, halfH, 1);
let x: number;
let startY: number;
let endY: number;

/* -1 -> 0 -> 1 -> result */
const rules: number[][][] = [];
for (let r1 = 0; r1 < 2; r1++) {
  rules[r1] = [];
  for (let r2 = 0; r2 < 2; r2++) {
    rules[r1][r2] = [];
    for (let r3 = 0; r3 < 2; r3++) {
      rules[r1][r2][r3] = 0;
    }
  }
}
rules[1][0][0] = 1;
rules[0][1][1] = 1;
rules[0][1][0] = 1;
rules[0][0][1] = 1;

function getPrevRule(x, y) {
  x--;
  const s = states[x];
  return [s[y - 1] || 0, s[y] || 0, s[y + 1] || 0];
}

function getResult(x, y) {
  const [r1, r2, r3] = getPrevRule(x, y);
  return rules[r1][r2][r3];
}

let isStop = true;
let isStopNext = false;
let domStop = window.stop;

function stop() {
  isStop = true;
  domStop();
}

function update() {
  x++;
  startY--;
  endY++;
  states.push([]);
  const screenX = x % w;
  if (isStopNext && screenX === 0) {
    isStop = true;
    return;
  }
  for (let y = startY; y <= endY; y++) {
    const isBlack = getResult(x, y);
    states[x][y] = isBlack;
    if (y >= 0 && y <= h) {
      setPixel(screenX, y, isBlack);
    }
  }
  render();
}

function loop() {
  if (isStop) {
    return;
  }
  update();
  requestAnimationFrame(loop);
}

function start() {
  states = [[]];
  states[0][halfH] = 1;
  x = 0;
  startY = halfH;
  endY = halfH;
  clear();
  setPixel(0, halfH, 1);
  isStop = false;
  isStopNext = false;
  loop();
}

function resume() {
  isStop = false;
  isStopNext = false;
  loop();
}

function stopNext() {
  isStopNext = true;
}

Object.assign(window, { start, resume, stop, stopNext });

canvas.onclick = () => {
  if (isStop) {
    resume();
  } else {
    stop();
  }
};

start();
