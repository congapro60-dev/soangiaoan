const pako = require('pako');
async function test(code) {
  code = code.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D');
  const data = new TextEncoder().encode(code);
  const compressed = pako.deflate(data, { level: 9 });
  const base64 = btoa(String.fromCharCode.apply(null, compressed)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const res = await fetch('https://kroki.io/tikz/svg/' + base64);
  console.log(res.status, (await res.text()).substring(0, 50));
}
test(`\\documentclass[tikz,border=2mm]{standalone}
\\usepackage[utf8]{inputenc}
\\begin{document}
\\begin{tikzpicture}
\\node at (0,0) {Vị trí};
\\end{tikzpicture}
\\end{document}`);
