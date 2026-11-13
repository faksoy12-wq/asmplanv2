/* ASMPlan V2 · Hızlı aylık şablon.
   This editor stores selections separately from the live roster.
   Nothing is applied to the main calendar until the user chooses "Şablonu Yükle". */
(function () {
  'use strict';
  const quick = {
    selectedId: null,
    selectedRole: Storage.get('quickTemplateCurrentRole', 'Primer'),
    roles: Storage.get('quickTemplateRoles', {}),
    days: Storage.get('quickTemplateDays', {}),
    mobileExcluded: Storage.get('quickTemplateMobileExcluded', {}),
    undo: null
  };
  const ROLES=[{name:'Primer',short:'P',color:'#0D9077'},{name:'Sekonder',short:'S',color:'#326AD1'},{name:'Mobil görev',short:'M',color:'#C4892C'},{name:'İzinli / Off day',short:'OFF',color:'#8158A9'}];
  const ROLE_ORDER={'Primer':0,'Sekonder':1,'Mobil görev':2,'Görevli':3,'İzinli / Off day':4};
  const roleLabel = role => ROLES.find(r=>r.name===role)?.short||(role==='Görevli'?'G':'');
  const allowedRole = role => ROLES.some(r=>r.name===role);
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
    Storage.set('quickTemplateRoles',quick.roles);
  }
  function captureUndo() {
    quick.undo={days:clone(quick.days),excluded:clone(quick.mobileExcluded),roles:clone(quick.roles)};
  }
  function undoChange(){
    if(!quick.undo)return;
    quick.days=quick.undo.days;
    quick.mobileExcluded=quick.undo.excluded;
    quick.roles=quick.undo.roles;
    quick.undo=null;
    save();updateAll();showToast('Son değişiklik geri alındı');
  }
  // Existing v22 untyped selections remain "Görevli" until the physician's
  // role is explicitly chosen. A saved role overrides auto mobile defaults.
  function dateRoles(date){
    const roles={};
    validIds(quick.days[date]).forEach(id=>{roles[id]='Görevli';});
    const excluded=validIds(quick.mobileExcluded[date]);
    docs().forEach(p=>{
      if(isAutomatic(date,p.id)&&!excluded.includes(p.id))roles[p.id]='Mobil görev';
    });
    Object.entries(quick.roles[date]||{}).forEach(([id,role])=>{
      if(hasPhysician(id)&&(allowedRole(role)||role==='Görevli'))roles[id]=role;
    });
    return roles;
  }
  function dateIds(date){
    return validIds(Object.keys(dateRoles(date)));
  }
  function setRole(date,id,role){
    if(!hasPhysician(id)||!inMonth(date)||(role!==null&&!allowedRole(role)))return false;
    const current=dateRoles(date)[id]||null;
    if(current===role)return false;
    const legacy=validIds(quick.days[date]).filter(p=>p!==id);
    if(legacy.length)quick.days[date]=legacy;else delete quick.days[date];
    const explicit={...(quick.roles[date]||{})};
    delete explicit[id];
    if(role)explicit[id]=role;
    if(Object.keys(explicit).length)quick.roles[date]=explicit;else delete quick.roles[date];
    const ignored=validIds(quick.mobileExcluded[date]).filter(p=>p!==id);
    // Unselecting a recurring mobile day must not re-add it immediately.
    if(role===null&&isAutomatic(date,id))ignored.push(id);
    if(ignored.length)quick.mobileExcluded[date]=ignored;else delete quick.mobileExcluded[date];
    return true;
  }
  function toggleDate(date,id,role=quick.selectedRole){
    if(!hasPhysician(id)||!inMonth(date)||!allowedRole(role))return false;
    captureUndo();
    const active=dateRoles(date)[id]||null;
    if(!setRole(date,id,active===role?null:role))return false;
    save();return true;
  }
  function bulk(mode,id){
    if(!hasPhysician(id))return;
    captureUndo();
    let changes=0;
    for(let d=1;d<=daysInMonth(state.currentYear,state.currentMonth);d++){
      const date=toDateStr(state.currentYear,state.currentMonth,d);
      if(mode==='fill'&&!workDay(date))continue;
      const role=mode==='fill'?quick.selectedRole:null;
      if(setRole(date,id,role))changes++;
    }
    save();updateAll();
    showToast(changes?changes+' gün güncellendi':'Değişiklik yok');
  }
  function monthPlan(){
    const result=[];
    for(let d=1;d<=daysInMonth(state.currentYear,state.currentMonth);d++){
      const date=toDateStr(state.currentYear,state.currentMonth,d);
      const roles=dateRoles(date),allIds=validIds(Object.keys(roles));
      if(!allIds.length)continue;
      const ids=allIds.filter(id=>roles[id]!=='İzinli / Off day');
      result.push({date,ids,roles});
    }
    return result;
  }
  function liveRoles(date){
    const roles={};
    const ids=validIds(state.assignments[date]);
    ids.forEach(id=>{roles[id]=v2Role(date,id);});
    Object.entries(v2.roles[date]||{}).forEach(([id,role])=>{
      if(hasPhysician(id)&&role!=='Görev yok')roles[id]=role;
    });
    return roles;
  }
  function applyPlan(){
    const plan=monthPlan();
    if(!plan.length){showToast('Önce şablonda hekim, görev ve gün seçin');return {updated:0,skipped:0};}
    const same=(a,b)=>a.length===b.length&&a.every(id=>b.includes(id));
    const conflicts=plan.filter(({date,ids,roles})=>{
      const previous=validIds(state.assignments[date]);
      const hasEdit=Object.prototype.hasOwnProperty.call(state.assignments,date)||
        Object.keys(v2.roles[date]||{}).length>0;
      if(!hasEdit)return false;
      const live=liveRoles(date);
      const wanted={};
      Object.entries(roles).forEach(([id,role])=>{
        wanted[id]=role==='Görevli'&&live[id]&&live[id]!=='Görev yok'?live[id]:role;
      });
      return !same(ids,previous)||
        Object.keys(live).length!==Object.keys(wanted).length||
        Object.entries(wanted).some(([id,role])=>live[id]!==role);
    });
    let overwrite=false;
    if(conflicts.length){
      overwrite=confirm(conflicts.length+' günde mevcut görevlerle şablon farklı. Günleri şablona göre güncellemek ister misiniz?\n\nTamam: Değiştir.\nİptal: Mevcut günleri koru ve yalnızca boş günleri yükle.');
    }
    const conflicting=new Set(conflicts.map(item=>item.date));
    let updated=0,skipped=0;
    for(const {date,ids,roles} of plan){
      const exists=Object.prototype.hasOwnProperty.call(state.assignments,date)||
        Object.keys(v2.roles[date]||{}).length>0;
      if(exists&&(!conflicting.has(date)||!overwrite)){skipped++;continue;}
      const live=liveRoles(date);
      const wanted={};
      Object.entries(roles).forEach(([id,role])=>{
        wanted[id]=role==='Görevli'&&live[id]&&live[id]!=='Görev yok'?live[id]:role;
      });
      if(ids.length)state.assignments[date]=[...ids];
      else delete state.assignments[date];
      v2.roles[date]=wanted;
      updated++;
    }
    if(updated){
      Storage.set('assignments',state.assignments);
      v2Save();renderCalendar();
      showToast(updated+' gün ve görevleri takvime yüklendi');
    }else{
      showToast('Mevcut takvim korundu; değişiklik yok');
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
