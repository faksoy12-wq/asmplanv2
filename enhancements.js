/* ASMPlan V2 enhanced Safari/PWA workflow. All data remains on this device. */
const V2_ROLES = ['Primer','Sekonder','İzinli / Off day','Mobil görev','Görev yok'];
const v2 = {
 roles: Storage.get('dailyRoles', {}),
 mobile: Storage.get('mobileDays', {}),
 weekly: Storage.get('weeklyOverrides', {}),
 selectedPhysician: '',
};
const v2Esc = s => String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const v2Dow = date => (new Date(date+'T12:00:00').getDay()+6)%7+1;
const v2Week = date => Math.ceil(Number(date.slice(8))/7);
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
   holder.innerHTML=persons.map(p=>{
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
 v2OldSavePhys();
 const p=id?state.physicians.find(x=>x.id===id):state.physicians[state.physicians.length-1];
 if(p){v2.mobile[p.id]=[...document.querySelectorAll('[data-mobile-dow]:checked')].map(x=>Number(x.dataset.mobileDow));v2Save();}
};
const v2OldTemplate=renderTemplate;
renderTemplate=function(){
 v2OldTemplate();v2EnsureUI();
 const node=document.getElementById('v2-week-editor');
 node.innerHTML='<h4>Hafta bazlı plan</h4><p class="v2-muted">Seçili ayın haftaları için istisna tanımlayın. Mobil görev günleri çizelgede Mobil görev olarak görünür.</p>'+
 '<label class="v2-label">Hafta <select id="v2-week-number">'+[1,2,3,4,5,6].map(i=>'<option value="'+i+'">'+i+'. hafta</option>').join('')+'</select></label>'+
 '<div id="v2-week-chips"></div><button id="v2-week-reset" class="v2-btn">Haftalık istisnayı temizle</button>';
 const select=document.getElementById('v2-week-number');
 const draw=()=>{
  const w=select.value;
  const monthPrefix=state.currentYear+'-'+String(state.currentMonth).padStart(2,'0');
  document.getElementById('v2-week-chips').innerHTML=TR_DAYS.slice(0,5).map((day,i)=>{
    const dow=String(i+1),key=w+'-'+dow,ids=v2.weekly[monthPrefix+'-'+key]??state.template[dow]??[];
    return '<div class="v2-week-row"><b>'+v2Esc(day)+'</b><div>'+state.physicians.map(p=>'<label class="v2-week-chip"><input type="checkbox" data-wkey="'+key+'" data-pid="'+v2Esc(p.id)+'" '+(ids.includes(p.id)?'checked':'')+'>'+v2Esc(p.code)+'</label>').join('')+'</div></div>';
  }).join('');
  document.querySelectorAll('[data-wkey]').forEach(input=>input.onchange=()=>{
    const key=input.dataset.wkey,[week,dow]=key.split('-');
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
   if(Object.prototype.hasOwnProperty.call(state.assignments,date))continue;
   const baseIds=v2.weekly[v2WeekKey(date,dow)]??state.template[String(dow)]??[];
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
   ids.forEach(id=>{v2.roles[date][id]=mobileIds.includes(id)?'Mobil görev':position++===0?'Primer':position===2?'Sekonder':'Görevli';});
 });
 Storage.set('assignments',state.assignments);v2Save();renderCalendar();showToast(proposed.length+' gün planlandı');
};
function v2Print(){
 const y=state.currentYear,m=state.currentMonth,rows=[];
 for(let d=1;d<=daysInMonth(y,m);d++){
  const date=toDateStr(y,m,d),dow=v2Dow(date);
  if(dow>5)continue;
  const p=state.physicians.filter(x=>!v2.selectedPhysician||x.id===v2.selectedPhysician);
  rows.push('<tr><td>'+d+' '+v2Esc(TR_DAYS[dow-1])+'</td>'+p.map(x=>'<td>'+v2Esc(x.name)+'<br>'+v2Esc(v2Role(date,x.id))+'</td>').join('')+'</tr>');
 }
 const p=state.physicians.filter(x=>!v2.selectedPhysician||x.id===v2.selectedPhysician);
 const w=window.open('','_blank');
 if(!w){showToast('PDF için açılır pencereye izin verin');return;}
 w.document.write('<!doctype html><html lang="tr"><head><meta charset="utf-8"><title>ASM Çizelgesi</title><style>body{font:12px Arial;padding:20px}table{border-collapse:collapse;width:100%}td,th{border:1px solid #ccc;padding:7px;text-align:left}tr:nth-child(even){background:#f4f4f4}h1{font-size:20px}@page{size:A4 landscape;margin:12mm}</style></head><body><h1>ASM Çalışma Çizelgesi · '+v2Esc(TR_MONTHS[m-1])+' '+y+'</h1><table><thead><tr><th>Tarih</th>'+p.map(x=>'<th>'+v2Esc(x.code)+'</th>').join('')+'</tr></thead><tbody>'+rows.join('')+'</tbody></table><p>Safari: Paylaş → Yazdır → PDF olarak kaydet veya paylaş.</p></body></html>');
 w.document.close();w.focus();setTimeout(()=>w.print(),400);
}
