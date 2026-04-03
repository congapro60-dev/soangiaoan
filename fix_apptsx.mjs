import { readFileSync, writeFileSync } from 'fs';

const file = 'src/App.tsx';
let content = readFileSync(file, 'utf8');

// Fix 1: Replace old inline cleaning block with cleanMarkdownOutput call
const oldClean = `        const result = await callGeminiAI(prompt, data.settings.geminiApiKey, MODELS.indexOf(data.settings.selectedModel));
        if (result) {
          // Clean up improper <br> tags & HTML from AI output
          const cleaned = result
            .replace(/<br\\s*\\/?>/ gi, '\\n') // <br> / <br/> → newline
            .replace(/<(?!img|table|thead|tbody|tr|th|td)[a-zA-Z][^>]*>/g, '') // strip non-table HTML open tags
            .replace(/<\\/(?!table|thead|tbody|tr|th|td)[a-zA-Z][^>]*>/g, '') // strip non-table HTML close tags
            .replace(/\\n{3,}/g, '\\n\\n'); // collapse 3+ blank lines to 2
          setCurrentPlan(prev => ({ ...prev, content: cleaned }));
          showToast('Đã khởi tạo giáo án thành công!');
        }`;

const newClean = `        const result = await callGeminiAI(prompt, data.settings.geminiApiKey, MODELS.indexOf(data.settings.selectedModel));
        if (result) {
          setCurrentPlan(prev => ({ ...prev, content: cleanMarkdownOutput(result) }));
          showToast('Đã khởi tạo giáo án thành công!');
        }`;

if (content.includes(oldClean)) {
  content = content.replace(oldClean, newClean);
  console.log('✅ Fixed: old inline cleaner → cleanMarkdownOutput()');
} else {
  // Try to find the block more flexibly
  const idx = content.indexOf('// Clean up improper <br> tags & HTML from AI output');
  if (idx !== -1) {
    // Find start of the if block
    const blockStart = content.lastIndexOf('if (result) {', idx);
    const blockEnd = content.indexOf('\n        }\n      } else {', idx);
    if (blockStart !== -1 && blockEnd !== -1) {
      const resultCallStart = content.lastIndexOf('const result = await callGeminiAI', blockStart);
      const replacement = `        const result = await callGeminiAI(prompt, data.settings.geminiApiKey, MODELS.indexOf(data.settings.selectedModel));
        if (result) {
          setCurrentPlan(prev => ({ ...prev, content: cleanMarkdownOutput(result) }));
          showToast('Đã khởi tạo giáo án thành công!');
        }`;
      content = content.slice(0, resultCallStart) + replacement + content.slice(blockEnd + '\n        }'.length);
      console.log('✅ Fixed (flexible match): old inline cleaner → cleanMarkdownOutput()');
    } else {
      console.log('❌ Could not find block boundaries');
    }
  } else {
    console.log('⚠️ Old clean block not found - may already be patched');
  }
}

writeFileSync(file, content, 'utf8');
console.log('✅ File written successfully as UTF-8');
