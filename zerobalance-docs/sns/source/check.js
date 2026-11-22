const {chromium}=require('playwright');
(async()=>{const D=process.argv[2];const ts=process.argv.slice(3).map(Number);const b=await chromium.launch();
const pg=await (await b.newContext({viewport:{width:1080,height:1920}})).newPage();const errs=[];pg.on('pageerror',e=>errs.push(e.message));
await pg.goto('file://'+D+'/scene.html');await pg.waitForTimeout(1200);
for(const t of ts){await pg.evaluate(t=>window.seek(t),t);await pg.screenshot({path:`${D}/chk_${t}.png`})}
console.log('errors',errs,'chars',await pg.evaluate(()=>window.CHAR_TIMES.length));await b.close()})();
