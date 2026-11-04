async function checkLiveClassroomCss() {
  const url = 'https://giaoandewey.vercel.app';
  const text = await (await fetch(url + '/assets/liveClassroom-CvH8UE1P.css')).text();
  console.log('LENGTH:', text.length);
  console.log('SNIPPET FIRST 300:', text.slice(0, 300));
  console.log('SNIPPET LAST 300:', text.slice(-300));
}

checkLiveClassroomCss().catch(console.error);
