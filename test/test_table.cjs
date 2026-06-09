const { Document, Packer, Table, TableRow, TableCell, Paragraph, WidthType } = require('docx');
const JSZip = require('jszip');

async function test() {
  const doc = new Document({
    sections: [{
      children: [
        new Table({
          rows: [
            new TableRow({
              children: [
                new TableCell({ children: [new Paragraph('A')], width: { size: 3000, type: WidthType.DXA } })
              ]
            })
          ]
        })
      ]
    }]
  });
  const b = await Packer.toBuffer(doc);
  const zip = await JSZip.loadAsync(b);
  const xml = await zip.file('word/document.xml').async('text');
  console.log(xml.includes('w="3000"') ? 'Contains w="3000"' : xml);
}
test().catch(e => console.error(e));
