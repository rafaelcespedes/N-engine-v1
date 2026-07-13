# public/

`placeholders/` holds the base-image library the compositor stipples while there's no
backend (roadmap steps 1–4). Each file is registered in `src/lib/placeholders.ts`.

To add one: drop a `png` / `jpg` / `webp` / `svg` in `placeholders/`, then add a row to the
`PLACEHOLDERS` array. Pick images with strong value structure — only tone survives stippling.
