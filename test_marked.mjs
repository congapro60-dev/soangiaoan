import { marked } from "marked"; const md = `| C?t 1 | C?t 2 |
|---|---|
| A | \n\n![TikZ Diagram](https://kroki.io/tikz/png/123)\n\n |
`; console.log(JSON.stringify(marked.lexer(md), null, 2));
