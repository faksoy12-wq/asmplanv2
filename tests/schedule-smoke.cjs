const fs=require('node:fs');
const vm=require('node:vm');
const assert=require('node:assert/strict');
const source=fs.readFileSync('app.js','utf8');
const extension=fs.readFileSync('enhancements.js','utf8');
const stored=new Map();
const fakeDocument={addEventListener(){},getElementById(){return null;}};
const ctx=vm.createContext({
  document:fakeDocument,navigator:{},window:{},console,
  localStorage:{getItem:key=>stored.get(key)||null,setItem:(key,value)=>stored.set(key,value)},
  confirm:()=>true,setTimeout:()=>0,clearTimeout(){},
});
vm.runInContext(source,ctx,{filename:'app.js'});
vm.runInContext(extension,ctx,{filename:'enhancements.js'});
const run=(script)=>vm.runInContext(script,ctx);
run("renderCalendar=()=>{};renderSheetPhysicians=()=>{};renderPhysicians=()=>{};closePhysicianModal=()=>{};showToast=()=>{};");
const setup=()=>{
run("state.currentYear=2026;state.currentMonth=11;state.physicians=[{id:'a',name:'Dr A',code:'A',color:'#059669'},{id:'b',name:'Dr B',code:'B',color:'#2563eb'},{id:'c',name:'Dr C',code:'C',color:'#d97706'}];state.template={'1':['a','b'],'2':['a','b'],'3':['a','b'],'4':['a','b'],'5':['a','b']};state.assignments={};state.holidays={};v2.roles={};v2.mobile={c:[1]};v2.weekly={};");
};
setup();
run("state.assignments['2026-11-02']=['b'];v2.roles['2026-11-02']={b:'Sekonder'};v2.roles['2026-11-03']={a:'İzinli / Off day'};state.holidays['2026-11-05']={isHoliday:true,label:'İdari izin'};v2.weekly[v2WeekKey('2026-11-09',1)]=['b'];");
run('applyTemplateToMonth()');
assert.equal(run("v2.roles['2026-11-16'].a"),'Primer','first routine doctor is primer');
assert.equal(run("v2.roles['2026-11-16'].b"),'Sekonder','second routine doctor is sekonder');
assert.equal(run("v2.roles['2026-11-16'].c"),'Mobil görev','mobile doctor is labelled mobile, not omitted');
assert.equal(run("state.assignments['2026-11-16'].length"),3,'all three doctors are represented');
assert.equal(run("state.assignments['2026-11-02'].join(',')"),'b','manual assignment survives automatic template');
assert.equal(run("state.assignments['2026-11-03']"),undefined,'manual off-day prevents template overwrite');
assert.equal(run("state.assignments['2026-11-05']"),undefined,'holiday is skipped');
assert.equal(run("state.assignments['2026-11-09'].join(',')"),'b,c','monthly week override and mobile duty both applied');
assert.equal(run("v2Week('2026-11-02')"),2,'week indexes match calendar rows');
// Reapplying template must preserve manually edited duties
run("v2.roles['2026-11-16'].a='İzinli / Off day';applyTemplateToMonth()");
assert.equal(run("v2.roles['2026-11-16'].a"),'İzinli / Off day');
// Monthly exceptions do not leak into following month
run("state.currentMonth=12;applyTemplateToMonth()");
assert.equal(run("state.assignments['2026-12-07'].join(',')"),'a,b,c','November override does not affect December; mobile weekday remains active');
// Clearing one month removes its role labels but leaves other months intact
run("state.currentMonth=11;clearMonthAssignments()");
assert.equal(run("state.assignments['2026-11-16']"),undefined);
assert.equal(run("v2.roles['2026-11-16']"),undefined);
assert.equal(run("state.assignments['2026-12-07'].join(',')"),'a,b,c');
// Deleting a doctor clears per-doctor mobile settings and week exceptions
run("el.physicianEditId={value:'c'};v2.weekly['2026-11-2-1']=['b','c'];deletePhysician()");
assert.equal(run("state.physicians.some(p=>p.id==='c')"),false);
assert.equal(run("v2.mobile.c"),undefined);
assert.equal(run("v2.weekly['2026-11-2-1'].includes('c')"),false);
console.log('PASS: role mapping, mobile tasks, manual protection, holiday, calendar week, monthly override, clear, delete');
