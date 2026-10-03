const os=window.matchMedia('(prefers-reduced-motion: reduce)');
let settings=readMediaSettings(readStorage(),os.matches),context=null,gesture=false,hidden=document.hidden,themeId='modern',previous=null,queue=[],timer=null,musicTimer=null,musicStep=0;
const gate=createMediaGate(),voices=new Set(),log=[];
function readStorage(){try{return localStorage.getItem(MEDIA_SETTINGS_KEY);}catch{return null;}}
function persist(){try{localStorage.setItem(MEDIA_SETTINGS_KEY,JSON.stringify(settings));}catch{}}
function stopAudio(){clearInterval(musicTimer);musicTimer=null;for(const voice of voices){try{voice.stop();}catch{}}voices.clear();}
function synth(sound,music=false){
 if(!context||context.state!=='running'||hidden||!settings.master||!(music?settings.music:settings.sfx))return;
 const at=context.currentTime;
 sound.notes.forEach((frequency,i)=>{
  const oscillator=context.createOscillator(),gain=context.createGain(),start=at+i*sound.duration;
  oscillator.type=sound.wave;oscillator.frequency.setValueAtTime(frequency,start);
  if(sound.percussion)oscillator.frequency.exponentialRampToValueAtTime(Math.max(30,frequency/4),start+sound.duration);
  gain.gain.setValueAtTime(.0001,start);gain.gain.exponentialRampToValueAtTime(Math.max(.0001,settings.volume/100*(music?.025:.07)),start+.01);gain.gain.exponentialRampToValueAtTime(.0001,start+sound.duration);
  oscillator.connect(gain);gain.connect(context.destination);voices.add(oscillator);oscillator.onended=()=>{voices.delete(oscillator);oscillator.disconnect();gain.disconnect();};oscillator.start(start);oscillator.stop(start+sound.duration+.02);
 });
}
function music(){
 clearInterval(musicTimer);musicTimer=null;
 if(!gesture||!context||hidden||!settings.master||!settings.music)return;
 const track=window.SignalCampaign.themes[themeId]?.music;if(!track)return;
 musicTimer=setInterval(()=>{const note=track.notes[musicStep++%track.notes.length];synth({notes:[440*2**((note-69)/12)],wave:track.wave,duration:.38},true);},60000/track.tempo);
}
async function enableAudio(event){
 if(!event?.isTrusted)return false;
 gesture=true;
 if(!settings.master)return false;
 const Audio=window.AudioContext||window.webkitAudioContext;
 if(!Audio)return false;
 try{context??=new Audio();await context.resume();music();return true;}catch{return false;}
}
function applySettings(next){
 settings=normalizeMediaSettings({...settings,...next},os.matches);persist();
 document.body.classList.toggle('reduced-motion',settings.reducedMotion||!settings.effects);
 document.body.classList.toggle('media-effects-off',!settings.effects);
 if(!settings.master||!settings.music)stopAudio();
 if(!settings.master)context?.suspend();
 if(!settings.meme)document.getElementById('mediaReaction')?.remove();
 music();window.dispatchEvent(new Event('media-settings-change'));return {...settings};
}
function display(event){
 const item=mediaReaction(event.category,themeId);if(!item)return;
 synth(item.sound);
 if(!settings.meme)return;
 let reaction=document.getElementById('mediaReaction');if(!reaction){reaction=document.createElement('div');reaction.id='mediaReaction';reaction.setAttribute('aria-hidden','true');document.body.appendChild(reaction);}
 reaction.replaceChildren();const mascot=document.createElement('span');mascot.className='mascot';mascot.style.backgroundImage=`url('/assets/${window.SignalCampaign.themes[themeId].sprites}')`;const text=document.createElement('span');text.textContent=item.text;reaction.append(mascot,text);clearTimeout(reaction.timer);reaction.timer=setTimeout(()=>reaction.remove(),1900);
}
function drain(){timer=null;if(hidden){queue=[];return;}const event=queue.shift();if(event){display(event);timer=setTimeout(drain,2000);}}
function emit(event){
 const item=mediaReaction(event.category,themeId);if(!item||!gate.accept(event,hidden))return;
 log.push(item.text);if(log.length>30)log.shift();const output=document.getElementById('mediaLog');if(output)output.textContent=log.join('\n');
 // Keep at most 13 pending reactions; overflow drops the oldest pending event.
 queue.push(event);if(queue.length>13)queue.shift();if(!timer)drain();
}
function observe(next,map){
 if(!next){previous=null;return;}
 themeId=window.SignalCampaign.resolveThemeId(next.race?.campaign?.theme)||'modern';
 for(const event of mediaEvents(previous,next,map))emit(event);
 previous=structuredClone(next);previous.mediaRank=map?.peers?.find(p=>p.id===next.id)?.rank;
}
function panel(){
 const dialog=document.getElementById('settingsDialog');if(!dialog)return;
 dialog.replaceChildren();const title=document.createElement('h2');title.id='settingsTitle';title.textContent='Âm thanh & phản hồi';dialog.appendChild(title);dialog.setAttribute('aria-labelledby',title.id);
 for(const [key,label] of Object.entries({master:'Bật âm thanh tổng',sfx:'Âm thanh sự kiện',music:'Nhạc của thế giới',meme:'Phản ứng linh vật',effects:'Hiệu ứng hình ảnh',reducedMotion:'Giảm chuyển động',volume:'Âm lượng'})){
  const row=document.createElement('label'),input=document.createElement('input');input.name=key;input.type=key==='volume'?'range':'checkbox';input.min='0';input.max='100';input.value=settings[key];input.checked=!!settings[key];row.append(document.createTextNode(label+' '),input);dialog.appendChild(row);
  input.addEventListener('input',event=>{applySettings({[key]:key==='volume'?Number(input.value):input.checked});if(['master','sfx','music'].includes(key)&&settings.master)enableAudio(event);});
 }
 const close=document.createElement('button');close.textContent='Đóng';close.addEventListener('click',()=>dialog.close());dialog.appendChild(close);
 const history=document.createElement('pre');history.id='mediaLog';history.setAttribute('role','log');history.textContent=log.join('\n');dialog.appendChild(history);dialog.showModal();
}
document.addEventListener('click',event=>{if(event.target.closest('[data-action="settings"]'))panel();});
document.addEventListener('visibilitychange',()=>{hidden=document.hidden;queue=[];clearTimeout(timer);timer=null;document.getElementById('mediaReaction')?.remove();if(hidden){stopAudio();context?.suspend();}else if(gesture&&settings.master&&context){context.resume().then(music).catch(()=>{});}});
os.addEventListener('change',()=>{if(!readStorage())applySettings({reducedMotion:os.matches});});
applySettings(settings);
window.SignalFeedback={emit,observe,settings:()=>({...settings}),update:applySettings,enableAudio,setTheme(id){const next=window.SignalCampaign.resolveThemeId(id)||'modern';if(themeId!==next){themeId=next;musicStep=0;music();}},log:()=>[...log]};
