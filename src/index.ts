import {
  new_oklab,
  new_rgb,
  rgb,
  oklab,
  rgb_to_oklab,
} from 'oklab.ts/dist/oklab';
const { round } = Math;

document.title = 'allrgb';

const style: HTMLStyleElement = document.createElement('style');
style.textContent = /* css */ `
body {
  padding: 0;
  margin: 0;
  overflow: hidden;
}
canvas {
  width: 100vw;
  height: 100dvh;
  image-rendering: pixelated;
}
`;
document.body.appendChild(style);

let scale = 2;

const canvas: HTMLCanvasElement = document.createElement('canvas');
document.body.appendChild(canvas);
const w = round(screen.availWidth / scale);
const h = round(screen.availHeight / scale);
canvas.width = w;
canvas.height = h;
const context = canvas.getContext('2d');
const imageData = context.createImageData(w, h);

function render() {
  context.putImageData(imageData, 0, 0);
}

const R = 0;
const G = 1;
const B = 2;
const A = 3;

function clear() {
  for (let i = 0; i < imageData.data.length; i += 4) {
    imageData.data[i + R] = 0;
    imageData.data[i + G] = 0;
    imageData.data[i + B] = 0;
    imageData.data[i + A] = 255;
  }
}

type Color = [rgb, oklab];

/**
 * x -> y -> peers color
 * unoccupied cells
 * */
let spaces: Color[][][];

/**
 * x -> y -> used or not
 */
let used_spaces: number[][] = [];

function setPixel(x: number, y: number) {
  let color: Color = [{ ...rgb }, { ...oklab }];

  // dispatch current color to nearby spaces
  let peers = [
    [x, y + 1],
    [x, y - 1],
    [x + 1, y],
    [x - 1, y],
    [x + 1, y + 1],
    [x + 1, y - 1],
    [x - 1, y + 1],
    [x - 1, y - 1],
  ];
  for (let xy of peers) {
    let [x, y] = xy;
    if (x < 0 || y < 0) continue;
    if (x == w || y == h) continue;
    if (used_spaces[x][y]) continue;
    if (!spaces[x]) {
      spaces[x] = [];
    }
    if (!spaces[x][y]) {
      spaces[x][y] = [];
    }
    spaces[x][y].push(color);
  }
  delete spaces[x][y];
  used_spaces[x][y] = 1;

  const offset = (x + y * w) * 4;
  imageData.data[offset + R] = rgb.r;
  imageData.data[offset + G] = rgb.g;
  imageData.data[offset + B] = rgb.b;
  // imageData.data[offset + A] = 255;
}

let isStop = false;
let domStop = window.stop;

function stop() {
  isStop = true;
  if (stop !== domStop) {
    domStop();
  }
}

function resume() {
  isStop = false;
  loop();
}

// r -> g -> b -> used
let used_color: number[][][];

let rgb = new_rgb();
let oklab = new_oklab();

function nextColor(): void {
  for (;;) {
    let r = Math.floor(Math.random() * 256);
    let g = Math.floor(Math.random() * 256);
    let b = Math.floor(Math.random() * 256);
    if (used_color[r][g][b]) {
      continue;
    }
    used_color[r][g][b] = 1;
    rgb.r = r;
    rgb.g = g;
    rgb.b = b;
    rgb_to_oklab(rgb, oklab);
    return;
  }
}

let batchSize = 64;
function update() {
  let start = Date.now();
  for (let i = 0; i < batchSize; i++) {
    nextColor();
    let L = oklab.L;
    let a = oklab.a;
    let b = oklab.b;
    // let r = rgb.r
    // let g = rgb.g
    // let b = rgb.b
    let min_dist = Number.MAX_SAFE_INTEGER;
    let min_x: number;
    let min_y: number;
    spaces.forEach((ys, x) =>
      ys.forEach((colors, y) => {
        let maxDist = 0;
        let weight = colors.length ** 3;
        colors.forEach((color) => {
          let [rgb, oklab] = color;
          let dist_L = L - oklab.L;
          let dist_a = a - oklab.a;
          let dist_b = b - oklab.b;
          let dist = dist_L * dist_L + dist_a * dist_a + dist_b * dist_b;
          // let dist_r = r - rgb.r
          // let dist_g = g - rgb.g
          // let dist_b = b - rgb.b
          // let dist = dist_r * dist_r + dist_g * dist_g + dist_b * dist_b
          if (dist > maxDist) {
            maxDist = dist;
          }
        });
        let dist = maxDist / weight;
        if (dist < min_dist || (dist == min_dist && Math.random() < 3 / 8)) {
          min_dist = dist;
          min_x = x;
          min_y = y;
        }
      }),
    );
    if (min_x == undefined) {
      break;
    }
    setPixel(min_x, min_y);
  }
  let end = Date.now();
  let passed = end - start;
  let targetFPS = 10;
  let targetInterval = 1000 / targetFPS;
  if (passed > targetInterval && batchSize > 1) {
    batchSize--;
  } else if (passed < targetInterval) {
    batchSize++;
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
  clear();

  used_color = new Array(256);
  for (let r = 0; r < 256; r++) {
    used_color[r] = new Array(256);
    for (let g = 0; g < 256; g++) {
      used_color[r][g] = new Array(256).fill(0);
    }
  }

  used_spaces = new Array(w);
  for (let x = 0; x < w; x++) {
    used_spaces[x] = new Array(h).fill(0);
  }

  spaces = [];

  nextColor();
  setPixel(round(w / 2), round(h / 2));

  resume();
}

Object.assign(window, { start, resume, stop });

canvas.onclick = () => {
  if (isStop) {
    resume();
  } else {
    stop();
  }
};

start();
