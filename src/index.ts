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

const { round } = Math;
const halfH = round(h / 2);
const halfW = round(w / 2);
/**
 * x -> y -> rgb
 * */
let xy_rgb: rgb[][];
/**
 * r -> g -> b -> xy
 * */
let rgb_xy: [number, number][][][];
let spaces: xy[];

function setPixel(x: number, y: number, color: rgb) {
  let [r, g, b] = color;
  xy_rgb[x][y] = color;
  rgb_xy[r][g][b] = [x, y];
  for (let xy of [
    [x, y + 1],
    [x, y - 1],
    [x + 1, y],
    [x - 1, y],
  ]) {
    let [x, y] = xy;
    if (!xy_rgb[x][y]) {
      spaces.push([x, y]);
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

function square(x: number): number {
  return x * x;
}

function rgbDiff(x: rgb, y: rgb): number {
  return square(x[R] - y[R]) +
    square(x[G] - y[G]) +
    square(x[B] - y[B]);
}

function nextColor(): rgb {
  return [
    genValue(255),
    genValue(255),
    genValue(255),
  ];
}

function genNearBy(x: number, y: number): xy[] {
  return [
    [x, y + 1],
    [x, y - 1],
    [x + 1, y],
    [x - 1, y],
  ];
}

function update() {
  for (let i = 0; i < 64; i++) {
    let xyIdx = genValue(spaces.length - 1);
    let [space_xy] = spaces.splice(xyIdx, 1);
    let [space_x, space_y] = space_xy;
    let minD = Number.MAX_SAFE_INTEGER;
    let minRGB: rgb;
    for (let [x, y] of genNearBy(space_x, space_y)) {
      let c = xy_rgb[x][y];
      if (!c) {
        continue;
      }
      for (let j = 0; j < 1024; j++) {
        let rgb = nextColor();
        let d = rgbDiff(c, rgb);
        if (d < minD) {
          minD = d;
          minRGB = rgb;
        }
      }
    }
    if (!minRGB) {
      continue;
    }
    setPixel(space_x, space_y, minRGB);
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

Object.assign(window, { start, resume, stop, stopNext });

canvas.onclick = () => {
  if (isStop) {
    resume();
  } else {
    stop();
  }
};

start();
