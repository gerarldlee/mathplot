# Contributing to mathplot

Thanks for your interest in contributing! This guide covers development setup, build/test commands, and the package structure.

## Development setup

```bash
git clone https://github.com/gerarldlee/mathplot.git
cd mathplot
npm install
```

## Commands

| Command | Description |
| --- | --- |
| `npm run build` | Build all packages (core first, then dependents) |
| `npm test` | Run vitest in every package |
| `npm run typecheck` | Type-check all packages |
| `npm run lint` | Lint with oxlint |
| `npm run dev` | Start the site dev server with playground |

## Package structure

```
packages/
  core/              @mathplot/core — engine (parsing, sampling, CSV)
  react/             @mathplot/react — React components
  markdown/          @mathplot/markdown — mountAll for rendered HTML
  remark/            @mathplot/remark — remark plugin
  web/               @mathplot/web — custom elements
  site/              @mathplot/site (private) — docs site + playground
```

All packages share `@mathplot/core` and its `MathPlotSpec`. A fence written for React renders identically in mdx or a static HTML page.

## Adding a new plot type

1. Add the type alias and parser logic in `packages/core/src/`
2. Add a sampler in `packages/core/src/samplers/`
3. Add a React component in `packages/react/src/`
4. Update the remark plugin in `packages/remark/src/`
5. Update web components in `packages/web/src/`
6. Add tests in each package's `*.test.ts` files
7. Update the root README and the site's Docs page

## Pull requests

- Keep changes focused — one feature or fix per PR
- Add tests for new behavior
- Ensure `npm test` and `npm run lint` pass before submitting
- Update documentation (READMEs, site docs) for user-facing changes

## License

MIT
