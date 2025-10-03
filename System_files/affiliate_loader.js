/* affiliate_loader.js
   CSS 주입 + manifest fetch (JSON.parse 안정화) + JS 번들 로드
*/
(function(){
  const CSS = [
    "https://drive.google.com/uc?export=view&id=11ByugtA7SZ830SxWNCeIrePEPK1kbQzZ", /* affiliate_box.css */
    "https://drive.google.com/uc?export=view&id=1bfLZAsPnelMHbeYD3m93QJtd5-epfqcr"  /* admin_modal.css */
  ];
  const MANIFEST = "https://drive.google.com/uc?export=view&id=1uBjfbko7JYsH3i7UP3Jp2jMeZNIPumic";
  const SCRIPTS = [
    "https://drive.google.com/uc?export=view&id=18Q7YtNaYma82O0fzL6pQeeqx09qZvK5J", // storage_bridge.js
    "https://drive.google.com/uc?export=view&id=1Xeo8i2ebDjcctNblgju6velVr8Yt9VCI", // ui_toast.js
    "https://drive.google.com/uc?export=view&id=1WrKBiWiWM6SDvKPDtYXQw4iHBY6M6oUZ", // affiliate_deals.js
    "https://drive.google.com/uc?export=view&id=1kiiphCLAuLSoTRdQPQfY8R8GxnEM_huz", // affiliate_admin.js
    "https://drive.google.com/uc?export=view&id=100B9yoPnh-gBvmRAoB2OABrUG4gsuDd0"  // affiliate_stats.js
  ];

  // CSS 추가
  CSS.forEach(href=>{
    const l=document.createElement('link'); l.rel='stylesheet'; l.href=href; document.head.appendChild(l);
  });

  function loadScript(src){
    return new Promise((resolve,reject)=>{
      const s=document.createElement('script'); s.src=src; s.onload=resolve; s.onerror=reject; document.body.appendChild(s);
    });
  }

  fetch(MANIFEST)
    .then(r=>r.text())
    .then(t=>{ try{ window.AFF_MANIFEST=JSON.parse(t); }catch(e){ console.error("Manifest parse error",e);} })
    .finally(async ()=>{ for(const src of SCRIPTS){ await loadScript(src);} });
})();
