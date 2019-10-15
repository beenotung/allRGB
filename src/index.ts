document.title = 'allrgb';

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
const w = (canvas.width = 400 * 0 || screen.availWidth);
const h = (canvas.height = 400 * 0 || screen.availHeight);
const context = canvas.getContext('2d');
const imageData = context.createImageData(w, h);

function render() {
  context.putImageData(imageData, 0, 0);
}

function clear() {
  for (let i = 0; i < imageData.data.length; i++) {
    imageData.data[i] = i % 4 === 3 ? 255 : 0;
  }
}

const R = 0;
const G = 1;
const B = 2;
const A = 3;

type rgb = [number, number, number];
type xy = [number, number];

const {round} = Math;
const halfH = round(h / 2);
const halfW = round(w / 2);
/**
 * x -> y -> rgb
 * */
let xy_rgb: rgb[][];
/**
 * r -> g -> b -> xy
 * */
let rgb_xy: xy[][][];
/**
 * x -> y -> rgb
 * opposite to xy_rgb, that store occupied cells, this store unoccupied cells
 * */
let spaces: rgb[][];

function setPixel(x: number, y: number, color: rgb) {
  let [r, g, b] = color;
  if (xy_rgb[x]) {
    xy_rgb[x][y] = color;
  } else {
    let ys = xy_rgb[x] = [];
    ys[y] = color
  }
  rgb_xy[r][g][b] = [x, y];
  if (spaces[x]) {
    delete spaces[x][y];
  }
  // find nearby spaces
  for (let xy of [
    [x, y + 1],
    [x, y - 1],
    [x + 1, y],
    [x - 1, y],
  ]) {
    let [x, y] = xy;
    if (x < 0 || x > w || y < 0 || y > h) {
      continue
    }
    if (xy_rgb[x] && xy_rgb[x][y]) {
      continue
    }
    if (!spaces[x]) {
      let ys = spaces[x] = [];
      ys[y] = [color]
    } else {
      spaces[x][y] = color
    }
  }
  const offset = (x + y * w) * 4;
  imageData.data[offset + R] = r;
  imageData.data[offset + G] = g;
  imageData.data[offset + B] = b;
  // imageData.data[offset + A] = 255;
}

let isStop = true;
let isStopNext = false;
let domStop = window.stop;

function stop() {
  isStop = true;
  domStop();
}

/**
 * @return 0..n
 * */
function genValue(n: number): number {
  return Math.round(Math.random() * n);
}

function rgbDiff(x: rgb, y: rgb): number {
  let r = x[0] - y[0];
  let g = x[1] - y[1];
  let b = x[2] - y[2];
  return r * r + g * g + b * b;
}

let lastR = genValue(255);
let lastG = genValue(255);
let lastB = genValue(255);

let colorDiff = 16;
let colorDiff2 = colorDiff * 2;

function nextColor(): rgb {
  for (; ;) {
    let r = lastR + genValue(colorDiff2) - colorDiff;
    let g = lastG + genValue(colorDiff2) - colorDiff;
    let b = lastB + genValue(colorDiff2) - colorDiff;
    r = (r + 256) % 256;
    g = (g + 256) % 256;
    b = (b + 256) % 256;
    if (!rgb_xy[r][g][b]) {
      lastR = r;
      lastG = g;
      lastB = b;
      return [r, g, b]
    }
  }
}

function update() {
  for (let i = 0; i < 64; i++) {
    let rgb = nextColor();
    let minD = Number.MAX_SAFE_INTEGER;
    let minSpace: xy;
    spaces.forEach((ys, x) =>
      ys.forEach((c, y) => {
          let d = rgbDiff(c, rgb);
          if (d == minD && Math.random() < 0.5) {
            minSpace = [x, y]
          } else if (d < minD) {
            minD = d;
            minSpace = [x, y]
          }
        }
      )
    );
    if (!minSpace) {
      continue
    }
    let [x, y] = minSpace
    setPixel(x, y, rgb);
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
  spaces = [];
  xy_rgb = new Array(w);
  for (let x = 0; x < w; x++) {
    xy_rgb[x] = new Array(h);
  }
  rgb_xy = new Array(256);
  for (let r = 0; r < 256; r++) {
    rgb_xy[r] = new Array(256);
    for (let g = 0; g < 256; g++) {
      rgb_xy[r][g] = new Array(256);
    }
  }
  let color = nextColor();
  clear();
  setPixel(halfW, halfH, color);
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

Object.assign(window, {start, resume, stop, stopNext});

canvas.onclick = () => {
  if (isStop) {
    resume();
  } else {
    stop();
  }
};

start();
