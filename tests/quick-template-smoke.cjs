const assert=require('node:assert/strict');
const fs=require('node:fs'), vm=require('node:vm');
const store=new Map();
const elements={};
const makeNode=()=>({
 innerHTML:'',style:{setProperty(){}},classList:{add(){}},
 querySelector(selector){this.children ||= {};return this.children[selector]||=makeNode();}
});
elements['template-days']=makeNode();
elements['qtpl-grid']=makeNode();
elements['qtpl-physicians']=makeNode();
elements['qtpl-stats']=makeNode();
elements['qtpl-undo']=makeNode();
const document={
 getElementById:id=>elements[id]||null,
 querySelector:()=>null,
 addEventListener(){}
};
let confirmations=[],messages=[];
const ctx=vm.createContext({
 document,window:{},navigator:{},console,
 localStorage:{getItem:key=>store.get(key)||null,setItem:(key,value)=>store.set(key,value)},
 confirm:message=>{confirmations.push(message);return ctx.replyToConfirm;},
 setTimeout:()=>0,clearTimeout(){}
});
for(const file of ['app.js','enhancements.js','quick-template.js']){
 vm.runInContext(fs.readFileSync(file,'utf8'),ctx,{filename:file});
}
const run=src=>vm.runInContext(src,ctx);
ctx.replyToConfirm=true;
run("renderCalendar=()=>{};showToast=(msg)=>{ globalMessages.push(msg) };");
ctx.globalMessages=messages;
run("state.currentYear=2026;state.currentMonth=11;state.physicians=[{id:'a',name:'Dr A',code:'AA',color:'#059669'},{id:'b',name:'Dr B',code:'BB',color:'#2563EB'},{id:'c',name:'Dr C',code:'CC',color:'#D97706'}];state.assignments={};state.holidays={'2026-11-10':{isHoliday:true,label:'İdari izin'}};v2.roles={};v2.mobile={c:[2]};v2.weekly={};");
const tpl=ctx.window.asmQuickTemplate;
assert.ok(tpl,'monthly editor exports testing and rendering hooks');
run('renderTemplate()');
assert.match(elements['template-days'].innerHTML,/qtpl-workspace/);
assert.match(elements['template-days'].innerHTML,/qtpl-sidebar/);
assert.match(elements['qtpl-grid'].innerHTML,/data-tpl-date="2026-11-02"/);
assert.match(elements['qtpl-physicians'].innerHTML,/Dr A/);
assert.equal(tpl.getSelected(),'a','first physician selected initially');
assert.deepEqual([...tpl.dateIds('2026-11-03')],['c'],'preconfigured mobile doctor auto appears on Tuesday');
assert.ok(!tpl.dateIds('2026-11-10').includes('c'),'mobile automation does not override a holiday');
assert.ok(!tpl.dateIds('2026-11-07').includes('c'),'no automatic weekends');
// Tap multiple days for one doctor; then select another and tap the same date.
assert.ok(tpl.toggleDate('2026-11-02','a'));
assert.ok(tpl.toggleDate('2026-11-03','a'));
assert.ok(tpl.toggleDate('2026-11-02','b'));
assert.deepEqual([...tpl.dateIds('2026-11-02')],['a','b']);
assert.ok(!tpl.toggleDate('2026-12-02','a'),'a tap cannot silently edit another month');
// Last-action undo restores a removed selection.
tpl.undoChange();
assert.deepEqual([...tpl.dateIds('2026-11-02')],['a']);
tpl.toggleDate('2026-11-02','b');
// Tap an auto mobile day removes it just for that date, and undo restores it.
tpl.toggleDate('2026-11-03','c');
assert.ok(!tpl.dateIds('2026-11-03').includes('c'));
tpl.undoChange();
assert.ok(tpl.dateIds('2026-11-03').includes('c'));
// Bulk select does not assign weekends or holidays.
tpl.bulk('fill','b');
assert.ok(tpl.dateIds('2026-11-16').includes('b'));
assert.ok(!tpl.dateIds('2026-11-07').includes('b'));
assert.ok(!tpl.dateIds('2026-11-10').includes('b'));
tpl.bulk('clear','b');
assert.ok(!tpl.dateIds('2026-11-16').includes('b'));
assert.ok(!tpl.dateIds('2026-11-02').includes('b'));
tpl.undoChange();
assert.ok(tpl.dateIds('2026-11-16').includes('b'));
assert.ok(store.has('asm_quickTemplateDays'),'draft is persisted locally');
assert.ok(store.has('asm_quickTemplateMobileExcluded'),'mobile exceptions are persisted locally');
// Month-specific selections never leak into a different month.
run('state.currentMonth=12');
assert.ok(!tpl.dateIds('2026-12-02').includes('a'));
assert.ok(tpl.dateIds('2026-12-01').includes('c'),'mobil görev continues on first Tuesday of December');
run('state.currentMonth=11');
const before=tpl.monthPlan().length;
assert.ok(before>=4);
const outcome=tpl.applyPlan();
assert.ok(outcome.updated>=4);
assert.equal(run("v2.roles['2026-11-02'].a"),'Görevli','new physician selection arrives without imposing a role');
assert.equal(run("v2.roles['2026-11-03'].c"),'Mobil görev','auto mobile title carried to the main calendar');
assert.ok(run("state.assignments['2026-11-02'].includes('a')"));
assert.ok(run("state.assignments['2026-11-02'].includes('b')"));
const repeat=tpl.applyPlan();
assert.equal(repeat.updated,0,'reapplying the same schedule is idempotent');
assert.equal(confirmations.length,0,'no confirmation for safe first import or repeated import');
// Detailed main calendar roles take precedence over repeated template imports.
run("v2.roles['2026-11-02'].a='Primer'");
tpl.applyPlan();
assert.equal(run("v2.roles['2026-11-02'].a"),'Primer');
// Changing an already scheduled day requires just one confirmation.
tpl.toggleDate('2026-11-02','b');
ctx.replyToConfirm=false;
const safe=tpl.applyPlan();
assert.ok(safe.conflicts>=1);
assert.equal(run("state.assignments['2026-11-02'].includes('b')"),true,'cancel preserves existing roster');
ctx.replyToConfirm=true;
const accepted=tpl.applyPlan();
assert.equal(accepted.overwritten,true);
assert.equal(run("state.assignments['2026-11-02'].includes('b')"),false);
assert.equal(run("v2.roles['2026-11-02'].a"),'Primer','existing manual primer role survives same-doctor overwrite');
// All editing is local; legacy weekly template continues to exist.
assert.ok(store.has('asm_assignments'));
assert.ok(!Object.keys(tpl.getDraft().days).some(key=>key.startsWith('2026-12')),'month-specific selections do not touch future months');
console.log('PASS: tap calendar, mobile, undo, bulk, persistence, month scope, safe import, override protection');
