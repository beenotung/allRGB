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

const { round, floor, random, min } = Math;
const halfH = round(h / 2);
const halfW = round(w / 2);

interface Cell {
  offset: number;
  color?: rgb;
  peers: { d: number; cell: Cell }[];
}

let all_cells: Cell[] = [];
let edge_cells: Cell[] = [];
let all_colors: rgb[] = [];
let used_colors: number[] = [];
let color_i = 0;
let batch = 64;

let isStop = true;
let isStopNext = false;
let domStop = window.stop;

function stop() {
  isStop = true;
  domStop();
}

let win = window as any;

/**
 * @return 0..n
 * */
function genValue(n: number): number {
  return Math.round(Math.random() * n);
}

function rgbDiff(x: rgb, y: rgb): number {
  const r = x[0] - y[0];
  const g = x[1] - y[1];
  const b = x[2] - y[2];
  return r * r + g * g + b * b;
}

let lastR = genValue(255);
let lastG = genValue(255);
let lastB = genValue(255);

let colorDiff = 16;
let colorDiff2 = colorDiff * 2;

function nextColor(): rgb {
  const color = all_colors[color_i];
  color_i++;
  return color;
}

function update(): 'end' | 'continue' {
  // batch = win.batch || batch
  for (let i = 0; i < batch; i++) {
    if (edge_cells.length == 0) {
      console.log('no edge cells');
      return 'end';
    }
    const color = nextColor();
    let min_i = [];
    let min_d = 256 ** 2 * 3;
    let max_peer = 0;
    // let min_peer = 3
    for (let i = 0; i < edge_cells.length; i++) {
      const cell = edge_cells[i];
      if (cell.color) {
        edge_cells.splice(i, 1);
        i--;
        continue;
      }
      let total_d = 0;
      let peer_count = 0;
      cell.peers.forEach(peer => {
        if (!peer.cell.color) retu {rn;
     }    const r = color[0] - peer.cell.color[0];
        const g = color[1] - peer.cell.color[1];
        const b = color[2] - peer.cell.color[2];
        let d = r * r + g * g + b * b;
        d *= peer.d ** 2;
        total_d += d;
        peer_count++;
      });
      if (peer_count == 0) {
        console.error('no peer?');
        return 'end';
      }
      const d = total_d / peer_count;
      if (d < min_d && peer_count >= max_peer) {
        max_peer = peer_count;
        min_i = [i];
        min_d = d;
      } else if (d == min_d) {
        min_i.push(i);
      }
    }
    if (min_i.length == 0) {
      console.error('min_i not found');
      return 'end';
    }
    const i = min_i[floor(random() * min_i.length)];
    const cell = edge_cells[i];
    edge_cells.splice(i, 1);
    cell.peers.forEach(peer => {
      if (!peer.cell.color) {
        edge_cells.push(peer.cell);
      }
    });
    cell.color = color;
    const offset = cell.offset;
    imageData.data[offset + 0] = color[0];
    imageData.data[offset + 1] = color[1];
    imageData.data[offset + 2] = color[2];
  }
}

function loop() {
  if (isStop) {
    return;
  }
  const result = update();
  render();
  if (result == 'end') {
    console.log('end loop');
    return;
  }
  requestAnimationFrame(loop);
}

function start() {
  let offset = 0;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      all_cells.push({ offset, peers: [] });
      offset += 4;
      for (;;) {
        const r = floor(random() * 256);
        const g = floor(random() * 256);
        const b = floor(random() * 256);
        const i = (r << 16) | (g << 8) | b;
        if (!used_colors[i]) {
          used_colors[i] = 1;
          all_colors.push([r, g, b]);
          break;
        }
      }
    }
  }

  const range = 3;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      const cell = all_cells[i];

      for (let dy = -range; dy <= range; dy++) {
        for (let dx = -range; dx <= range; dx++) {
          if (dx == 0 && dy == 0) cont {inue;
     }      const py = y + dy;
          if (py < 0 || py >= h) cont {inue;
     }      const px = x + dx;
          if (px < 0 || px >= w) cont {inue;
     }      const pi = py * w + px;
          const p_cell = all_cells[pi];
          const d = dx * dx + dy * dy;
          cell.peers.push({ d, cell: p_cell });
        }
      }
    }
  }

  clear();
  isStop = false;
  isStopNext = false;

  function init_place(i) {
    const cell = all_cells[i];
    const offset = cell.offset;
    const color = nextColor();
    cell.color = color;
    cell.peers.forEach(peer => edge_cells.push(peer.cell));
    imageData.data[offset + 0] = color[0];
    imageData.data[offset + 1] = color[1];
    imageData.data[offset + 2] = color[2];
  }

  // initial paint center cell
  init_place(halfH * w + halfW);

  // to fulfill min_peer

  // initial paint center cell (right)
  init_place(halfH * w + halfW + 1);

  // initial paint center cell (left)
  init_place(halfH * w + halfW - 1);

  // initial paint center cell (up)
  init_place(halfH * w + halfW - w);

  // initial paint center cell (down)
  init_place(halfH * w + halfW + w);

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

Object.assign(window, {
  start,
  resume,
  stop,
  stopNext,
  batch,
  imageData,
  all_cells,
});

canvas.onclick = () => {
  if (isStop) {
    resume();
  } else {
    stop();
  }
};

console.log('start');
start();
console.log('ready');
