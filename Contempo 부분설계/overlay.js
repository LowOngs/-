// ===== Overlay JS (Footer, Admin, Translation Orb) =====
(function(w,d){
  'use strict';

  var $ = function(s,ctx){ return (ctx||d).querySelector(s); };
  var $$ = function(s,ctx){ return Array.prototype.slice.call((ctx||d).querySelectorAll(s)); };

  // --- Partner data (12) ---
  var DATA = [
    { id:'amazon',       name:'Amazon',        img:'https://drive.google.com/uc?export=view&id=1TSqB8lWokfq6cmbCjJyLLEtS9A8YKDQ9' },
    { id:'ebay',         name:'eBay',          img:'https://drive.google.com/uc?export=view&id=1DMHCahD75qUG49jWXRPoOjglYf4oXjuB' },
    { id:'target',       name:'Target',        img:'https://drive.google.com/uc?export=view&id=1IE1vhCO7Njq0hRRt5FRbJ7YltHtzwRJr' },
    { id:'mercadolibre', name:'Mercado Libre', img:'https://drive.google.com/uc?export=view&id=1Y3uSYQPw50Wut1WVCrnCcsaYbyoSD7xH' },
    { id:'flipkart',     name:'Flipkart',      img:'https://drive.google.com/uc?export=view&id=1jCVIkW-ULS5GO9zD-dpDEV0Jsp7dTU4d' },
    { id:'amazonin',     name:'Amazon India',  img:'https://drive.google.com/uc?export=view&id=14jXDZSGLbiIehaCUvaK6ytpjW1fEZO7G' },
    { id:'shopee',       name:'Shopee',        img:'https://drive.google.com/uc?export=view&id=1myIvsI6UvOJSrLV45VH4f7wo5Ow9Ucbv' },
    { id:'lazada',       name:'Lazada',        img:'https://drive.google.com/uc?export=view&id=1CGl9Ff1v1cG3O-UmVABo8wgQB-9JD_z3' },
    { id:'aliexpress',   name:'AliExpress',    img:'https://drive.google.com/uc?export=view&id=1Z5-ybY3i62klO-oCvgAXVHfHH0oRyzLL' },
    { id:'otto',         name:'Otto',          img:'https://drive.google.com/uc?export=view&id=1IqWAFrpAeoANqj93UxmO8HV51szrt4_a' },
    { id:'zalando',      name:'Zalando',       img:'https://drive.google.com/uc?export=view&id=1lAAIsrWowMJxXyMbffS-Je3odofKX6j-' },
    { id:'allegro',      name:'Allegro',       img:'https://drive.google.com/uc?export=view&id=1h2SYQvG8UL9uzAhsjXMxqEA9YaHSNZK' }
  ];

  var LS_CFG   = 'ogx.partnerData.v1';
  var LS_CLICK = 'ogx.clicks.v1';
  var LS_ORB   = 'ogx.trans.pos.v1';

  function monthKey(){
    var t=new Date();
    return t.getFullYear()+'-'+('0'+(t.getMonth()+1)).slice(-2);
    }

  function readCfg(){
    try{ var s=w.localStorage.getItem(LS_CFG); return s? JSON.parse(s):{}; }catch(e){ return {}; }
  }
  function saveCfg(o){
    try{ w.localStorage.setItem(LS_CFG, JSON.stringify(o)); }catch(e){}
  }
  function readClicks(){
    try{ var s=w.localStorage.getItem(LS_CLICK); return s? JSON.parse(s):{}; }catch(e){ return {}; }
  }
  function incClick(id){
    try{
      var m=monthKey(), o=readClicks();
      o[m]=o[m]||{}; o[m][id]=(o[m][id]||0)+1;
      w.localStorage.setItem(LS_CLICK, JSON.stringify(o));
    }catch(e){}
  }

  // ---- Footer tiles ----
  function buildTiles(track){
    var cfg=readCfg();
    DATA.forEach(function(p){
      var tile=d.createElement('button');
      tile.type='button'; tile.className='ogx-tile'; tile.setAttribute('role','option');
      tile.setAttribute('aria-label', p.name); tile.dataset.id=p.id; tile.dataset.name=p.name;

      var logo=d.createElement('div'); logo.className='ogx-logo';
      if(p.img) logo.style.backgroundImage="url('"+p.img+"')";
      tile.appendChild(logo);

      var badges=d.createElement('div'); badges.className='ogx-badges';
      var deal=d.createElement('span'); deal.className='ogx-badge deal'; deal.textContent='Deal'; badges.appendChild(deal);
      var D=d.createElement('span'); D.className='ogx-badge D'; D.textContent='D'; badges.appendChild(D);
      tile.appendChild(badges);

      var st=cfg[p.id]||{};
      var hasTrack=!!st.track, hasAPI=!!st.api, eff=!!st.effective;
      if(!hasTrack) tile.classList.add('is-disabled');
      if(!hasAPI||!eff){ D.style.opacity=.35; D.style.filter='grayscale(1)'; }

      tile.addEventListener('click', function(){
        if(tile.classList.contains('is-disabled')) return;
        incClick(p.id);
        var url=st.track||'#';
        try{ w.open(url,'_blank','noopener'); }catch(e){ w.location.href=url; }
      });

      track.appendChild(tile);
    });
  }

  function cloneForLoop(track){
    var nodes=$$('.ogx-tile', track);
    if(nodes.length<1) return;
    var head=nodes.slice(0,6).map(function(n){ return n.cloneNode(true); });
    var tail=nodes.slice(-6).map(function(n){ return n.cloneNode(true); });
    tail.forEach(function(n){ track.insertBefore(n, track.firstChild); });
    head.forEach(function(n){ track.appendChild(n); });
    setTimeout(function(){
      var first=nodes[0], r=first.getBoundingClientRect(), wv=track.getBoundingClientRect();
      var delta=(r.left+r.width/2)-(wv.left+wv.width/2);
      track.scrollLeft += delta;
    },0);
  }

  function enableDrag(track){
    var down=false, sx=0, sl=0, v=0, raf;
    function start(e){
      down=true; sx=(e.touches?e.touches[0].clientX:e.clientX); sl=track.scrollLeft; v=0;
      track.classList.add('is-drag'); cancelAnimationFrame(raf);
    }
    function move(e){
      if(!down) return;
      var x=(e.touches?e.touches[0].clientX:e.clientX);
      var dx=x-sx; track.scrollLeft=sl-dx; v=-dx;
    }
    function end(){
      if(!down) return; down=false; track.classList.remove('is-drag');
      var dec=.92;
      function step(){ if(Math.abs(v)<.5) return; track.scrollLeft+=v; v*=dec; raf=requestAnimationFrame(step); }
      raf=requestAnimationFrame(step);
    }
    track.addEventListener('mousedown', start); track.addEventListener('mousemove', move); w.addEventListener('mouseup', end);
    track.addEventListener('touchstart', start,{passive:true}); track.addEventListener('touchmove', move,{passive:true}); w.addEventListener('touchend', end);
  }

  function focusCenter(track){
    var tip;
    function showTip(tile){
      if(!tip){ tip=d.createElement('div'); tip.className='ogx-tooltip'; d.body.appendChild(tip); }
      tip.textContent=tile.dataset.name||'';
      var r=tile.getBoundingClientRect();
      tip.style.left=(r.left+r.width/2)+'px'; tip.style.top=(r.top-6)+'px';
      tip.classList.add('is-show'); setTimeout(function(){ tip&&tip.classList.remove('is-show'); }, 1200);
    }
    function update(){
      var tiles=$$('.ogx-tile', track); if(!tiles.length) return;
      var wv=track.getBoundingClientRect(), cx=wv.left+wv.width/2;
      var best=null, bestd=1e9;
      tiles.forEach(function(t){ var r=t.getBoundingClientRect(); var c=r.left+r.width/2; var dlt=Math.abs(c-cx); if(dlt<bestd){bestd=dlt; best=t;} });
      tiles.forEach(function(t){ t.classList.remove('is-focus'); });
      if(best){ best.classList.add('is-focus'); showTip(best); }
    }
    var to; track.addEventListener('scroll', function(){ clearTimeout(to); to=setTimeout(update,80); });
    w.addEventListener('resize', update); setTimeout(update,60);
    d.addEventListener('click', function(ev){ if(tip && !ev.target.closest('.ogx-tile')) tip.classList.remove('is-show'); });
  }

  function bindArrows(track){
    function step(dir){ var wv=track.clientWidth||300; track.scrollBy({left:dir*wv*0.9, behavior:'smooth'}); }
    var prev=$('.ogx-prev'); var next=$('.ogx-next');
    if(prev) prev.addEventListener('click', function(){ step(-1); });
    if(next) next.addEventListener('click', function(){ step(1); });
    track.addEventListener('keydown', function(e){ if(e.key==='ArrowLeft') step(-1); else if(e.key==='ArrowRight') step(1); });
  }

  function refreshFooter(){
    var track=$('#ogx-track'); if(!track) return;
    track.innerHTML='';
    buildTiles(track);
    cloneForLoop(track);
    enableDrag(track);
    focusCenter(track);
    bindArrows(track);
  }

  // ---- Admin (KO) ----
  function openAdmin(){ var dlg=$('#ogx-admin'); if(dlg) dlg.hidden=false; }
  function closeAdmin(){ var dlg=$('#ogx-admin'); if(dlg) dlg.hidden=true; }

  function buildAdmin(){
    var dlg=$('#ogx-admin'); if(!dlg) return;
    var body=$('#ogx-admin-rows'); body.innerHTML='';
    var cfg=readCfg();
    DATA.forEach(function(p){
      var row=d.createElement('div'); row.className='ogx-admin-grid ogx-admin-row';
      row.innerHTML=''
        +'<div class="ogx-cell-id">'+p.id+'</div>'
        +'<div><input type="text" class="ogx-inp-track" placeholder="트랙 URL"></div>'
        +'<div><input type="text" class="ogx-inp-api" placeholder="API 키 또는 엔드포인트"></div>'
        +'<div><label style="display:inline-flex;align-items:center;gap:6px"><input type="checkbox" class="ogx-inp-eff"> 발효</label></div>'
        +'<div><button type="button" class="ogx-btn ogx-apply">적용</button></div>';
      body.appendChild(row);

      var st=cfg[p.id]||{};
      row.querySelector('.ogx-inp-track').value=st.track||'';
      row.querySelector('.ogx-inp-api').value=st.api||'';
      row.querySelector('.ogx-inp-eff').checked=!!st.effective;

      row.querySelector('.ogx-apply').addEventListener('click', function(){
        var cur=readCfg();
        cur[p.id]={
          track: row.querySelector('.ogx-inp-track').value.trim(),
          api: row.querySelector('.ogx-inp-api').value.trim(),
          effective: row.querySelector('.ogx-inp-eff').checked
        };
        saveCfg(cur);
        refreshFooter();
      });
    });

    $('#ogx-admin-export').onclick=function(){
      var blob=new Blob([JSON.stringify(readCfg(),null,2)],{type:'application/json'});
      var a=d.createElement('a'); a.href=URL.createObjectURL(blob); a.download='ogx-partners-config.json'; a.click(); URL.revokeObjectURL(a.href);
    };
    $('#ogx-admin-import').onclick=function(){ $('#ogx-admin-file').click(); };
    $('#ogx-admin-file').onchange=function(ev){
      var f=ev.target.files&&ev.target.files[0]; if(!f) return;
      var rd=new FileReader();
      rd.onload=function(){ try{ var obj=JSON.parse(rd.result); saveCfg(obj); buildAdmin(); refreshFooter(); }catch(e){ alert('Invalid JSON'); } };
      rd.readAsText(f);
    };

    $('.ogx-admin-close').onclick=closeAdmin;
  }

  // ---- Translation orb ----
  function saveOrbPos(x,y){ try{ w.localStorage.setItem(LS_ORB, JSON.stringify({x:x,y:y})); }catch(e){} }
  function loadOrbPos(){ try{ var s=w.localStorage.getItem(LS_ORB); return s? JSON.parse(s):null; }catch(e){ return null; } }

  function initTranslation(){
    var fab=$('#ogx-trans-fab'); var orb=$('#ogx-trans-orb');
    if(!fab || !orb) return;
    fab.addEventListener('click', function(){ orb.hidden=!orb.hidden; });

    $('.ogx-trans-close', orb).addEventListener('click', function(){ orb.hidden=true; });

    $('#ogx-trans-clear', orb).addEventListener('click', function(){ $('#ogx-trans-src').value=''; });

    $('#ogx-trans-run', orb).addEventListener('click', function(){
      var eng=$('.ogx-flag.is-sel', orb); var txt=$('#ogx-trans-src').value||''; var base='';
      var q=encodeURIComponent(txt);
      var url='#';
      if(eng && eng.dataset.engine==='google') url='https://translate.google.com/?sl=auto&tl=en&op=translate&text='+q;
      else if(eng && eng.dataset.engine==='papago') url='https://papago.naver.com/?sk=auto&tk=en&st='+q;
      else if(eng && eng.dataset.engine==='deepl') url='https://www.deepl.com/translator#auto/en/'+q;
      try{ w.open(url,'_blank','noopener'); }catch(e){ w.location.href=url; }
    });

    $$('.ogx-flag', orb).forEach(function(b){
      b.addEventListener('click', function(){
        $$('.ogx-flag', orb).forEach(function(x){ x.classList.remove('is-sel'); });
        b.classList.add('is-sel');
      });
    });

    // Drag orb panel
    var dragging=false, sx=0, sy=0, ox=0, oy=0;
    function place(x,y){ orb.style.right=''; orb.style.bottom=''; orb.style.left=(x|0)+'px'; orb.style.top=(y|0)+'px'; }
    var pos=loadOrbPos(); if(pos) place(pos.x,pos.y);
    orb.addEventListener('mousedown', function(e){ if(e.target.closest('textarea,button,input')) return; dragging=true; sx=e.clientX; sy=e.clientY; var r=orb.getBoundingClientRect(); ox=r.left; oy=r.top; e.preventDefault(); });
    d.addEventListener('mousemove', function(e){ if(!dragging) return; place(ox+e.clientX-sx, oy+e.clientY-sy); });
    d.addEventListener('mouseup', function(){ if(!dragging) return; dragging=false; var r=orb.getBoundingClientRect(); saveOrbPos(r.left, r.top); });
  }

  // ---- Bootstrap ----
  function init(){
    if(!$('#ogx-root')) return;
    refreshFooter();
    buildAdmin();
    initTranslation();

    // Secret: Ctrl+Alt+O
    d.addEventListener('keydown', function(e){
      if(e.ctrlKey && e.altKey && (e.key==='o' || e.key==='O')) openAdmin();
      if(e.key==='Escape') closeAdmin();
    });
  }

  if(d.readyState==='loading'){ d.addEventListener('DOMContentLoaded', init); } else { init(); }

})(window, document);
