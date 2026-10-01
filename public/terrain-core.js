(function(scope){
'use strict';
const clamp=(x,a,b)=>Math.max(a,Math.min(b,Number(x)||0));
function sample(route,position){let p=clamp(position,0,route.length-1),i=Math.floor(p),j=Math.min(i+1,route.length-1),f=p-i;return route[i].map((v,k)=>v+(route[j][k]-v)*f);}
function at(m,t){if(!m||!m.duration)return m?.to||0;let f=clamp((t-m.at)/m.duration,0,1);return m.from+(m.to-m.from)*f;}
function move(previous,target,t,reduced=false){target=clamp(target,0,32);if(!previous)return {from:target,to:target,at:t,duration:0};if(target<previous.to)return previous; if(reduced)return {from:target,to:target,at:t,duration:0};if(target===previous.to)return previous;let from=at(previous,t);return {from,to:target,at:t,duration:reduced?0:Math.min(2100,Math.max(300,(target-from)*220))};}
function elevation(x,z){let u=(x+80)/160,v=(z+45)/90;const hill=(a,b,w,h)=>h*Math.exp(-((u-a)**2+(v-b)**2)/w);return hill(.10,.1,.018,8)+hill(.32,.10,.02,7)+hill(.76,.1,.035,6)+hill(.98,.45,.009,9)+hill(.19,.52,.018,3)+hill(.65,.69,.012,5);}
function hash(s){let n=2166136261;for(const c of String(s))n=Math.imul(n^c.charCodeAt(0),16777619);return n>>>0;}
scope.SignalTerrainCore={clamp,sample,at,move,elevation,hash};
})(typeof window==='undefined'?globalThis:window);
