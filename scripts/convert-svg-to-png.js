const fs = require('fs')
const path = require('path')
const { Resvg } = require('@resvg/resvg-js')

async function main(){
  const repoRoot = path.resolve(__dirname, '..')
  // Allow passing input and output paths via CLI: node convert-svg-to-png.js <input.svg> <output.png>
  const inputArg = process.argv[2] || path.join(repoRoot, 'docs', 'architecture.svg')
  const outputArg = process.argv[3] || path.join(repoRoot, 'docs', path.basename(inputArg, path.extname(inputArg)) + '.png')

  const svgPath = path.isAbsolute(inputArg) ? inputArg : path.join(repoRoot, inputArg)
  const outPath = path.isAbsolute(outputArg) ? outputArg : path.join(repoRoot, outputArg)

  if (!fs.existsSync(svgPath)){
    console.error('SVG not found at', svgPath)
    process.exit(1)
  }

  const svg = fs.readFileSync(svgPath, 'utf8')

  // Render at 2000px width for high-resolution output
  const resvg = new Resvg(svg, { fitTo: { mode: 'width', value: 2000 } })
  const pngData = resvg.render()
  const pngBuffer = pngData.asPng()

  fs.writeFileSync(outPath, pngBuffer)
  console.log('Wrote PNG:', outPath)
}

main().catch(err => { console.error(err); process.exit(1) })
