// Generates Rolla brand icons (app icon, adaptive icon, splash, favicon) as PNGs
// using pngjs (no native deps). Run: node scripts/generate-icon.js
const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');

// Brand colors
const FOREST = [26, 60, 43];   // #1A3C2B
const GOLD = [212, 160, 23];   // #D4A017
const CREAM = [250, 246, 238]; // #FAF6EE

function mix(a, b, t) {
  return [
    Math.round(a[0] + (b[0] - a[0]) * t),
    Math.round(a[1] + (b[1] - a[1]) * t),
    Math.round(a[2] + (b[2] - a[2]) * t),
  ];
}

/**
 * Draw the Rolla mark: a stylized gold pot (rounded body + rim + two handles)
 * centered on a forest-green field. `transparentBg` leaves the background clear
 * (for Android adaptive foreground).
 */
function renderIcon(size, opts = {}) {
  const { transparentBg = false, bg = FOREST, scale = 1 } = opts;
  const png = new PNG({ width: size, height: size });
  const cx = size / 2;
  const cy = size / 2;

  // Pot geometry (relative to size)
  const bodyW = size * 0.44 * scale;
  const bodyH = size * 0.40 * scale;
  const bodyTop = cy - bodyH * 0.30;
  const bodyBottom = bodyTop + bodyH;
  const rimW = size * 0.54 * scale;
  const rimH = size * 0.10 * scale;
  const rimTop = bodyTop - rimH * 0.7;
  const handleR = size * 0.10 * scale;
  const fillTopRatio = 0.42; // gold "savings" fill rises from bottom

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (size * y + x) << 2;
      let color = null;
      let alpha = 255;

      // Background
      if (transparentBg) {
        alpha = 0;
      } else {
        // subtle vertical gradient on the forest field
        const t = y / size;
        color = mix(bg, [18, 44, 31], t * 0.6);
        alpha = 255;
      }

      const dxBody = x - cx;

      // Handles (rings on each side of the body)
      const handleY = bodyTop + bodyH * 0.30;
      for (const side of [-1, 1]) {
        const hx = cx + side * (bodyW / 2 + handleR * 0.3);
        const d = Math.sqrt((x - hx) ** 2 + (y - handleY) ** 2);
        if (d <= handleR && d >= handleR * 0.55) {
          color = GOLD;
          alpha = 255;
        }
      }

      // Pot body: rounded-bottom capsule
      const halfBodyW = bodyW / 2;
      if (y >= bodyTop && y <= bodyBottom && Math.abs(dxBody) <= halfBodyW) {
        // round the bottom corners
        const bottomCurve = bodyBottom - halfBodyW * 0.5;
        let inside = true;
        if (y > bottomCurve) {
          const ry = halfBodyW * 0.5;
          const ny = (y - bottomCurve) / ry;
          const maxX = halfBodyW * Math.sqrt(Math.max(0, 1 - ny * ny));
          inside = Math.abs(dxBody) <= maxX;
        }
        if (inside) {
          // gold fill vs darker pot wall
          const fillLine = bodyBottom - bodyH * fillTopRatio;
          if (y >= fillLine) {
            color = GOLD; // savings fill
          } else {
            color = mix(GOLD, FOREST, 0.15); // pot interior (slightly muted gold)
          }
        }
      }

      // Rim (rounded bar across the top of the body)
      if (y >= rimTop && y <= rimTop + rimH && Math.abs(dxBody) <= rimW / 2) {
        const ry = rimH / 2;
        const ny = (y - (rimTop + ry)) / ry;
        const maxX = (rimW / 2) * Math.sqrt(Math.max(0, 1 - ny * ny * 0.3));
        if (Math.abs(dxBody) <= maxX) {
          color = GOLD;
          alpha = 255;
        }
      }

      // Coin above the rim (small circle)
      const coinR = size * 0.07 * scale;
      const coinY = rimTop - coinR * 1.4;
      const dc = Math.sqrt((x - cx) ** 2 + (y - coinY) ** 2);
      if (dc <= coinR) {
        color = CREAM;
        alpha = 255;
      } else if (dc <= coinR * 1.15) {
        color = GOLD;
        alpha = 255;
      }

      if (color === null) {
        // leave background (already handled) — but ensure write
        if (transparentBg) {
          png.data[idx] = 0;
          png.data[idx + 1] = 0;
          png.data[idx + 2] = 0;
          png.data[idx + 3] = 0;
          continue;
        }
        color = mix(bg, [18, 44, 31], (y / size) * 0.6);
      }

      png.data[idx] = color[0];
      png.data[idx + 1] = color[1];
      png.data[idx + 2] = color[2];
      png.data[idx + 3] = alpha;
    }
  }
  return png;
}

function save(png, file) {
  const out = path.resolve(__dirname, '../assets/images', file);
  fs.writeFileSync(out, PNG.sync.write(png));
  console.log('wrote', file);
}

// App icon (1024) — full forest bg
save(renderIcon(1024, { transparentBg: false }), 'icon.png');
// Adaptive icon foreground (1024) — transparent bg, larger safe-area scale
save(renderIcon(1024, { transparentBg: true, scale: 0.78 }), 'adaptive-icon.png');
// Splash (1024) — forest bg, smaller mark
save(renderIcon(1024, { transparentBg: true, scale: 0.9 }), 'splash-icon.png');
// Favicon (48)
save(renderIcon(48, { transparentBg: false }), 'favicon.png');

console.log('Done generating Rolla icons.');
