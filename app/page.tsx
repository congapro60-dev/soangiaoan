"use client";
import { useEffect } from "react";
export default function Game() {
 useEffect(()=>{let active=true;const sources=['/engine.js','/campaign-data.js','/katex/katex.min.js','/app.js'];const load=(i:number)=>{if(!active||i>=sources.length)return;const script=document.createElement('script');script.src=sources[i];script.onload=()=>load(i+1);script.onerror=()=>{const el=document.getElementById('app');if(el)el.textContent='Chưa tải được game. Kiểm tra kết nối và tải lại trang.';};document.body.appendChild(script);};load(0);return()=>{active=false;};},[]);
 return <><link rel="stylesheet" href="/style.css"/><link rel="stylesheet" href="/katex/katex.min.css"/><div id="app"><main style={{padding:40}}>Đang mở hồ sơ trạm…</main></div><div id="toast" role="status" aria-live="polite"/><dialog id="hintDialog" aria-labelledby="hintTitle"/></>;
}
