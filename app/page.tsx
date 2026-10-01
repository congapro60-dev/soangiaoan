"use client";
import { useEffect } from "react";
export default function Game() {
 useEffect(()=>{let active=true; const engine=document.createElement('script');engine.src='/engine.js';engine.onload=()=>{if(!active)return;const app=document.createElement('script');app.src='/app.js';document.body.appendChild(app);};document.body.appendChild(engine);return()=>{active=false;};},[]);
 return <><link rel="stylesheet" href="/style.css"/><div id="app"><main style={{padding:40}}>Đang mở hồ sơ trạm…</main></div><div id="toast" role="status" aria-live="polite"/><dialog id="hintDialog" aria-labelledby="hintTitle"/></>;
}
