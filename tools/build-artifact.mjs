// Packs the Vite build into one self-contained HTML file.
//
// The Artifact host wraps the file in its own <!doctype>/<head>/<body>, so this
// emits page content only: the font <link>, an inline <style>, the markup, and
// the whole bundle inline. Nothing is fetched at runtime except the webfont,
// which has a real fallback stack.

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'

const dist = 'dist'
const html = readFileSync(join(dist, 'index.html'), 'utf8')

const cssHref = html.match(/href="([^"]*\.css)"/)[1]
const jsSrc = html.match(/src="([^"]*\.js)"/)[1]
const css = readFileSync(join(dist, cssHref.replace(/^\.?\//, '')), 'utf8')
const js = readFileSync(join(dist, jsSrc.replace(/^\.?\//, '')), 'utf8')

const body = html
  .slice(html.indexOf('<body>') + 6, html.indexOf('</body>'))
  .replace(/<script[^>]*><\/script>/g, '')
  .trim()

const font = html.match(/<link rel="stylesheet" href="https:\/\/fonts[^>]*>/)[0]

const out = `<title>Mallwalker</title>
${font}
<style>
${css}
</style>

${body}

<script type="module">
${js}
</script>
`

mkdirSync('artifact', { recursive: true })
writeFileSync('artifact/mallwalker.html', out)
console.log(`artifact/mallwalker.html — ${(out.length / 1024).toFixed(0)} KB`)
