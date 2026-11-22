const {chromium}=require('playwright');
(async()=>{const D=process.argv[2],O=process.argv[3];const b=await chromium.launch();
const pg=await (await b.newContext({viewport:{width:1080,height:1400}})).newPage();const errs=[];pg.on('pageerror',e=>errs.push(e.message));
await pg.goto('file://'+D+'/cards.html');await pg.waitForTimeout(1200);
// 넘침 검사: 글자 상자가 카드 밖으로 나가거나 서로 겹치는지
const ov=await pg.evaluate(()=>[...document.querySelectorAll('.c')].map(c=>{const R=c.getBoundingClientRect();const bad=[];
  c.querySelectorAll('h1,h2,p,.prob div,.list div,.btn,.ex,.small,.swipe,.xcard,.phone,.settle').forEach(e=>{const r=e.getBoundingClientRect();if(r.right>R.right+1||r.bottom>R.bottom+1||r.left<R.left-1)bad.push(e.className||e.tagName)});
  const txt=c.querySelector('.txt').getBoundingClientRect();const img=c.querySelector('.phone,.settle');const ir=img?img.getBoundingClientRect():null;
  return {id:c.id,bad,overlapTxtImg:ir?Math.round(txt.bottom-ir.top):null}}));
console.log(JSON.stringify(ov));
for(let i=1;i<=6;i++){await pg.locator('#c'+i).screenshot({path:`${O}/zerobalance-card-${i}.png`})}
console.log('errors',errs);await b.close()})();
