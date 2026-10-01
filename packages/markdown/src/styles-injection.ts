// Side-effect module: ensures @mathplot/react styles are present when the
// prebuilt bundle is used standalone. The react package's own css import only
// applies when its source/bundled entry is processed by a bundler css pipeline.
import '@mathplot/react/styles.css'