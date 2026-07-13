# Workflows

`stipple-base.api.json` is the ComfyUI graph, exported in **API format** — not the regular
save. The UI-format export includes canvas layout and will not run headlessly.

To export: ComfyUI settings → enable dev mode → "Save (API format)".

The render route patches values into node inputs by ID. If you change the graph, update the
`NODE` map in `src/app/api/render/route.ts` in the same commit.

Treat this file like code. Pin custom node versions in the container — ComfyUI custom nodes
break on updates constantly, and a render endpoint that silently changes behavior is not
acceptable.
