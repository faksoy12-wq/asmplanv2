/* ASMPlan V2 enhanced Safari/PWA workflow. All data remains on this device. */
const V2_ROLES = ['Primer','Sekonder','Mobil görev','İzinli / Off day','Görevli','Görev yok'];
const v2 = {
 roles: Storage.get('dailyRoles', {}),
 mobile: Storage.get('mobileDays', {}),
 weekly: Storage.get('weeklyOverrides', {}),
 selectedPhysician: '',
};
const v2Esc = s => String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const v2Dow = date => (new Date(date+'T12:00:00').getDay()+6)%7+1;
const v2Week = date => { const [y,m,d]=date.split('-').map(Number);return Math.floor((firstDayMondayIndex(y,m)+d-1)/7)+1; };
const v2WeekKey = (date,dow) => date.slice(0,7)+'-'+v2Week(date)+'-'+dow;
const v2Role = (date,id) => v2.roles[date]?.[id] || ((state.assignments[date]||[]).includes(id)?'Görevli':'Görev yok');
const v2Mobile = (date,id) => (v2.mobile[id]||[]).includes(v2Dow(date));
const v2Color = id => state.physicians.find(p=>p.id===id)?.color || '#64748b';
function v2Save(){ Storage.set('dailyRoles',v2.roles);Storage.set('mobileDays',v2.mobile);Storage.set('weeklyOverrides',v2.weekly); }
function v2EnsureUI(){
 const cal=document.getElementById('calendar-grid');
 if(!document.getElementById('v2-calendar-actions')){
   const a=document.createElement('div');a.id='v2-calendar-actions';a.className='v2-actions';
   a.innerHTML='<label class="v2-label">Hekim görünümü <select id="v2-filter"><option value="">Tüm hekimler</option></select></label><button id="v2-pdf" class="v2-btn">PDF / Yazdır</button>';
   cal.parentElement.after(a);
   document.getElementById('v2-filter').onchange=e=>{v2.selectedPhysician=e.target.value;renderCalendar();};
   document.getElementById('v2-pdf').onclick=()=>v2Print();
 }
 if(!document.getElementById('v2-day-detail')){
   const d=document.createElement('section');d.id='v2-day-detail';d.className='v2-panel';cal.parentElement.parentElement.appendChild(d);
 }
 if(!document.getElementById('v2-role-editor')){
   const d=document.createElement('section');d.id='v2-role-editor';d.className='v2-panel';el.sheetPhysicianList.after(d);
 }
 if(!document.getElementById('v2-mobile-editor')){
   const d=document.createElement('section');d.id='v2-mobile-editor';d.className='v2-panel';el.colorPicker.after(d);
 }
 if(!document.getElementById('v2-week-editor')){
   const d=document.createElement('section');d.id='v2-week-editor';d.className='v2-panel';el.templateDays.before(d);
 }
}
function v2FilterOptions(){
 const s=document.getElementById('v2-filter');if(!s)return;
 s.innerHTML='<option value="">Tüm hekimler</option>'+state.physicians.map(p=>'<option value="'+v2Esc(p.id)+'">'+v2Esc(p.name)+'</option>').join('');
 s.value=v2.selectedPhysician;
}
function v2Details(date){
 const target=document.getElementById('v2-day-detail');if(!target)return;
 const ids=state.physicians.filter(p=>!v2.selectedPhysician||p.id===v2.selectedPhysician);
 target.innerHTML='<strong>'+v2Esc(date)+' · Günlük görevler</strong>'+
 ids.map(p=>'<div class="v2-detail-row"><span class="v2-pill" style="background:'+v2Esc(p.color)+'">'+v2Esc(p.code)+'</span><span>'+v2Esc(p.name)+'</span><b>'+v2Esc(v2Role(date,p.id))+'</b></div>').join('')+
 '<button class="v2-btn" id="v2-edit-day">Görevleri düzenle</button>';
 document.getElementById('v2-edit-day').onclick=()=>openDailySheet(date);
}
const v2OldCalendar=renderCalendar;
renderCalendar=function(){
 v2OldCalendar();
 v2EnsureUI();v2FilterOptions();
 const y=state.currentYear,m=state.currentMonth;
 document.querySelectorAll('#calendar-grid .calendar-day:not(.empty)').forEach(cell=>{
   const d=Number(cell.querySelector('.day-number')?.textContent);if(!d)return;
   const date=toDateStr(y,m,d);
   const holder=cell.querySelector('.day-badges');if(!holder)return;
   const persons=state.physicians.filter(p=>!v2.selectedPhysician||p.id===v2.selectedPhysician);
   const hol=isHoliday(date),isWeekend=v2Dow(date)>5;
   const status=hol.isHoliday?'<span class="holiday-tag">'+v2Esc(hol.label)+'</span>':isWeekend?'<span class="weekend-closed-text">Kapalı</span>':'';
   holder.innerHTML=status+persons.map(p=>{
      const role=v2Role(date,p.id);
      if(role==='Görev yok')return '';
      return '<span class="v2-pill" style="background:'+v2Esc(p.color)+'">'+v2Esc(p.code)+' <small>'+v2Esc(role==='İzinli / Off day'?'OFF':role==='Sekonder'?'S':role==='Primer'?'P':role==='Mobil görev'?'M':'•')+'</small></span>';
   }).join('');
   cell.addEventListener('click',()=>v2Details(date));
 });
 const today=new Date(),todayStr=toDateStr(today.getFullYear(),today.getMonth()+1,today.getDate());
 v2Details(y===today.getFullYear()&&m===today.getMonth()+1?todayStr:toDateStr(y,m,1));
};
const v2OldOpen=openDailySheet;
openDailySheet=function(date){v2OldOpen(date);v2RenderRoles(date);};
function v2RenderRoles(date){
 const node=document.getElementById('v2-role-editor');if(!node)return;
 node.innerHTML='<h4>Günlük görev dağılımı</h4><p class="v2-muted">Primer, sekonder, izinli / off day veya mobil görevi seçin. Değişiklikler cihazda kaydedilir.</p>'+
 state.physicians.map(p=>'<label class="v2-role-row"><span>'+v2Esc(p.name)+'</span><select data-role-id="'+v2Esc(p.id)+'">'+V2_ROLES.map(role=>'<option '+(v2Role(date,p.id)===role?'selected':'')+'>'+v2Esc(role)+'</option>').join('')+'</select></label>').join('');
 node.querySelectorAll('select').forEach(s=>s.onchange=()=>{
   const id=s.dataset.roleId,role=s.value;
   v2.roles[date] ||= {};v2.roles[date][id]=role;
   const active=role==='Primer'||role==='Sekonder'||role==='Mobil görev';
   const ids=new Set(state.assignments[date]||[]);
   active?ids.add(id):ids.delete(id);
   if(ids.size)state.assignments[date]=[...ids];else delete state.assignments[date];
   Storage.set('assignments',state.assignments);v2Save();renderSheetPhysicians();renderCalendar();v2Details(date);
 });
}
const v2OldToggle=togglePhysicianAssignment;
togglePhysicianAssignment=function(id){
 const date=state.activeSheetDate;
 v2OldToggle(id);
 v2.roles[date] ||= {};
 v2.roles[date][id]=(state.assignments[date]||[]).includes(id)?'Primer':'Görev yok';
 v2Save();v2RenderRoles(date);v2Details(date);
};
const v2OldPhysModal=openPhysicianModal;
openPhysicianModal=function(p=null){v2OldPhysModal(p);v2MobileEditor(p);};
function v2MobileEditor(p){
 const node=document.getElementById('v2-mobile-editor');if(!node)return;
 node.innerHTML='<h4>Mobil görev günleri</h4><p class="v2-muted">Bu günler aylık plan oluşturulurken otomatik Mobil görev olarak işaretlenir. Günlük görevden değiştirebilirsiniz.</p>'+
 '<div class="v2-weekdays">'+TR_DAYS.slice(0,5).map((day,i)=>'<label><input type="checkbox" data-mobile-dow="'+(i+1)+'" '+((v2.mobile[p?.id]||[]).includes(i+1)?'checked':'')+'>'+v2Esc(day.slice(0,2))+'</label>').join('')+'</div>';
}
const v2OldSavePhys=savePhysician;
savePhysician=function(){
 const id=el.physicianEditId.value;
 if(!el.physicianNameInput.value.trim()){v2OldSavePhys();return;}
 v2OldSavePhys();
 const p=id?state.physicians.find(x=>x.id===id):state.physicians[state.physicians.length-1];
 if(p){v2.mobile[p.id]=[...document.querySelectorAll('[data-mobile-dow]:checked')].map(x=>Number(x.dataset.mobileDow));v2Save();}
};
const v2OldTemplate=renderTemplate;
renderTemplate=function(){
 v2OldTemplate();v2EnsureUI();
 const node=document.getElementById('v2-week-editor');
 node.innerHTML='<h4>Hafta bazlı plan</h4><p class="v2-muted">Seçili ayın haftaları için istisna tanımlayın. Mobil görev günleri çizelgede Mobil görev olarak görünür.</p>'+
 '<div class="v2-template-month"><button id="v2-tpl-prev" class="v2-btn" aria-label="Önceki ay">‹</button><strong>'+v2Esc(TR_MONTHS[state.currentMonth-1]+' '+state.currentYear)+'</strong><button id="v2-tpl-next" class="v2-btn" aria-label="Sonraki ay">›</button></div>'+ 
 '<label class="v2-label">Hafta <select id="v2-week-number">'+Array.from({length:Math.ceil((firstDayMondayIndex(state.currentYear,state.currentMonth)+daysInMonth(state.currentYear,state.currentMonth))/7)},(_,i)=>i+1).map(i=>'<option value="'+i+'">'+i+'. hafta</option>').join('')+'</select></label>'+
 '<div id="v2-week-chips"></div><button id="v2-week-reset" class="v2-btn">Haftalık istisnayı temizle</button>';
 for(const [id,delta] of [['v2-tpl-prev',-1],['v2-tpl-next',1]])document.getElementById(id).onclick=()=>{
  state.currentMonth+=delta;
  if(state.currentMonth<1){state.currentMonth=12;state.currentYear--;}
  if(state.currentMonth>12){state.currentMonth=1;state.currentYear++;}
  renderTemplate();renderCalendar();
 };
 const select=document.getElementById('v2-week-number');
 const draw=()=>{
  const w=select.value;
  const monthPrefix=state.currentYear+'-'+String(state.currentMonth).padStart(2,'0');
  document.getElementById('v2-week-chips').innerHTML=TR_DAYS.slice(0,5).map((day,i)=>{
    const dow=String(i+1),key=w+'-'+dow,ids=v2.weekly[monthPrefix+'-'+key]??state.template[dow]??[];
    return '<div class="v2-week-row"><b>'+v2Esc(day)+'</b><div>'+state.physicians.map(p=>'<label class="v2-week-chip"><input type="checkbox" data-wkey="'+key+'" data-pid="'+v2Esc(p.id)+'" '+(ids.includes(p.id)?'checked':'')+'>'+v2Esc(p.code)+'</label>').join('')+'</div></div>';
  }).join('');
  document.querySelectorAll('[data-wkey]').forEach(input=>input.onchange=()=>{
    const key=input.dataset.wkey,[,dow]=key.split('-');
    const scoped=monthPrefix+'-'+key;
    const ids=v2.weekly[scoped]??[...(state.template[dow]||[])];
    v2.weekly[scoped]=input.checked?[...new Set([...ids,input.dataset.pid])]:ids.filter(x=>x!==input.dataset.pid);
    v2Save();
  });
 };
 select.onchange=draw;draw();
 document.getElementById('v2-week-reset').onclick=()=>{
   Object.keys(v2.weekly).filter(k=>k.startsWith(state.currentYear+'-'+String(state.currentMonth).padStart(2,'0')+'-'+select.value+'-')).forEach(k=>delete v2.weekly[k]);
   v2Save();draw();showToast('Hafta istisnası temizlendi');
 };
};
applyTemplateToMonth=function(){
 const proposed=[],y=state.currentYear,m=state.currentMonth;
 for(let d=1;d<=daysInMonth(y,m);d++){
   const date=toDateStr(y,m,d),dow=v2Dow(date),week=v2Week(date);
   if(dow>5||isHoliday(date).isHoliday)continue;
   if(Object.prototype.hasOwnProperty.call(state.assignments,date)||Object.keys(v2.roles[date]||{}).length)continue;
   const baseIds=(v2.weekly[v2WeekKey(date,dow)]??state.template[String(dow)]??[]).filter(id=>state.physicians.some(p=>p.id===id));
   const mobileIds=state.physicians.filter(p=>v2Mobile(date,p.id)).map(p=>p.id);
   const ids=[...new Set([...baseIds,...mobileIds])];
   if(ids.length)proposed.push({date,ids,mobileIds});
 }
 if(!proposed.length){showToast('Yeni atanacak boş gün bulunamadı');return;}
 // No confirmation for additive, non-destructive planning; existing days are preserved.
 proposed.forEach(({date,ids,mobileIds})=>{
   state.assignments[date]=ids;
   v2.roles[date] ||= {};
   let position=0;
   ids.forEach(id=>{
     if(mobileIds.includes(id)){v2.roles[date][id]='Mobil görev';return;}
     v2.roles[date][id]=position===0?'Primer':position===1?'Sekonder':'Görevli';
     position++;
   });
 });
 Storage.set('assignments',state.assignments);v2Save();renderCalendar();showToast(proposed.length+' gün planlandı');
};
function v2Print(){
 const y=state.currentYear,m=state.currentMonth;
 const p=state.physicians.filter(x=>!v2.selectedPhysician||x.id===v2.selectedPhysician);
 if(!p.length){showToast('PDF için önce hekim ekleyin');return;}
 const labels=['Primer','Sekonder','Mobil görev','İzinli / Off day','Görevli'];
 const head=['Tarih',...labels].map(x=>'<th>'+v2Esc(x)+'</th>').join('');
 const rows=[];
 for(let d=1;d<=daysInMonth(y,m);d++){
  const date=toDateStr(y,m,d),dow=v2Dow(date);
  if(dow>5)continue;
  const holiday=isHoliday(date);
  const dateCell='<strong>'+d+' '+v2Esc(TR_DAYS[dow-1])+'</strong>'+(holiday.isHoliday?'<br><small>'+v2Esc(holiday.label)+'</small>':'');
  const cells=labels.map(role=>{
   const names=p.filter(x=>v2Role(date,x.id)===role).map(x=>v2Esc(x.name));
   return '<td>'+ (names.length?names.join('<br>'):'—') +'</td>';
  });
  rows.push('<tr><td>'+dateCell+'</td>'+cells.join('')+'</tr>');
 }
 let root=document.getElementById('v2-print-root');
 if(!root){root=document.createElement('div');root.id='v2-print-root';document.body.appendChild(root);}
 root.innerHTML='<h1>ASM Çalışma Çizelgesi</h1><h2>'+v2Esc(TR_MONTHS[m-1])+' '+y+(v2.selectedPhysician?' · '+v2Esc(p[0].name):'')+'</h2><table><thead><tr>'+head+'</tr></thead><tbody>'+rows.join('')+'</tbody></table><p>ASMPlan V2 · Aylık çalışma planı</p>';
 let style=document.getElementById('v2-print-style');
 if(!style){style=document.createElement('style');style.id='v2-print-style';document.head.appendChild(style);}
 style.textContent='@media screen{#v2-print-root{display:none}}@page{size:A4 landscape;margin:11mm}@media print{body>*:not(#v2-print-root){display:none!important}#v2-print-root{display:block!important;background:#fff!important;color:#111!important;font:11px Arial,sans-serif}#v2-print-root h1{font-size:18px;margin:0 0 4px}#v2-print-root h2{font-size:14px;margin:0 0 12px}#v2-print-root table{width:100%;border-collapse:collapse;table-layout:fixed}#v2-print-root th,#v2-print-root td{border:1px solid #9ca3af;padding:5px;vertical-align:top;overflow-wrap:anywhere}#v2-print-root th{background:#e2e8f0!important}#v2-print-root tr{break-inside:avoid}#v2-print-root p{font-size:9px;color:#64748b}}';
 window.print();
}
// Changes that erase records are the only actions requiring confirmation.
const v2OldClear=clearMonthAssignments;
clearMonthAssignments=function(){
 const y=state.currentYear,m=state.currentMonth,label=TR_MONTHS[m-1]+' '+y;
 if(!confirm(label+' ayının tüm günlük görevlerini silmek istiyor musunuz? Bu işlem geri alınamaz.'))return;
 for(let d=1;d<=daysInMonth(y,m);d++){
   const date=toDateStr(y,m,d);delete state.assignments[date];delete v2.roles[date];
 }
 Storage.set('assignments',state.assignments);v2Save();renderCalendar();showToast(label+' görevleri sıfırlandı');
};
const v2OldDeletePhysician=deletePhysician;
deletePhysician=function(){
 const id=el.physicianEditId.value;
 if(!id)return;
 const person=state.physicians.find(p=>p.id===id);
 if(!confirm((person?.name||'Hekim')+' silinsin mi? Eski çizelgelerdeki atamaları da kaldırılacak.'))return;
 v2OldDeletePhysician();
 delete v2.mobile[id];
 Object.values(v2.roles).forEach(day=>delete day[id]);
 Object.keys(v2.weekly).forEach(k=>{v2.weekly[k]=v2.weekly[k].filter(pid=>pid!==id);});
 Object.keys(state.assignments).forEach(date=>{if(!state.assignments[date]?.length)delete state.assignments[date];});
 Storage.set('assignments',state.assignments);v2Save();
};
