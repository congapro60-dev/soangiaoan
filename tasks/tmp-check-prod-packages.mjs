import https from 'https';

async function checkProd() {
  const res = await fetch('https://giaoandewey.vercel.app/adaptive-lessons');
  const text = await res.text();
  console.log('giaoandewey.vercel.app includes 59?', text.includes('59 gói'));
  console.log('giaoandewey.vercel.app includes 58?', text.includes('58 gói'));
  
  const res2 = await fetch('https://giaoandewey-cyiaq6daf-congapro60-devs-projects.vercel.app/adaptive-lessons');
  const text2 = await res2.text();
  console.log('cyiaq6daf includes 59?', text2.includes('59 gói'));
}

checkProd().catch(console.error);
