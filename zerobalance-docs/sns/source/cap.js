const {chromium}=require('playwright');const fs=require('fs');
(async()=>{const O=process.argv[2];const b=await chromium.launch();
const ctx=await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:2});
const pg=await ctx.newPage();const errs=[];pg.on('pageerror',e=>errs.push(e.message));
await pg.goto('http://localhost:8765/app/?sample=1');await pg.waitForTimeout(800);
await pg.evaluate(()=>{const a=window.__app,t=a.todayStr();a.state.sample=false;a.delDay(t);a.state.settings.goal=20000000;a.flush();a.ui.tab='input';a.ui.inSub='day';a.ui.day=t;a.render(false)});
await pg.waitForTimeout(300);
let i=0;const shot=async n=>{await pg.screenshot({path:`${O}/${n}.png`})};
await shot('day_000');
for(const [f,v] of [['card','1200000'],['cash','150000'],['account','80000']]){
  const el=pg.locator(`input[data-scope=day][data-path=${f}]`);await el.click();
  for(let k=1;k<=v.length;k++){await el.fill('');await el.pressSequentially(v.slice(0,k));await pg.waitForTimeout(40);i++;await shot('day_'+String(i).padStart(3,'0'))}
}
await pg.locator('.ttl').first().click();await pg.waitForTimeout(300);i++;await shot('day_'+String(i).padStart(3,'0'));
console.log('day frames',i+1);
// 홈
await pg.evaluate(()=>{const a=window.__app;a.ui.tab='home';a.render(false);window.scrollTo(0,0)});await pg.waitForTimeout(400);await shot('home');
// 급여
await pg.evaluate(()=>{const a=window.__app;a.ui.tab='pay';a.render(false)});await pg.waitForTimeout(300);await shot('pay');
// 정산 이미지
const st=await pg.evaluate(()=>{const a=window.__app;const d=a.state.staff.find(s=>s.kind==='designer');return a.drawSettlePng(d)});
fs.writeFileSync(O+'/settle.png',Buffer.from(st.split(',')[1],'base64'));
// 세금
await pg.evaluate(()=>{const a=window.__app;a.ui.tab='tax';a.ui.taxView='month';a.render(false);window.scrollTo(0,0)});await pg.waitForTimeout(300);await shot('tax');
await pg.evaluate(()=>{const a=window.__app;a.ui.tab='more';a.render(false);window.scrollTo(0,0)});await pg.waitForTimeout(300);await shot('more');
// 엑셀 카드 위치
await pg.evaluate(()=>{const a=window.__app;a.ui.tab='tax';a.ui.taxView='year';a.render(false)});await pg.waitForTimeout(300);
await pg.evaluate(()=>{const e=document.querySelector('main [data-act=exportTax]');e.scrollIntoView({block:'center'})});await pg.waitForTimeout(200);await shot('excel');
// 잠금 화면
await pg.evaluate(()=>{const a=window.__app;a.ui.locked=true;a.render(false)});await pg.waitForTimeout(200);await shot('lock');
console.log('errors',errs);await b.close()})();
