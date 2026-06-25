/**
 * Post-build script: inlines compiled CSS into dist/index.html as a <style> tag.
 * This guarantees CSS loads in Capacitor's Android WebView, which can silently
 * drop external <link rel="stylesheet"> requests due to missing CORS headers.
 */
import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { resolve, join } from 'path';

const distDir = resolve('dist');
const assetsDir = join(distDir, 'assets');
const indexPath = join(distDir, 'index.html');

let html = readFileSync(indexPath, 'utf-8');

// Find all CSS files in assets/
const cssFiles = readdirSync(assetsDir).filter(f => f.endsWith('.css'));

for (const cssFile of cssFiles) {
  const cssPath = join(assetsDir, cssFile);
  const css = readFileSync(cssPath, 'utf-8');
  // Replace any <link rel="stylesheet" ... href="./assets/FILENAME.css"...> with inline <style>
  const linkRe = new RegExp(`<link rel="stylesheet"[^>]*href="[^"]*${cssFile}"[^>]*>`, 'g');
  if (linkRe.test(html)) {
    html = html.replace(linkRe, `<style>\n${css}\n</style>`);
    console.log(`✓ Inlined ${cssFile} (${Math.round(css.length / 1024)}KB) into index.html`);
  }
}

writeFileSync(indexPath, html, 'utf-8');
console.log('✓ index.html updated with inline styles');
