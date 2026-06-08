import fs from 'fs';
import * as pdfjsLib from 'pdfjs-dist';

async function extractText(pdfPath) {
    const data = new Uint8Array(fs.readFileSync(pdfPath));
    const doc = await pdfjsLib.getDocument({ data }).promise;
    let text = '';
    for (let i = 1; i <= doc.numPages; i++) {
        const page = await doc.getPage(i);
        const content = await page.getTextContent();
        const strings = content.items.map(item => item.str);
        text += strings.join(' ') + '\n';
    }
    fs.writeFileSync('C:/Users/ADMIN/Downloads/smart-lesson-plan-ai/scratch_pdf_content.txt', text);
    console.log('Done extracting pdf!');
}

extractText('C:/Users/ADMIN/Downloads/mã đề 201.pdf').catch(console.error);
