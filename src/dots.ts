/**
 * Dot-matrix image renderer. Each grid cell becomes one dot. Dots "print" in
 * row by row the first time the canvas scrolls into view, shimmer gently, and
 * push away from the pointer.
 *
 * Two kinds of source data:
 *  - brightness only (one byte per dot): drawn in the site's warm palette
 *  - rgb (three bytes per dot): drawn in the photo's own colours
 */

export interface DotImage {
  cols: number;
  rows: number;
  rgb: boolean;
  hex: string;
  /** Draw square pixels of equal size (pixel art) instead of round dots sized by brightness. */
  square?: boolean;
}

interface Dot {
  col: number;
  row: number;
  size: number; // 0..1 share of the cell
  delay: number; // ms before this dot appears
  color: string;
}

const REVEAL_MS = 1500;
const FADE_MS = 420;

function decode(image: DotImage): Dot[] {
  const dots: Dot[] = [];
  const bytes = image.rgb ? 3 : 1;
  const byte = (i: number) => parseInt(image.hex.substr(i * 2, 2), 16);

  for (let i = 0; i < image.cols * image.rows; i++) {
    const col = i % image.cols;
    const row = Math.floor(i / image.cols);
    const delay = (row / image.rows) * REVEAL_MS + Math.random() * 260;

    if (image.rgb) {
      const r = byte(i * bytes);
      const g = byte(i * bytes + 1);
      const b = byte(i * bytes + 2);
      const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
      const size = image.square ? 0.9 : 0.34 + 0.6 * lum;
      dots.push({ col, row, delay, size, color: `rgb(${r},${g},${b})` });
    } else {
      const v = byte(i) / 255;
      if (v < 0.07) continue; // leave the dark background empty
      dots.push({ col, row, delay, size: 0.22 + 0.78 * v, color: warm(v) });
    }
  }
  return dots;
}

/** Deep orange for shadows → amber → cream for highlights. */
function warm(v: number): string {
  const stops: [number, number, number][] = [
    [176, 72, 22],
    [255, 128, 52],
    [255, 190, 124],
    [255, 240, 220],
  ];
  const t = Math.min(0.9999, Math.max(0, v)) * (stops.length - 1);
  const i = Math.floor(t);
  const f = t - i;
  const a = stops[i];
  const b = stops[i + 1];
  const c = (k: number) => Math.round(a[k] + (b[k] - a[k]) * f);
  return `rgba(${c(0)},${c(1)},${c(2)},${(0.35 + 0.65 * v).toFixed(2)})`;
}

export function initDots(canvas: HTMLCanvasElement, image: DotImage): void {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const dots = decode(image);
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  let width = 0;
  let cell = 0;
  let start: number | null = null; // set when the canvas is first seen
  let visible = false;
  let running = false;
  const pointer = { x: 0, y: 0, active: false };

  function resize(): void {
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = rect.width;
    cell = width / image.cols;
    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);
    ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
    draw(performance.now());
  }

  function draw(now: number): void {
    const elapsed = reduced ? Infinity : start === null ? -1 : now - start;
    const reach = cell * 11;
    ctx!.clearRect(0, 0, width, cell * image.rows + 1);

    for (const d of dots) {
      const appear = Math.min(1, Math.max(0, (elapsed - d.delay) / FADE_MS));
      if (appear <= 0) continue;

      let x = (d.col + 0.5) * cell;
      let y = (d.row + 0.5) * cell;
      let r = cell * 0.5 * d.size * appear;

      if (!reduced) {
        // Gentle idle shimmer travelling diagonally across the image
        if (!image.square) r *= 1 + 0.07 * Math.sin(now / 900 + (d.col + d.row) * 0.22);

        if (pointer.active) {
          const dx = x - pointer.x;
          const dy = y - pointer.y;
          const dist = Math.hypot(dx, dy);
          if (dist < reach) {
            const force = (1 - dist / reach) ** 2;
            const push = force * cell * 2.2;
            x += (dx / (dist || 1)) * push;
            y += (dy / (dist || 1)) * push;
            r *= 1 + force * 0.9;
          }
        }
      }

      ctx!.fillStyle = d.color;
      if (image.square) {
        ctx!.fillRect(x - r, y - r, r * 2, r * 2);
      } else {
        ctx!.beginPath();
        ctx!.arc(x, y, r, 0, Math.PI * 2);
        ctx!.fill();
      }
    }
  }

  function loop(now: number): void {
    if (!visible) {
      running = false;
      return;
    }
    draw(now);
    requestAnimationFrame(loop);
  }

  function run(): void {
    if (running || reduced) return;
    running = true;
    requestAnimationFrame(loop);
  }

  canvas.addEventListener("pointermove", (e) => {
    const rect = canvas.getBoundingClientRect();
    pointer.x = e.clientX - rect.left;
    pointer.y = e.clientY - rect.top;
    pointer.active = true;
  });
  canvas.addEventListener("pointerleave", () => (pointer.active = false));

  new ResizeObserver(resize).observe(canvas);
  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (!visible) return;
    start ??= performance.now();
    run();
  }).observe(canvas);

  resize();
}
