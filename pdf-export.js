/* ASMPlan V2: standalone iOS PWA-compatible, offline PDF creation and native file sharing.
   Uses local Canvas + JPEG/PDF encoding, no network, printer dialog or third-party library. */
(function () {
  'use strict';
  const PAGE_W=2200, PAGE_H=1556, PDF_W=841.89, PDF_H=595.28;
  const M=70, CONTENT=PAGE_W-2*M;
  const NAVY='#14263D', INK='#172A42', SUB='#6D7C90', TEAL='#0D9488', EDGE='#E2EAF2';
  const ROLE_INFO=[
    {name:'Primer', short:'P', title:'PRİMER', color:'#087D69'},
    {name:'Sekonder', short:'S', title:'SEKONDER', color:'#3867C8'},
    {name:'Mobil görev', short:'M', title:'MOBİL GÖREV', color:'#A86E20'},
    {name:'İzinli / Off day',short:'OFF', title:'İZİNLİ / OFF',color:'#7D5AA9'},
    {name:'Görevli',short:'G', title:'DİĞER GÖREV',color:'#64748B'}
  ];
  function sortedDay(date, people) { return v2SortDay(date,people).filter(e=>e.role!=='Görev yok'); }
  window.v2DutyOrder=sortedDay;
  function rect(ctx,x,y,w,h,r,fill,stroke) {
    r=Math.min(r,w/2,h/2);ctx.beginPath();
    ctx.moveTo(x+r,y);ctx.lineTo(x+w-r,y);ctx.quadraticCurveTo(x+w,y,x+w,y+r);
    ctx.lineTo(x+w,y+h-r);ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h);
    ctx.lineTo(x+r,y+h);ctx.quadraticCurveTo(x,y+h,x,y+h-r);
    ctx.lineTo(x,y+r);ctx.quadraticCurveTo(x,y,x+r,y);
    ctx.closePath();if(fill){ctx.fillStyle=fill;ctx.fill();}
    if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=2;ctx.stroke();}
  }
  function txt(ctx,value,x,y,size=22,color=INK,weight=400,align='left') {
    ctx.fillStyle=color;ctx.font=weight+' '+size+'px Arial, Helvetica, sans-serif';
    ctx.textAlign=align;ctx.textBaseline='alphabetic';ctx.fillText(String(value),x,y);
    ctx.textAlign='left';
  }
  function fit(ctx,value,x,y,maxWidth,size=22,minSize=14,color=INK,weight=400) {
    for(let current=size;current>=minSize;current--){
      ctx.font=weight+' '+current+'px Arial, Helvetica, sans-serif';
      if(ctx.measureText(String(value)).width<=maxWidth){txt(ctx,value,x,y,current,color,weight);return;}
    }
    // Do not drop date details; an extra line is preferable to cutting information.
    txt(ctx,value,x,y,minSize,color,weight);
  }
  function header(ctx,year,month,label='AYLIK ÇALIŞMA PLANI'){
    rect(ctx,M,47,CONTENT,154,28,NAVY);
    rect(ctx,M+25,73,8,100,4,TEAL);
    txt(ctx,'ASMPLAN  /  '+label,M+58,94,20,'#B1D2D2',700);
    txt(ctx,TR_MONTHS[month-1].toLocaleUpperCase('tr-TR')+' '+year,M+57,158,56,'#FFFFFF',700);
    txt(ctx,'AİLE SAĞLIĞI MERKEZİ',M+CONTENT-46,117,24,'#D9E5F0',600,'right');
    txt(ctx,'HEKİM GÖREV DAĞILIMI',M+CONTENT-46,159,21,'#B1D2D2',400,'right');
  }
  function canvasPage() {
    const c=document.createElement('canvas');
    c.width=PAGE_W;c.height=PAGE_H;
    const ctx=c.getContext('2d',{alpha:false});
    if(!ctx)throw new Error('Canvas bağlamı oluşturulamadı');
    ctx.fillStyle='#F5F8FC';ctx.fillRect(0,0,PAGE_W,PAGE_H);
    return {canvas:c,ctx};
  }
  function calendar(ctx,year,month,physicians) {
    const x=M,y=224,w=CONTENT,h=708;
    rect(ctx,x,y,w,h,25,'#FFFFFF',EDGE);
    const short=['Pt','Sa','Ça','Pe','Cu','Ct','Pz'];
    const innerX=x+20, innerW=w-40, gap=8, col=(innerW-gap*6)/7;
    short.forEach((label,i)=>txt(ctx,label,innerX+i*(col+gap)+col/2,y+54,22,i>4?'#9AA8B7':SUB,700,'center'));
    const start=firstDayMondayIndex(year,month), total=daysInMonth(year,month);
    const top=y+72, rowH=97, rowGap=8;
    const today=new Date(),todayKey=toDateStr(today.getFullYear(),today.getMonth()+1,today.getDate());
    for(let pos=0;pos<42;pos++){
      const d=pos-start+1,week=Math.floor(pos/7),colIndex=pos%7;
      const cx=innerX+colIndex*(col+gap),cy=top+week*(rowH+rowGap);
      if(d<1||d>total){rect(ctx,cx,cy,col,rowH,12,'#F9FBFD');continue;}
      const date=toDateStr(year,month,d),holiday=isHoliday(date),weekend=colIndex>=5;
      let bg=holiday.isHoliday?'#FFF1F1':weekend?'#F2F5F9':'#F8FBFD';
      rect(ctx,cx,cy,col,rowH,12,bg,date===todayKey?'#0D9488':EDGE);
      txt(ctx,d,cx+12,cy+25,21,holiday.isHoliday?'#C24142':INK,700);
      if(holiday.isHoliday){
        fit(ctx,holiday.label,cx+42,cy+25,col-50,13,10,'#B54646',600);
      } else if(weekend){
        txt(ctx,'Kapalı',cx+col-11,cy+24,13,'#8E9AA9',400,'right');
      }
      const entries=sortedDay(date,physicians);
      // Priority order stays consistent: Primer, Sekonder, Mobil, other, Off.
      const visible=entries.length>4?entries.slice(0,3):entries;
      visible.forEach((entry,i)=>{
        const ry=cy+(visible.length===4?29:34)+i*(visible.length===4?17:20);
        const role=ROLE_INFO.find(r=>r.name===entry.role);
        const color=entry.p.color||'#64748B';
        rect(ctx,cx+9,ry,col-18,visible.length===4?16:18,6,color);
        let name=entry.p.code||entry.p.name||'';
        let text=(role?.short||'G')+'  ·  '+name;
        fit(ctx,text,cx+18,ry+(visible.length===4?12:14),col-34,visible.length===4?13:15,11,'#FFFFFF',700);
      });
      if(entries.length>4){
        txt(ctx,'+ '+(entries.length-3)+' görev',cx+10,cy+93,12,SUB,600);
      }
    }
  }
  function collect(year,month,physicians){
    const result=[];
    for(const p of physicians){
      const groups=ROLE_INFO.map(r=>({...r,days:[]}));
      for(let d=1;d<=daysInMonth(year,month);d++){
        const date=toDateStr(year,month,d),role=v2Role(date,p.id);
        const group=groups.find(g=>g.name===role);
        if(group)group.days.push(d);
      }
      result.push({p,groups:groups.filter(g=>g.name!=='Görevli'||g.days.length)});
    }
    return result;
  }
  function summaryCard(ctx,entry,x,y,w,h){
    rect(ctx,x,y,w,h,18,'#FFFFFF',EDGE);
    rect(ctx,x,y+13,6,h-26,3,entry.p.color||TEAL);
    const name=entry.p.name||'Hekim',code=entry.p.code||'';
    fit(ctx,name,x+22,y+44,w-125,26,17,INK,700);
    rect(ctx,x+w-90,y+18,67,33,11,entry.p.color||TEAL);
    txt(ctx,code,x+w-56,y+41,17,'#FFFFFF',700,'center');
    const roleGap=Math.min(h>300?60:40,(h-69)/Math.max(1,entry.groups.length));
    entry.groups.forEach((group,i)=>{
      const baseline=y+87+i*roleGap;
      const active=group.days.length>0;
      rect(ctx,x+21,baseline-19,38,24,8,active?group.color:'#E7ECF1');
      txt(ctx,group.short,x+40,baseline-2,13,active?'#FFFFFF':'#9BA5AF',700,'center');
      txt(ctx,group.title,x+68,baseline,15,active?INK:'#94A3B8',700);
      txt(ctx,group.days.length+' gün',x+236,baseline,16,active?INK:'#9AA8B7',700);
      if(group.days.length){
        const dates=group.days.map(n=>String(n).padStart(2,'0')).join(', ');
        // Dynamic font to keep complete day lists; no truncation or ellipsis.
        fit(ctx,dates,x+305,baseline,w-328,17,11,SUB,500);
      } else {
        txt(ctx,'—',x+305,baseline,16,'#AFB9C5');
      }
    });
  }
  function footer(ctx,page,count){
    txt(ctx,'ASMPlan V2   •   Aylık görev çizelgesi',M,PAGE_H-32,16,'#90A0B1',500);
    txt(ctx,page+' / '+count,M+CONTENT,PAGE_H-32,16,'#90A0B1',500,'right');
  }
  function summary(ctx,entries,startY,maxRows){
    const gap=18,cols=entries.length<=2?Math.max(1,entries.length):3;
    const w=(CONTENT-gap*(cols-1))/cols;
    const cardH=maxRows===1?420:240;
    for(let i=0;i<entries.length;i++){
      summaryCard(ctx,entries[i],M+(i%cols)*(w+gap),startY+Math.floor(i/cols)*(cardH+gap),w,cardH);
    }
  }
  function render(year,month,physicians){
    const all=collect(year,month,physicians);
    const pages=[];
    const main=canvasPage();
    header(main.ctx,year,month);calendar(main.ctx,year,month,physicians);
    txt(main.ctx,'HEKİM GÖREV ÖZETİ',M+3,979,25,INK,700);
    txt(main.ctx,'Gün sayıları ve görev tarihleri',M+CONTENT-2,980,18,SUB,400,'right');
    const first=all.slice(0,6);
    summary(main.ctx,first,1000,first.length<=3?1:2);
    pages.push(main.canvas);
    for(let start=6;start<all.length;start+=9){
      const more=all.slice(start,start+9),page=canvasPage();
      header(page.ctx,year,month,'HEKİM GÖREV ÖZETİ');
      txt(page.ctx,'AYLIK GÖREV DAĞILIMI  /  DEVAMI',M+2,258,26,INK,700);
      const gap=18,cardW=(CONTENT-2*gap)/3,cardH=353;
      more.forEach((e,i)=>summaryCard(page.ctx,e,M+(i%3)*(cardW+gap),288+Math.floor(i/3)*(cardH+gap),cardW,cardH));
      pages.push(page.canvas);
    }
    pages.forEach((c,i)=>footer(c.getContext('2d'),i+1,pages.length));
    return pages;
  }
  // Small PDF 1.4 writer. JPEG page images preserve all Turkish glyphs and the
  // calendar appearance without loading external libraries while offline.
  function pdfBytes(pages) {
    const encoder=new TextEncoder(),chunks=[],positions=[0];
    let size=0;
    const push=v=>{const data=typeof v==='string'?encoder.encode(v):v;chunks.push(data);size+=data.length;};
    const object=(id,write)=>{positions[id]=size;push(id+' 0 obj\n');write();push('\nendobj\n');};
    const n=pages.length;
    push('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n');
    object(1,()=>push('<< /Type /Catalog /Pages 2 0 R >>'));
    object(2,()=>push('<< /Type /Pages /Count '+n+' /Kids ['+pages.map((_,i)=>(3+i*3)+' 0 R').join(' ')+'] >>'));
    pages.forEach((canvas,i)=>{
      const pageId=3+i*3,imgId=pageId+1,streamId=pageId+2;
      const base64=canvas.toDataURL('image/jpeg',.89).split(',')[1];
      const binary=atob(base64),jpeg=new Uint8Array(binary.length);
      for(let j=0;j<binary.length;j++)jpeg[j]=binary.charCodeAt(j);
      const commands='q\n'+PDF_W+' 0 0 '+PDF_H+' 0 0 cm\n/Img Do\nQ\n';
      object(pageId,()=>push('<< /Type /Page /Parent 2 0 R /MediaBox [0 0 '+PDF_W+' '+PDF_H+'] /Resources << /XObject << /Img '+imgId+' 0 R >> >> /Contents '+streamId+' 0 R >>'));
      object(imgId,()=>{
        push('<< /Type /XObject /Subtype /Image /Width '+PAGE_W+' /Height '+PAGE_H+' /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length '+jpeg.length+' >>\nstream\n');
        push(jpeg);push('\nendstream');
      });
      object(streamId,()=>push('<< /Length '+encoder.encode(commands).length+' >>\nstream\n'+commands+'endstream'));
    });
    const count=2+n*3,xref=size;
    push('xref\n0 '+(count+1)+'\n0000000000 65535 f \n');
    for(let id=1;id<=count;id++)push(String(positions[id]).padStart(10,'0')+' 00000 n \n');
    push('trailer\n<< /Size '+(count+1)+' /Root 1 0 R >>\nstartxref\n'+xref+'\n%%EOF');
    const result=new Uint8Array(size);let offset=0;
    chunks.forEach(part=>{result.set(part,offset);offset+=part.length;});
    return new Blob([result],{type:'application/pdf'});
  }
  let currentPdfUrl=null;
  function showFallback(blob,file){
    if(currentPdfUrl)URL.revokeObjectURL(currentPdfUrl);
    currentPdfUrl=URL.createObjectURL(blob);
    let node=document.getElementById('v2-pdf-dialog');
    if(!node){node=document.createElement('div');node.id='v2-pdf-dialog';document.body.appendChild(node);}
    node.className='v2-pdf-overlay';
    node.innerHTML='<section class="v2-pdf-dialog" role="dialog" aria-modal="true" aria-labelledby="v2-pdf-heading">'+
      '<div class="v2-pdf-mark">PDF</div><h3 id="v2-pdf-heading">Çizelgen hazır</h3>'+
      '<p>Aylık takvim ve hekim görev özetlerini cihazına kaydedebilir veya paylaşabilirsin.</p>'+
      '<button type="button" class="v2-btn v2-primary" id="v2-share-file">PDF’yi Paylaş</button>'+
      '<a class="v2-btn v2-secondary" id="v2-open-file" target="_blank" rel="noopener">PDF’yi Aç</a>'+
      '<a class="v2-btn v2-secondary" id="v2-save-file">Dosyayı Kaydet</a>'+
      '<button type="button" class="v2-pdf-close" id="v2-pdf-close">Kapat</button></section>';
    const share=node.querySelector('#v2-share-file');
    const can=typeof navigator.canShare==='function'&&navigator.canShare({files:[file]});
    share.style.display=can?'block':'none';
    share.onclick=()=>{if(can)navigator.share({files:[file],title:'ASMPlan görev çizelgesi'}).catch(err=>{
      if(err?.name!=='AbortError')showToast('PDF’yi Aç veya Dosyayı Kaydet seçeneğini deneyin');
    });};
    const open=node.querySelector('#v2-open-file'),save=node.querySelector('#v2-save-file');
    open.href=currentPdfUrl;save.href=currentPdfUrl;save.download=file.name;
    node.querySelector('#v2-pdf-close').onclick=()=>{node.remove();};
    node.onclick=event=>{if(event.target===node)node.remove();};
  }
  window.v2BuildPdf=function(year=state.currentYear,month=state.currentMonth,physicians=null){
    const selected=physicians||state.physicians.filter(p=>!v2.selectedPhysician||p.id===v2.selectedPhysician);
    if(!selected.length)throw new Error('Önce bir hekim ekleyin');
    return pdfBytes(render(year,month,selected));
  };
  // Replaces print(), which doesn't work reliably in iOS Home Screen PWAs.
  v2Print=function(){
    const year=state.currentYear,month=state.currentMonth;
    const name='ASMPlan-'+year+'-'+String(month).padStart(2,'0')+'.pdf';
    let blob,file;
    try{
      blob=window.v2BuildPdf(year,month);
      file=new File([blob],name,{type:'application/pdf'});
    }catch(error){
      console.error('PDF hazırlanamadı',error);showToast('PDF oluşturulamadı. Lütfen tekrar deneyin.');return;
    }
    // Native share must start within the same tap (transient user activation).
    const can=typeof navigator.share==='function'&&typeof navigator.canShare==='function'
      &&navigator.canShare({files:[file]});
    if(can){
      navigator.share({files:[file],title:TR_MONTHS[month-1]+' '+year+' ASM çalışma çizelgesi'})
        .catch(err=>{if(err?.name!=='AbortError')showFallback(blob,file);});
    }else{
      showFallback(blob,file);
    }
  };
})();
