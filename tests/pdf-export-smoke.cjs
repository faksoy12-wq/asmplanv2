const fs=require('node:fs');
const vm=require('node:vm');
const assert=require('node:assert/strict');
const source=['app.js','enhancements.js','pdf-export.js'].map(name=>fs.readFileSync(name,'utf8'));
const storage=new Map(),drawn=[],shares=[];
const ctx2d={
  beginPath(){},moveTo(){},lineTo(){},quadraticCurveTo(){},closePath(){},fill(){},stroke(){},fillRect(){},
  fillText(value,x,y){drawn.push({value:String(value),x,y})},
  measureText(value){return {width:String(value).length*8}}
};
const canvas=()=>({width:2200,height:1556,getContext:()=>ctx2d,
  toDataURL:()=> 'data:image/jpeg;base64,'+Buffer.from([0xff,0xd8,0xff,0xd9]).toString('base64')});
const doc={addEventListener(){},getElementById(){return null;},createElement:kind=>kind==='canvas'?canvas():{}};
const webNavigator={
  canShare:({files})=>files.length===1&&files[0].type==='application/pdf',
  share:payload=>{shares.push(payload);return Promise.resolve();}
};
const sandbox=vm.createContext({
 document:doc,navigator:webNavigator,window:{},console,
 localStorage:{getItem:key=>storage.get(key)||null,setItem:(key,value)=>storage.set(key,value)},
 confirm:()=>true,setTimeout:()=>0,clearTimeout(){},TextEncoder,Blob,File,atob,
});
source.forEach((code,i)=>vm.runInContext(code,sandbox,{filename:['app.js','enhancements.js','pdf-export.js'][i]}));
const run=src=>vm.runInContext(src,sandbox);
run("state.physicians=[{id:'p',name:'Dr Primer',code:'PR',color:'#0c9c88'},{id:'s',name:'Dr Sekonder',code:'SK',color:'#2468b1'},{id:'o',name:'Dr İzinli',code:'OFF',color:'#9333ea'}];state.currentYear=2026;state.currentMonth=11;state.assignments={'2026-11-16':['s','p']};v2.roles={'2026-11-16':{p:'Primer',s:'Sekonder',o:'İzinli / Off day'},'2026-11-23':{p:'Mobil görev'}};");
const order=run("v2SortDay('2026-11-16',[state.physicians[2],state.physicians[1],state.physicians[0]]).map(e=>e.role).join('|')");
assert.equal(order,'Primer|Sekonder|İzinli / Off day','role sort does not depend on entry ordering');
const pdf=run('window.v2BuildPdf()');
assert.equal(pdf.type,'application/pdf');
assert.ok(pdf.size>650,'PDF content is nonempty');
assert.ok(drawn.some(x=>x.value.includes('ASMPLAN')),'branded PDF heading is drawn');
assert.ok(drawn.some(x=>x.value==='HEKİM GÖREV ÖZETİ'),'summary heading is drawn');
assert.ok(drawn.some(x=>x.value==='PRİMER'),'primer statistics drawn');
assert.ok(drawn.some(x=>x.value==='SEKONDER'),'secondary statistics drawn');
assert.ok(drawn.some(x=>x.value==='MOBİL GÖREV'),'mobile statistics drawn');
assert.ok(drawn.some(x=>x.value==='İZİNLİ / OFF'),'off-day statistics drawn');
const p=drawn.find(x=>x.value==='P  ·  PR');
const s=drawn.find(x=>x.value==='S  ·  SK');
const off=drawn.find(x=>x.value==='OFF  ·  OFF');
assert.ok(p&&s&&off&&p.y<s.y&&s.y<off.y,'PDF calendar visually orders primer, sekonder, off-day');
run('v2Print()');
assert.equal(shares.length,1,'iOS native share is called from PDF action');
assert.equal(shares[0].files[0].name,'ASMPlan-2026-11.pdf');
assert.equal(shares[0].files[0].type,'application/pdf');
assert.ok(!source[2].includes('window.print()'),'PDF export avoids unsupported iOS PWA print call');
pdf.arrayBuffer().then(buffer=>{
  const bytes=Buffer.from(buffer),text=bytes.toString('latin1');
  assert.ok(text.startsWith('%PDF-1.4'),'PDF signature is present');
  assert.ok(text.includes('/Type /Catalog'),'PDF catalog object exists');
  assert.ok(text.includes('/Filter /DCTDecode'),'JPEG image stream embedded');
  assert.ok(text.includes('xref')&&text.includes('%%EOF'),'PDF reference table and trailer exist');
  console.log('PASS: share, calendar order, monthly summary labels, PDF objects and file name');
}).catch(error=>{console.error(error);process.exitCode=1;});
