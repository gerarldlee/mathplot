# @mathplot/markdown

Mount live [mathplot](https://github.com/gerard/mathplot) plots onto ```mathplot code fences
in already-rendered markdown HTML. Works with any markdown renderer, static-site generator,
docs site, or CMS output — no pipeline changes needed.

```bash
npm i @mathplot/markdown
```

Peer deps: `react`, `react-dom` ^18 || ^19.

## Usage

```js
// after your markdown has rendered into the DOM
import { mountAll } from '@mathplot/markdown'
import '@mathplot/markdown/styles-injection'

const result = mountAll(document.body)

// result.mounted — number of fences replaced
// result.dispose() — unmount every mounted plot (for SPA teardown)
```

Every `pre > code.language-mathplot` block is replaced with a live plot:

````markdown
```mathplot
2d
y = sin(x) * cos(3x)
x: -6..6
```
````

## Fence forms

Both supported forms work:

````markdown
```mathplot 2d y=sin(x) x=-6..6```
````

````markdown
```mathplot
pie
Browser share
Chrome, 65
Firefox, 20
Other, 15
```
````

Fences that do not parse (unknown type, missing data) are left untouched so readers see the
original source. Regular code blocks are never modified.

## Custom rendering

Pass `render` to wrap plots:

```js
mountAll(root, {
  render: (spec) => <MyCard><MathPlot spec={spec} /></MyCard>,
})
```

## License

MIT