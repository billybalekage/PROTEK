
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

// Symbole PROTECK, version pour fond bleu nuit (en-tête des emails)
const MARK_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="-2 -2 83 109">
  <path fill="#4D94F0" d="M1 26 Q1 19.5 7 19.5 H12 V36 Q12 52 21 60 Q26 64.5 33 65 V105 H20 Q1 101 1 80 Z"/>
  <path fill="#F5A524" d="M13 0 H52 Q78.5 0 78.5 27 V50 Q78.5 65 63 65 H36 V47 H48 Q56 47 56 38 Q56 17 40 17 H13 Z"/>
</svg>`;

const OUTPUT_DIR = path.join(__dirname, '..', 'shared', 'emails', 'assets');
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'proteck-mark.png');

async function main() {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  await sharp(Buffer.from(MARK_SVG), { density: 600 }) // densité élevée = bords nets
    .resize(120, 160, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 }, // fond transparent
    })
    .png()
    .toFile(OUTPUT_FILE);

  console.log(`✓ Logo généré : ${OUTPUT_FILE}`);
}

main().catch((err) => {
  console.error('✕ Échec de la génération :', err.message);
  process.exit(1);
});