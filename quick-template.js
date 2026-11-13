/* ASMPlan V2 · Hızlı aylık şablon.
   This editor stores selections separately from the live roster.
   Nothing is applied to the main calendar until the user chooses "Şablonu Yükle". */
(function () {
  'use strict';
  const quick = {
    selectedId: null,
    days: Storage.get('quickTemplateDays', {}),
    mobileExcluded: Storage.get('quickTemplateMobileExcluded', {}),
    undo: null
  };
  const keyMonth = () => state.currentYear+'-'+String(state.currentMonth).padStart(2,'0');
  const inMonth = date => date.startsWith(keyMonth()+'-');
  const clone = value => JSON.parse(JSON.stringify(value));
  const safeColor = color => /^#[0-9a-fA-F]{6}$/.test(color||'')?color:'#0D9488';
  const docs = () => state.physicians;
  const hasPhysician = id => docs().some(p=>p.id===id);
  const workDay = date => v2Dow(date)<=5&&!isHoliday(date).isHoliday;
  const isAutomatic = (date,id) => hasPhysician(id)&&workDay(date)&&v2Mobile(date,id);
  const validIds = list => [...new Set((Array.isArray(list)?list:[]).filter(hasPhysician))];

  function save() {
    Storage.set('quickTemplateDays',quick.days);
    Storage.set('quickTemplateMobileExcluded',quick.mobileExcluded);
  }
  function captureUndo() {
    quick.undo={days:clone(quick.days),excluded:clone(quick.mobileExcluded)};
  }
  function undoChange(){
    if(!quick.undo)return;
    quick.days=quick.undo.days;
    quick.mobileExcluded=quick.undo.excluded;
    quick.undo=null;
    save();updateAll();showToast('Şablon seçimi geri alındı');
  }
  function dateIds(date){
    const chosen=validIds(quick.days[date]);
    const excluded=quick.mobileExcluded[date]||[];
    const automatic=docs().filter(p=>isAutomatic(date,p.id)&&!excluded.includes(p.id)).map(p=>p.id);
    return validIds([...chosen,...automatic]);
  }
  function toggleDate(date,id){
    if(!hasPhysician(id)||!inMonth(date))return false;
    captureUndo();
    const active=dateIds(date).includes(id);
    const selected=validIds(quick.days[date]);
    const ignored=validIds(quick.mobileExcluded[date]);
    const auto=isAutomatic(date,id);
    if(active){
      quick.days[date]=selected.filter(x=>x!==id);
      if(auto)quick.mobileExcluded[date]=validIds([...ignored,id]);
    }else{
      quick.mobileExcluded[date]=ignored.filter(x=>x!==id);
      if(!auto)quick.days[date]=validIds([...selected,id]);
    }
    if(!quick.days[date]?.length)delete quick.days[date];
    if(!quick.mobileExcluded[date]?.length)delete quick.mobileExcluded[date];
    save();
    return true;
  }
  function bulk(mode,id){
    if(!hasPhysician(id))return;
    captureUndo();
    let changes=0;
    for(let d=1;d<=daysInMonth(state.currentYear,state.currentMonth);d++){
      const date=toDateStr(state.currentYear,state.currentMonth,d);
      if(mode==='fill'&&!workDay(date))continue;
      const active=dateIds(date).includes(id),desired=mode==='fill';
      if(active===desired)continue;
      const selected=validIds(quick.days[date]),ignored=validIds(quick.mobileExcluded[date]);
      const auto=isAutomatic(date,id);
      if(desired){
        quick.mobileExcluded[date]=ignored.filter(x=>x!==id);
        if(!auto)quick.days[date]=validIds([...selected,id]);
      }else{
        quick.days[date]=selected.filter(x=>x!==id);
        if(auto)quick.mobileExcluded[date]=validIds([...ignored,id]);
      }
      if(!quick.days[date]?.length)delete quick.days[date];
      if(!quick.mobileExcluded[date]?.length)delete quick.mobileExcluded[date];
      changes++;
    }
    save();updateAll();
    showToast(changes?changes+' gün güncellendi':'Değişiklik yok');
  }
  function monthPlan(){
    const result=[];
    for(let d=1;d<=daysInMonth(state.currentYear,state.currentMonth);d++){
      const date=toDateStr(state.currentYear,state.currentMonth,d);
      const ids=dateIds(date);
      if(ids.length)result.push({date,ids});
    }
    return result;
  }
  function applyPlan(){
    const plan=monthPlan();
    if(!plan.length){showToast('Önce şablonda hekim ve gün seçin');return {updated:0,skipped:0};}
    const same=(a,b)=>a.length===b.length&&a.every(id=>b.includes(id));
    const conflicts=plan.filter(({date,ids})=>{
      const previous=validIds(state.assignments[date]);
      const hasEdit=Object.prototype.hasOwnProperty.call(state.assignments,date)||
        Object.keys(v2.roles[date]||{}).length>0;
      return hasEdit&&!same(ids,previous);
    });
    let overwrite=false;
    if(conflicts.length){
      overwrite=confirm(conflicts.length+' günün mevcut planı farklı. Bu günleri yeni şablonla değiştirmek ister misiniz?\n\nTamam: Seçilen günleri güncelle.\nİptal: Mevcut günleri koru, yalnızca boş günleri yükle.');
    }
    let updated=0,skipped=0;
    for(const {date,ids} of plan){
      const oldIds=validIds(state.assignments[date]);
      const hasEdit=Object.prototype.hasOwnProperty.call(state.assignments,date)||
        Object.keys(v2.roles[date]||{}).length>0;
      if(hasEdit&&same(ids,oldIds)){skipped++;continue;}
      if(hasEdit&&!overwrite){skipped++;continue;}
      const prior=v2.roles[date]||{},newRoles={};
      ids.forEach(id=>{
        const preserved=oldIds.includes(id)?prior[id]:null;
        // Existing explicit daily roles survive; new selections are intentionally
        // generic so the ASM manager can assign Primer, Sekonder and Off day later.
        newRoles[id]=preserved&&preserved!=='Görev yok'&&preserved!=='İzinli / Off day'
          ?preserved:(isAutomatic(date,id)?'Mobil görev':'Görevli');
      });
      state.assignments[date]=[...ids];
      v2.roles[date]=newRoles;
      updated++;
    }
    if(updated){
      Storage.set('assignments',state.assignments);
      v2Save();
      renderCalendar();
      showToast(updated+' gün takvime yüklendi · Günlere dokunarak görevleri düzenle');
    }else{
      showToast('Yeni gün yüklenmedi; mevcut kayıtlar korundu');
    }
    return {updated,skipped,conflicts:conflicts.length,overwritten:overwrite};
  }
  function person(){
    if(!hasPhysician(quick.selectedId))quick.selectedId=docs()[0]?.id||null;
    return docs().find(p=>p.id===quick.selectedId)||null;
  }
  function physicianSelector(){
    const selected=person();
    const node=document.getElementById('qtpl-physicians');
    if(!node)return;
    if(!docs().length){
      node.innerHTML='<div class="qtpl-no-doctors">Henüz hekim eklenmemiş. <button type="button" id="qtpl-add-physician">Hekimlere Git</button></div>';
      node.querySelector('#qtpl-add-physician').onclick=()=>document.querySelector('[data-tab="physicians"]')?.click();
      return;
    }
    const scrollLeft=node.scrollLeft,scrollTop=node.scrollTop;
    node.innerHTML=docs().map(p=>{
      const active=p.id===selected?.id;
      const count=monthPlan().filter(day=>day.ids.includes(p.id)).length;
      return '<button type="button" class="qtpl-person'+(active?' is-active':'')+'" data-tpl-person="'+v2Esc(p.id)+'" aria-pressed="'+active+'">'+
      '<span class="qtpl-person-mark" style="background:'+safeColor(p.color)+'">'+v2Esc(p.code||p.name.slice(0,2))+'</span>'+
      '<span class="qtpl-person-label"><strong>'+v2Esc(p.name)+'</strong><small>'+count+' gün seçili</small></span>'+
      (active?'<span class="qtpl-person-check" aria-hidden="true">✓</span>':'')+'</button>';
    }).join('');
    node.scrollLeft=scrollLeft;node.scrollTop=scrollTop;
  }
  function dayCell(date,d,offset){
    const ids=dateIds(date);
    const who=person();
    const current=who&&ids.includes(who.id);
    const dow=v2Dow(date),hol=isHoliday(date);
    const weekend=dow>5;
    const chips=ids.slice(0,3).map(id=>{
      const p=docs().find(x=>x.id===id);
      if(!p)return '';
      return '<span class="qtpl-day-chip'+(id===who?.id?' is-selected':'')+'" style="background:'+safeColor(p.color)+'">'+
        v2Esc(p.code||p.name.slice(0,2))+(isAutomatic(date,id)?'<span class="qtpl-mobile-letter">M</span>':'')+'</span>';
    }).join('');
    const rest=ids.length>3?'<span class="qtpl-more">+'+(ids.length-3)+'</span>':'';
    const stateText=hol.isHoliday?'Tatil':weekend?'Kapalı':'';
    const label=d+' '+TR_MONTHS[state.currentMonth-1]+' '+state.currentYear+
      (who?', '+who.name+' için '+(current?'seçili':'seçilmedi'):'');
    return '<button type="button" class="qtpl-day'+(weekend?' is-weekend':'')+(hol.isHoliday?' is-holiday':'')+(current?' has-current':'')+
      '" data-tpl-date="'+date+'" aria-label="'+v2Esc(label)+'" aria-pressed="'+Boolean(current)+'"'+
      (who?'':' disabled')+'>'+
      '<span class="qtpl-day-head"><b>'+d+'</b>'+(current?'<span class="qtpl-tick" aria-hidden="true">✓</span>':'')+'</span>'+
      '<span class="qtpl-day-chips">'+chips+rest+'</span>'+
      (stateText?'<span class="qtpl-closed-label">'+stateText+'</span>':'')+
      '</button>';
  }
  function renderDays(){
    const node=document.getElementById('qtpl-grid');
    if(!node)return;
    const days=daysInMonth(state.currentYear,state.currentMonth);
    const before=firstDayMondayIndex(state.currentYear,state.currentMonth);
    const leading=Array.from({length:before},()=>'<div class="qtpl-placeholder" aria-hidden="true"></div>').join('');
    const cells=Array.from({length:days},(_,i)=>{
      const d=i+1;
      return dayCell(toDateStr(state.currentYear,state.currentMonth,d),d,before);
    }).join('');
    node.innerHTML=leading+cells;
    const gridRows=Math.ceil((before+days)/7);
    node.style.setProperty('--qtpl-rows',gridRows);
  }
  function updateStats(){
    const selected=person(),total=monthPlan().length;
    const node=document.getElementById('qtpl-stats');
    if(node)node.textContent=total+' planlı gün'+(selected?' · '+monthPlan().filter(day=>day.ids.includes(selected.id)).length+' gün '+selected.name:'');
    const undo=document.getElementById('qtpl-undo');
    if(undo)undo.hidden=!quick.undo;
  }
  function updateAll(){
    physicianSelector();renderDays();updateStats();
  }
  function switchMonth(delta){
    state.currentMonth+=delta;
    if(state.currentMonth<1){state.currentMonth=12;state.currentYear--;}
    if(state.currentMonth>12){state.currentMonth=1;state.currentYear++;}
    quick.undo=null;
    renderTemplate();renderCalendar();
  }
  function switchCalendar(){
    const tab=document.querySelector('#tab-bar [data-tab="calendar"]');
    if(tab)tab.click();
    else renderCalendar();
  }
  function displayTemplate(){
    const target=el.templateDays;
    if(!target)return;
    document.getElementById('v2-week-editor')?.remove();
    target.classList.add('qtpl-host');
    target.innerHTML='<div class="qtpl-workspace">'+
      '<section class="qtpl-main" aria-label="Aylık hızlı şablon takvimi">'+
        '<div class="qtpl-month-bar">'+
          '<button type="button" class="qtpl-month-btn" id="qtpl-prev" aria-label="Önceki ay">‹</button>'+
          '<div class="qtpl-month-title"><strong>'+TR_MONTHS[state.currentMonth-1]+' '+state.currentYear+'</strong><span>Hızlı hekim yerleştirme</span></div>'+
          '<button type="button" class="qtpl-month-btn" id="qtpl-next" aria-label="Sonraki ay">›</button>'+
        '</div>'+
        '<div class="qtpl-weekdays">'+TR_DAYS.map((d,i)=>'<span'+(i>4?' class="qtpl-weekend"':'')+'>'+v2Esc(d.slice(0,2))+'</span>').join('')+'</div>'+
        '<div class="qtpl-grid" id="qtpl-grid" role="group" aria-label="Hekim seçerek günleri işaretleyin"></div>'+
        '<div class="qtpl-stats" id="qtpl-stats" aria-live="polite"></div>'+
        '<div class="qtpl-bottom-actions"><button type="button" class="qtpl-submit" id="qtpl-apply">Şablonu Takvime Yükle</button>'+
          '<button type="button" class="qtpl-back" id="qtpl-go-calendar">Takvime geç</button></div>'+
      '</section>'+
      '<aside class="qtpl-sidebar" aria-label="Hekim seçimi">'+
        '<div class="qtpl-side-heading"><strong>Hekimi seç</strong><span>Ardından takvimde günlere dokun</span></div>'+
        '<div class="qtpl-physicians" id="qtpl-physicians"></div>'+
        '<div class="qtpl-quick-actions"><button type="button" id="qtpl-fill">Hafta içlerini seç</button>'+
          '<button type="button" id="qtpl-clear">Gün seçimlerini temizle</button>'+
          '<button type="button" id="qtpl-undo" hidden>↶ Geri al</button></div>'+
        '<p class="qtpl-help"><b>M</b> işareti, hekimin kayıtlı mobil gününü gösterir. Şablonda sadece gün seçersin; Primer, Sekonder ve izin detaylarını ana takvimde düzenlersin.</p>'+
      '</aside>'+
    '</div>';
    target.querySelector('#qtpl-prev').onclick=()=>switchMonth(-1);
    target.querySelector('#qtpl-next').onclick=()=>switchMonth(1);
    target.querySelector('#qtpl-physicians').onclick=e=>{
      const button=e.target.closest('[data-tpl-person]');
      if(!button)return;
      quick.selectedId=button.dataset.tplPerson;triggerHaptic();
      updateAll();
    };
    target.querySelector('#qtpl-grid').onclick=e=>{
      const button=e.target.closest('[data-tpl-date]');
      if(!button||!quick.selectedId)return;
      if(toggleDate(button.dataset.tplDate,quick.selectedId)){triggerHaptic();updateAll();}
    };
    target.querySelector('#qtpl-fill').onclick=()=>{if(quick.selectedId)bulk('fill',quick.selectedId);};
    target.querySelector('#qtpl-clear').onclick=()=>{if(quick.selectedId)bulk('clear',quick.selectedId);};
    target.querySelector('#qtpl-undo').onclick=undoChange;
    target.querySelector('#qtpl-apply').onclick=()=>{const result=applyPlan();if(result.updated)switchCalendar();};
    target.querySelector('#qtpl-go-calendar').onclick=switchCalendar;
    updateAll();
  }
  // Only the quick editor replaces the old weekly UI. Legacy templates stay
  // in localStorage unchanged, but no longer overwrite month-specific choices.
  renderTemplate=displayTemplate;
  applyTemplateToMonth=applyPlan;
  window.asmQuickTemplate={
    toggleDate, dateIds, monthPlan, applyPlan, bulk, undoChange,
    getDraft:()=>({days:clone(quick.days),mobileExcluded:clone(quick.mobileExcluded)}),
    setSelected:id=>{if(hasPhysician(id))quick.selectedId=id;},
    getSelected:()=>quick.selectedId
  };
})();
