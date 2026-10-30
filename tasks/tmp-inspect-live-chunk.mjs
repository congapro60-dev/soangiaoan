async function checkLiveLessonPage() {
  const url = 'https://giaoandewey-b4pprq0mm-congapro60-devs-projects.vercel.app';
  const text = await (await fetch(url + '/assets/LiveLessonPage-CD_6G9Ml.js')).text();

  console.log('Includes MathFigureZoom or math-diagram:', text.includes('math-diagram'));
  console.log('Includes Phóng to hoặc thu nhỏ:', text.includes('Phóng to') || text.includes('Thu nhỏ'));
  console.log('Includes Chụp ảnh bài làm giấy:', text.includes('Chụp ảnh bài làm giấy') || text.includes('Chụp ảnh bài làm'));

  // Extract snippet around StudentPaperPhotoUploader
  const idx = text.indexOf('Chụp ảnh bài làm');
  if (idx !== -1) {
    console.log('SNIPPET AROUND UPLOADER:\n', text.slice(idx - 100, idx + 200));
  }
  const idxZoom = text.indexOf('Nội dung chung');
  if (idxZoom !== -1) {
    console.log('SNIPPET AROUND NỘI DUNG CHUNG:\n', text.slice(idxZoom - 100, idxZoom + 200));
  }
}

checkLiveLessonPage().catch(console.error);
