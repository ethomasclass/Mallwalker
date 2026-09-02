// Dev helper: drop the camera at a list of viewpoints and screenshot each one.
//
//   npx vite preview --port 4173 &
//   node tools/shoot.mjs out-dir '[["court", 92.8, 153, 1.57, 0]]'
//
// Viewpoint tuple: [name, x, z, yaw, pitch]

import { chromium } from 'playwright'

const outDir = process.argv[2] || '.'
const views = JSON.parse(process.argv[3] || '[]')
const url = process.env.MALL_URL || 'http://localhost:4173/'

const browser = await chromium.launch({
  // The sandbox ships a pinned Chromium that may not match the npm package.
  executablePath: process.env.CHROMIUM_PATH || undefined,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
})
const page = await browser.newPage({ viewport: { width: 1100, height: 640 } })
page.on('console', (m) => console.log('[console]', m.text()))
page.on('pageerror', (e) => console.log('[error]', e.message))

await page.goto(url, { waitUntil: 'networkidle' })
await page.waitForFunction(() => !document.getElementById('start').disabled, { timeout: 120000 })
console.log('build:', (await page.textContent('#loading')).trim())

await page.evaluate(() => document.getElementById('overlay').classList.add('hidden'))

for (const [name, x, z, yaw, pitch] of views) {
  await page.evaluate(([x, z, yaw, pitch]) => {
    const { player } = window.mall
    player.pos.x = x; player.pos.z = z; player.pos.y = 0.01
    player.yaw = yaw; player.pitch = pitch
    player.update(0.016, { forward: 0, strafe: 0, run: false, jump: false })
  }, [x, z, yaw, pitch])
  await page.waitForTimeout(200)
  await page.screenshot({ path: `${outDir}/${name}.png` })
  const where = await page.evaluate(([x, z]) => window.mall.locate(x, z).zone, [x, z])
  console.log('shot', name, '->', where)
}

await browser.close()
