# Steven (Kuan-Wen) Chen — portfolio

A single-page portfolio with an interactive terminal, built with Vite and TypeScript (no framework).

## Run locally

```sh
npm install
npm run dev
```

## Build

```sh
npm run build   # type-checks, then writes the static site to dist/
```

## Structure

- `index.html` — all page content
- `src/terminal.ts` — the hero terminal: commands, history, tab completion
- `src/dots.ts` — dot-matrix image renderer (canvas)
- `src/style.css` — styles
- `.github/workflows/deploy.yml` — builds and deploys to GitHub Pages on every push to `main`
