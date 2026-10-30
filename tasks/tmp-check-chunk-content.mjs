async function check() {
  const res = await fetch('https://giaoandewey.vercel.app/assets/index-C7ExATBd.js');
  const text = await res.text();
  console.log('Includes MathFigureZoom:', text.includes('MathFigureZoom') || text.includes('math-diagram-container') || text.includes('clampScale'));
  console.log('Includes StudentPaperPhotoUploader:', text.includes('StudentPaperPhotoUploader') || text.includes('Chụp ảnh bài làm'));
  console.log('Includes live-touch-target:', text.includes('live-btn-primary') || text.includes('live-btn-secondary'));
}

check().catch(console.error);
