const { round, floor, ceil, random, min, max } = Math

const canvas: HTMLCanvasElement = document.querySelector('canvas#allrgb')
const rect = canvas.getBoundingClientRect()
const w = floor(rect.width)
const h = floor(rect.height)
canvas.width = w
canvas.height = h
console.log({ w, h })
const context = canvas.getContext('2d')
const imageData = context.createImageData(w, h)

const n_trial = 32
const range = 5
const range2 = range * range
const fps = 30
const maxBatch = 64
const min_peer = 2

const timePerFrame = 1000 / fps

function render() {
  context.putImageData(imageData, 0, 0)
}

function clear() {
  for (let i = 0; i < imageData.data.length; i++) {
    imageData.data[i] = i % 4 === 3 ? 255 : 0
  }
}

const R = 0
const G = 1
const B = 2
const A = 3

type rgb = [number, number, number]
type xy = [number, number]

const halfH = round(h / 2)
const halfW = round(w / 2)

interface Cell {
  offset: number
  color?: rgb
  peers: { d: number; cell: Cell }[]
}

let all_cells: Cell[] = []
let edge_cells: Cell[] = []
let edge_cell_keys: (string | number)[] = []
let new_colors: rgb[] = []
let color_i = 0
let batch = 1

let isStop = true
let isStopNext = false
let domStop = window.stop

function stop() {
  if (isStop) {
    return
  }
  isStop = true
  domStop()
}

let win = window as any

/**
 * @return 0..n
 * */
function genValue(n: number): number {
  return Math.round(Math.random() * n)
}

function rgbDiff(x: rgb, y: rgb): number {
  const r = x[0] - y[0]
  const g = x[1] - y[1]
  const b = x[2] - y[2]
  return r * r + g * g + b * b
}

let lastR = genValue(255)
let lastG = genValue(255)
let lastB = genValue(255)

let colorDiff = 16
let colorDiff2 = colorDiff * 2

function nextColor(): rgb {
  if (new_colors.length == 0) {
    throw new Error('no available colors')
  }
  color_i = color_i % new_colors.length
  const color = new_colors[color_i]
  color_i++
  return color
}

function useColor(color: rgb) {
  let i = new_colors.indexOf(color)
  new_colors.splice(i, 1)
}

function addEdgeCell(cell: Cell) {
  if (cell.color) {
    return
  }
  let key = cell.offset
  if (edge_cells[key]) {
    return
  }
  edge_cells[cell.offset] = cell
  edge_cell_keys.push(key)
}

function addPeerEdgeCell(cell: Cell) {
  let i = all_cells.indexOf(cell)
  let peers = [
    all_cells[i + 1],
    all_cells[i - 1],
    all_cells[i + w],
    all_cells[i - w],
  ]
  for (let peer of peers) {
    if (peer) {
      addEdgeCell(peer)
    }
  }
}

function nextEdgeCell() {
  let n = edge_cell_keys.length
  if (n == 0) {
    return
  }
  // let i = floor(random() * n)
  // let i = floor(n/2)
  // let i = floor(n/3*2)
  let i = n - 256
  if (i < 0) {
    i = 0
  }
  // let i = n - 1
  let key = edge_cell_keys[i]
  let cell = edge_cells[key]
  delete edge_cells[key]
  edge_cell_keys.splice(i, 1)
  return cell
}

function update(): 'end' | 'continue' {
  const start = Date.now()
  for (let i = 0; i < batch; i++) {
    let cell = nextEdgeCell()
    if (!cell) {
      console.log('no edge cells')
      return 'end'
    }

    let min_d = Number.MAX_VALUE
    let min_color: rgb

    for (let i = 0; i < n_trial; i++) {
      const color = nextColor()
      let total_d = 0
      let peer_count = 0
      cell.peers.forEach((peer) => {
        if (!peer.cell.color) {
          return
        }
        const r = color[0] - peer.cell.color[0]
        const g = color[1] - peer.cell.color[1]
        const b = color[2] - peer.cell.color[2]
        let d = r * r + g * g + b * b
        d *= peer.d ** 2
        total_d += d
        peer_count++
      })
      if (peer_count == 0) {
        console.error('no peer?')
        return 'end'
      }
      const d = total_d / peer_count
      if (d < min_d) {
        min_d = d
        min_color = color
      }
    }

    addPeerEdgeCell(cell)

    cell.color = min_color
    const offset = cell.offset
    imageData.data[offset + 0] = min_color[0]
    imageData.data[offset + 1] = min_color[1]
    imageData.data[offset + 2] = min_color[2]
    useColor(min_color)
  }
  const end = Date.now()
  const time = (end - start) / 1000
  const timePerRun = time / batch
  batch = ceil(timePerFrame / timePerRun)
  if (batch > maxBatch) {
    batch = maxBatch
  }
}

function loop() {
  if (isStop) {
    return
  }
  const result = update()
  render()
  if (result == 'end') {
    console.log('end loop')
    return
  }
  requestAnimationFrame(loop)
}

function start() {
  let offset = 0

  let all_colors: rgb[] = []
  let used_colors: number[] = []
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      all_cells.push({ offset, peers: [] })
      offset += 4
      for (;;) {
        const r = floor(random() * 256)
        const g = floor(random() * 256)
        const b = floor(random() * 256)
        const i = (r << 16) | (g << 8) | b
        if (!used_colors[i]) {
          used_colors[i] = 1
          all_colors.push([r, g, b])
          break
        }
      }
    }
  }
  new_colors = all_colors

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x
      const cell = all_cells[i]

      const px_start = max(0, ceil(x - range))
      const py_start = max(0, ceil(y - range))
      const px_end = min(w - 1, floor(x + range))
      const py_end = min(h - 1, floor(y + range))
      for (let py = py_start; py <= py_end; py++) {
        for (let px = px_start; px <= px_end; px++) {
          if (px == x && py == y) {
            continue
          }
          const pi = py * w + px
          const p_cell = all_cells[pi]
          const dx = x - px
          const dy = y - py
          const d2 = dx * dx + dy * dy
          if (d2 > range2) {
            continue
          }
          cell.peers.push({ d: d2, cell: p_cell })
        }
      }
    }
  }

  clear()
  isStop = false
  isStopNext = false

  function init_place(y: number, x: number) {
    console.log('init_place', { x, y })
    let i = y * w + x
    const cell = all_cells[i]
    const offset = cell.offset
    const color = nextColor()
    cell.color = color
    addPeerEdgeCell(cell)
    imageData.data[offset + 0] = color[0]
    imageData.data[offset + 1] = color[1]
    imageData.data[offset + 2] = color[2]
  }

  // initial paint center cell
  init_place(halfH, halfW)

  // to fulfill min_peer

  // initial paint center cell (right)
  init_place(halfH, halfW + 1)

  // initial paint center cell (left)
  init_place(halfH, halfW - 1)

  // initial paint center cell (up)
  init_place(halfH - 1, halfW)

  // initial paint center cell (down)
  init_place(halfH + 1, halfW)

  loop()
}

function resume() {
  isStop = false
  isStopNext = false
  loop()
}

function stopNext() {
  isStopNext = true
}

Object.assign(window, {
  start,
  resume,
  stop,
  stopNext,
  edge_cells,
  edge_cell_keys,
  imageData,
  all_cells,
})

canvas.onclick = () => {
  if (isStop) {
    resume()
  } else {
    stop()
  }
}

console.log('start')
start()
console.log('ready')
