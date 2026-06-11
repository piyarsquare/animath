import puppeteer from 'puppeteer';
const out = process.argv[2]; const nval = process.argv[3] ?? '8';
const url = 'http://localhost:4173/animath/#/trees-and-nets';
const args=['--headless=new','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--no-sandbox','--disable-dev-shm-usage','--window-size=1280,800'];
const b=await puppeteer.launch({args}); const p=await b.newPage(); await p.setViewport({width:1280,height:800});
p.on('pageerror',e=>console.log('[pageerror]',e.message));
await p.evaluateOnNewDocument((nv)=>{try{localStorage.setItem('animath:v1:trees-and-nets:n',nv);localStorage.setItem('animath:v1:trees-and-nets:spin','false');}catch{}}, nval);
await p.goto(url,{waitUntil:'networkidle2'}); await new Promise(r=>setTimeout(r,4000));
await p.screenshot({path:out}); await b.close(); console.log('wrote',out);
