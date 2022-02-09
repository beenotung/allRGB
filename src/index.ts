import { best, GaIsland } from 'ga-island'

const { sqrt, round, floor, ceil, random, min, max } = Math

const canvas: HTMLCanvasElement = document.querySelector('canvas#allrgb')
const rect = canvas.getBoundingClientRect()
let scale = 15
const w = floor(rect.width / scale)
const h = floor(rect.height / scale)
canvas.width = w
canvas.height = h
console.log({ w, h })
const context = canvas.getContext('2d')
const imageData = context.createImageData(w, h)

canvas.onclick = () => {
  running = !running
  if (running) {
    loop()
  }
}

type Gene = {
  imageData: ImageData
}

const ga = new GaIsland<Gene>({
  populationSize: 50,
  randomIndividual: () => {
    let imageData = context.createImageData(w, h)
    let n = w * h * 4
    for (let i = 0; i < n; i += 4) {
      imageData.data[i + 0] = floor(random() * 256)
      imageData.data[i + 1] = floor(random() * 256)
      imageData.data[i + 2] = floor(random() * 256)
      imageData.data[i + 3] = 255
    }
    return { imageData }
  },
  fitness: gene => {
    let acc = 0
    let n = w * h * 4
    for (let i = 1; i < n; i++) {
      let d = gene.imageData.data[i] - gene.imageData.data[i - 1]
      acc += d
    }
    return acc
  },
  mutate: (input, output) => {
    let n = w * h * 4
    let rate = 0.03
    for (let i = 1; i < n; i++) {
      output.imageData.data[i] = input.imageData.data[i]
      if (random() < rate) {
        if (random() < 0.99) {
          let t = output.imageData.data[i]
          output.imageData.data[i] = output.imageData.data[i - 1]
          output.imageData.data[i - 1] = t
        } else {
          output.imageData.data[i] = floor(random() * 256)
        }
      }
    }
  },
  crossover: (a, b, c) => {
    let n = w * h * 4
    let rate = 0.2
    for (let i = 0; i < n; i += 4) {
      for (let j = 0; j < 3; j++) {
        let x = a.imageData.data[i + j]
        if (random() < rate) {
          let y = b.imageData.data[i + j]
          x = floor((x + y) / 2)
          // x = y
        }
        c.imageData.data[i + j] = x
      }
    }
  },
})

Object.assign(window, { ga, imageData })

let gen = 0
let running = true
function loop() {
  if (!running) return
  gen++
  ga.evolve()
  let { gene, fitness } = best(ga.options)
  console.log({ gen, fitness })
  let n = w * h * 4
  for (let i = 0; i < n; i += 4) {
    imageData.data[i + 0] = gene.imageData.data[i + 0]
    imageData.data[i + 1] = gene.imageData.data[i + 1]
    imageData.data[i + 2] = gene.imageData.data[i + 2]
    imageData.data[i + 3] = 255
  }
  context.putImageData(imageData, 0, 0)
  requestAnimationFrame(loop)
}
loop()
