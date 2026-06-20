// ============================================
// DEWA — C2-Style QR Code Generator (Dot Matrix)
// Inspired by QRBTF C2 "1/3 pixel dot matrix"
// ============================================
import QRCode from "qrcode";

interface QRC2Options {
  url: string;
  size?: number;
  fgColor?: string;
  bgColor?: string;
}

// Generate QR matrix from URL
async function getQRMatrix(url: string): Promise<boolean[][]> {
  const qr = QRCode.create(url, { errorCorrectionLevel: "M" });
  const size = qr.modules.size;
  const data = qr.modules.data;
  const matrix: boolean[][] = [];
  for (let y = 0; y < size; y++) {
    const row: boolean[] = [];
    for (let x = 0; x < size; x++) {
      row.push(data[y * size + x] === 1);
    }
    matrix.push(row);
  }
  return matrix;
}

// Check if a position is inside a finder pattern
function isFinderPattern(x: number, y: number, size: number): boolean {
  // Top-left finder
  if (x < 7 && y < 7) return true;
  // Top-right finder
  if (x >= size - 7 && y < 7) return true;
  // Bottom-left finder
  if (x < 7 && y >= size - 7) return true;
  return false;
}

// Seeded pseudo-random for deterministic rendering
function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

// Render the C2 dot-matrix style as SVG string
export async function generateC2QRSvg(options: QRC2Options): Promise<string> {
  const { url, size = 200, fgColor = "#000000", bgColor = "#ffffff" } = options;
  const matrix = await getQRMatrix(url);
  const modules = matrix.length;
  const cellSize = size / modules;
  const rand = seededRandom(42);

  let svgParts: string[] = [];
  svgParts.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">`);
  svgParts.push(`<rect width="${size}" height="${size}" fill="${bgColor}"/>`);

  for (let y = 0; y < modules; y++) {
    for (let x = 0; x < modules; x++) {
      const cx = x * cellSize + cellSize / 2;
      const cy = y * cellSize + cellSize / 2;

      if (isFinderPattern(x, y, modules)) {
        // Draw finder patterns as classic squares
        if (matrix[y][x]) {
          svgParts.push(`<rect x="${x * cellSize}" y="${y * cellSize}" width="${cellSize}" height="${cellSize}" fill="${fgColor}"/>`);
        }
        continue;
      }

      if (matrix[y][x]) {
        // C2 dot-matrix: split each module into 3x3 sub-dots
        const subSize = cellSize / 3;
        for (let sy = 0; sy < 3; sy++) {
          for (let sx = 0; sx < 3; sx++) {
            const r = rand();
            // Probability of drawing a sub-dot varies — more in center, less at edges
            const distFromCenter = Math.abs(sx - 1) + Math.abs(sy - 1);
            const prob = distFromCenter === 0 ? 0.95 : distFromCenter === 1 ? 0.7 : 0.45;
            if (r < prob) {
              const dotX = x * cellSize + sx * subSize;
              const dotY = y * cellSize + sy * subSize;
              const dotR = subSize * (0.35 + r * 0.3);
              svgParts.push(`<circle cx="${dotX + subSize / 2}" cy="${dotY + subSize / 2}" r="${dotR}" fill="${fgColor}"/>`);
            }
          }
        }
      } else {
        // Sparse noise dots in empty areas for the "dusty" C2 effect
        const r = rand();
        if (r < 0.06) {
          const subSize = cellSize / 3;
          const sx = Math.floor(rand() * 3);
          const sy = Math.floor(rand() * 3);
          const dotX = x * cellSize + sx * subSize + subSize / 2;
          const dotY = y * cellSize + sy * subSize + subSize / 2;
          svgParts.push(`<circle cx="${dotX}" cy="${dotY}" r="${subSize * 0.2}" fill="${fgColor}" opacity="0.3"/>`);
        }
      }
    }
  }

  svgParts.push(`</svg>`);
  return svgParts.join("");
}

// React component for easy embedding
export function QRC2Image({ svgString, className }: { svgString: string; className?: string }) {
  return (
    <div
      className={className}
      dangerouslySetInnerHTML={{ __html: svgString }}
      style={{ lineHeight: 0 }}
    />
  );
}
