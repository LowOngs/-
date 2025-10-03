/* affiliate_stats.js (수정본)
   제휴집계관리 - data-partner-id 기준
*/
(function(){
  const PARTNERS=(window.AFF_MANIFEST&&window.AFF_MANIFEST.partners)||[];
  const PID = new Set(PARTNERS.map(p=>p.id));

  function krMonthKey(d=new Date()){
    const f=new Intl.DateTimeFormat('ko-KR',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit'});
    const p=f.formatToParts(d);
    return p.find(x=>x.type==='year').value+p.find(x=>x.type==='month').value;
  }
  const k=(pid,yyyymm)=>`aff:cnt:${yyyymm}:${pid}`;
  const get=(pid,yyyymm)=>parseInt(localStorage.getItem(k(pid,yyyymm))||"0",10)||0;
  const set=(pid,yyyymm,v)=>localStorage.setItem(k(pid,yyyymm),String(v));

  // 집계: data-partner-id 기준
  document.addEventListener('click',e=>{
    const a=e.target.closest('.partners .partner');
    if(!a) return;
    const pid=a.getAttribute('data-partner-id');
    if(!pid || !PID.has(pid)) return;
    const y=krMonthKey(); set(pid,y,get(pid,y)+1);
  }, true);

  // 모달
  window.openAffStats=function(){
    const y=krMonthKey(), grid=document.getElementById('affStatsGrid');
    if(!grid) return; grid.innerHTML='';
    PARTNERS.forEach(p=>{
      grid.insertAdjacentHTML('beforeend',
        `<div class='affstats-card'><h4>${p.name}</h4><div class='affstats-val'>${get(p.id,y)}</div></div>`);
    });
    document.getElementById('affStatsMonth').textContent='(한국시간 기준)';
    document.getElementById('affStatsOv').style.display='block';
    document.getElementById('affStatsMd').style.display='block';
  };
  window.closeAffStats=function(){
    document.getElementById('affStatsOv').style.display='none';
    document.getElementById('affStatsMd').style.display='none';
  };
  window.exportAffStatsCSV=function(){
    const y=krMonthKey(); const rows=[['partnerId','partnerName','yyyymm','clicks']];
    PARTNERS.forEach(p=>rows.push([p.id,p.name,y,get(p.id,y)]));
    const csv=rows.map(r=>r.join(',')).join('\n');
    const blob=new Blob([csv],{type:'text/csv'}); const url=URL.createObjectURL(blob);
    const a=document.createElement('a'); a.href=url; a.download=`affiliate_clicks_${y}.csv`; a.click(); URL.revokeObjectURL(url);
  };
})();
