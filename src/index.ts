const R = 0
const G = 1
const B = 2
const A = 3
const FULL = 255
const PIXEL = 1
const targetFPS = 15
const targetInterval = 1000 / targetFPS
const { random, floor, min, abs } = Math
const { MAX_SAFE_INTEGER } = Number

function toIndex(x: number, y: number, W: number) {
  return (y * W + x) * 4
}

function fromIndex(offset: offset, W: number) {
  let i = offset / 4
  let x = i % W
  let y = (i - x) / W
  return { x, y }
}

const canvas = document.querySelector('canvas#paint') as HTMLCanvasElement
let W = floor(window.innerWidth / PIXEL)
let H = floor(window.innerHeight / PIXEL)
canvas.width = W
canvas.height = H
const context = canvas.getContext('2d')
let image = context.createImageData(W, H)
let stopped = false
function resize() {
  console.log('resize')
  stopped = true
  location.reload()
  setTimeout(() => location.reload())
}
window.addEventListener('resize', resize)

type offset = number
type Edge = offset
const edges: Edge[] = []
const usedColors = new Array<1>(256 * 256 * 256)

function nextColor() {
  for (;;) {
    const r = floor(random() * 256)
    const g = floor(random() * 256)
    const b = floor(random() * 256)
    const code = (((r << 8) | g) << 8) | b
    if (usedColors[code]) continue
    usedColors[code] = 1
    return { r, g, b }
  }
}

function checkEmptyEdge(edgeX: number, edgeY: number) {
  if (edgeY === -1 || edgeY === H) return
  if (edgeX === -1 || edgeX === W) return
  const edgeOffset = toIndex(edgeX, edgeY, W)
  if (image.data[edgeOffset + A] !== FULL && !edges.includes(edgeOffset)) {
    edges.push(edgeOffset)
  }
}

function place(
  r: number,
  g: number,
  b: number,
  x: number,
  y: number,
  offset: number,
) {
  image.data[offset + R] = r
  image.data[offset + G] = g
  image.data[offset + B] = b
  image.data[offset + A] = FULL
  checkEmptyEdge(x, y - 1)
  checkEmptyEdge(x, y + 1)
  checkEmptyEdge(x - 1, y)
  checkEmptyEdge(x + 1, y)
}
function init() {
  const { r, g, b } = nextColor()
  const x = floor(W / 2)
  const y = floor(H / 2)
  const offset = toIndex(x, y, W)
  place(r, g, b, x, y, offset)
}
init()

function iterate() {
  if (stopped) return
  const { r, g, b } = nextColor()
  let minEdgeDiff = MAX_SAFE_INTEGER
  let minOffset = 0
  let minX = 0
  let minY = 0
  let minEdgeIndex = 0
  edges.forEach((offset, edgeIndex) => {
    const { x, y } = fromIndex(offset, W)
    let diff = 0
    let nEdge = 0
    function checkEdgeDiff(edgeX: number, edgeY: number) {
      const edgeOffset = toIndex(edgeX, edgeY, W)
      if (image.data[edgeOffset + A] === FULL) {
        nEdge++
        const dr = image.data[edgeOffset + R] - r
        const dg = image.data[edgeOffset + G] - g
        const db = image.data[edgeOffset + B] - b
        diff += abs(dr) + abs(dg) + abs(db)
        // diff += dr * dr + dg * dg + db * db
      }
    }
    checkEdgeDiff(x, y - 1)
    checkEdgeDiff(x, y + 1)
    checkEdgeDiff(x - 1, y)
    checkEdgeDiff(x + 1, y)
    diff /= nEdge
    if (diff && diff < minEdgeDiff) {
      minEdgeDiff = diff
      minOffset = offset
      minX = x
      minY = y
      minEdgeIndex = edgeIndex
    }
  })
  if (minEdgeDiff != MAX_SAFE_INTEGER) {
    edges.splice(minEdgeIndex, 1)
    place(r, g, b, minX, minY, minOffset)
  }
}

let lastTime = Date.now()
let batchSize = 1000
function draw() {
  if (stopped) {
    console.log('stopped')
    return
  }
  if (edges.length === 0) {
    console.log('no edges')
    return
  }
  let now = Date.now()
  for (let i = 0; i < batchSize; i++) {
    iterate()
  }
  let actualInterval = now - lastTime
  if (actualInterval > targetInterval) {
    batchSize *= 0.99
  } else if (actualInterval < targetInterval) {
    batchSize /= 0.99
  }
  lastTime = now
  context.putImageData(image, 0, 0)
  requestAnimationFrame(draw)
}
requestAnimationFrame(draw)
