const {chromium}=require('playwright');const fs=require('fs');
(async()=>{const D=process.argv[2];fs.rmSync(D+'/frames',{recursive:true,force:true});fs.mkdirSync(D+'/frames');
const b=await chromium.launch();const pg=await (await b.newContext({viewport:{width:1080,height:1920}})).newPage();
await pg.goto('file://'+D+'/scene.html');await pg.waitForTimeout(1500);
const info=await pg.evaluate(()=>({DUR:window.DUR,CHAR:window.CHAR_TIMES,HITS:window.HITS}));fs.writeFileSync(D+'/times.json',JSON.stringify(info));
const N=Math.round(info.DUR*30);const t0=Date.now();
for(let i=0;i<N;i++){await pg.evaluate(t=>window.seek(t),i/30);await pg.screenshot({path:`${D}/frames/f${String(i).padStart(5,'0')}.png`})}
console.log('frames',N,'sec',Math.round((Date.now()-t0)/1000));await b.close()})();
