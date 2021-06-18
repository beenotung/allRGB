const R = 0
const G = 1
const B = 2
const A = 3
const FULL = 255
const PIXEL = 8
const targetFPS = 3
const targetInterval = 1000 / targetFPS
const { random, floor, min } = Math
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
const context = canvas.getContext('2d')
let W: number = 32
let H: number = 32
let image = context.createImageData(W, H)
function resize() {
  W = floor(window.innerWidth / PIXEL)
  H = floor(window.innerHeight / PIXEL)
  canvas.width = W
  canvas.height = H
  const newImage = context.createImageData(W, H)
  for (let y = 0; y < H; y++) {
    const oldY = floor((y / H) * image.height)
    for (let x = 0; x < W; x++) {
      const oldX = floor((x / W) * image.width)
      const newI = toIndex(x, y, W)
      const oldI = toIndex(oldX, oldY, image.width)
      newImage.data[newI + G] = image.data[oldI + G]
      newImage.data[newI + B] = image.data[oldI + B]
      newImage.data[newI + A] = image.data[oldI + A]
    }
  }
  image = newImage
}
window.addEventListener('resize', resize)
resize()

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

function place(
  r: number,
  g: number,
  b: number,
  x: number,
  y: number,
  offset: number,
) {
  for (;;) {
    image.data[offset + R] = r
    image.data[offset + G] = g
    image.data[offset + B] = b
    image.data[offset + A] = FULL
    for (const dy of [-1, 0, 1]) {
      const edgeY = y + dy
      for (const dx of [-1, 0, 1]) {
        const edgeX = x + dx
        const edgeOffset = toIndex(edgeX, edgeY, W)
        if (image.data[edgeOffset + A] !== FULL) {
          edges.push(edgeOffset)
        }
      }
    }
    return
  }
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
  const { r, g, b } = nextColor()
  let minEdgeD2 = MAX_SAFE_INTEGER
  let minOffset = 0
  let minX = 0
  let minY = 0
  let minEdgeIndex = 0
  edges.forEach((offset, edgeIndex) => {
    const { x, y } = fromIndex(offset, W)
    for (const dy of [-1, 0, 1]) {
      const edgeY = y + dy
      for (const dx of [-1, 0, 1]) {
        if (dy === 0 && dx === 0) continue
        const edgeX = x + dx
        const edgeOffset = toIndex(edgeX, edgeY, W)
        if (image.data[edgeOffset + A] === FULL) {
          const dr = image.data[edgeOffset + R] - r
          const dg = image.data[edgeOffset + G] - g
          const db = image.data[edgeOffset + B] - b
          const d2 = dr * dr + dg * dg + db * db
          if (d2 < minEdgeD2) {
            minEdgeD2 = d2
            minOffset = offset
            minX = x
            minY = y
            minEdgeIndex = edgeIndex
          }
        }
      }
    }
  })
  if (minEdgeD2 != MAX_SAFE_INTEGER) {
    edges.splice(minEdgeIndex, 1)
    place(r, g, b, minX, minY, minOffset)
  }
}

let lastTime = Date.now()
let batchSize = 1000
function draw() {
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
