// overlay.js : Full behavior. No CDATA. Blogger-safe.
(function(w,d){
  'use strict';
  var $ = function(s,ctx){ return (ctx||d).querySelector(s); };
  var $$= function(s,ctx){ return Array.prototype.slice.call((ctx||d).querySelectorAll(s)); };

  /* =========================
   * 1) Sidebar toggle
   * ========================= */
  var toggle = $('.ogx-toggle');
  var sidebar = $('#ogx-sidebar');
  if(toggle && sidebar){
    toggle.addEventListener('click', function(){
      var open = sidebar.classList.toggle('is-open');
      toggle.setAttribute('aria-expanded', String(open));
      if(open){ d.documentElement.classList.add('ogx-lock'); d.body.classList.add('ogx-lock'); }
      else{ d.documentElement.classList.remove('ogx-lock'); d.body.classList.remove('ogx-lock'); }
    });
  }

  /* =========================
   * 2) Notice lane admin (KO)
   *    Toggle admin panel: Ctrl+Alt+N
   * ========================= */
  var noticeText = $('#ogx-notice-text');
  var noticeAdmin= $('#ogx-notice-admin');
  var noticeInput= $('#ogx-notice-input');
  var btnApply   = $('#ogx-notice-apply');
  var btnPause   = $('#ogx-notice-pause');
  var paused = false;

  d.addEventListener('keydown', function(e){
    if(e.ctrlKey && e.altKey && (e.key==='n'||e.key==='N')){
      var on = noticeAdmin.getAttribute('data-admin')==='true';
      noticeAdmin.setAttribute('data-admin', on? 'false':'true');
      noticeAdmin.setAttribute('aria-hidden', on? 'true':'false');
    }
  });

  if(btnApply && noticeInput && noticeText){
    btnApply.addEventListener('click', function(){
      var v = (noticeInput.value||'').trim();
      if(v){ noticeText.textContent = v; paused=false; noticeText.style.animationPlayState='running'; btnPause.textContent='중지'; }
    });
  }
  if(btnPause && noticeText){
    btnPause.addEventListener('click', function(){
      paused = !paused;
      noticeText.style.animationPlayState = paused ? 'paused' : 'running';
      btnPause.textContent = paused ? '적용' : '중지';
    });
  }

  /* =========================
   * 3) Footer partners carousel
   * ========================= */
  var PARTNERS = [
    { id:'amazon',       name:'Amazon',        img:'https://drive.google.com/uc?export=view&id=1TSqB8lWokfq6cmbCjJyLLEtS9A8YKDQ9' },
    { id:'ebay',         name:'eBay',          img:'https://drive.google.com/uc?export=view&id=1DMHCahD75qUG49jWXRPoOjglYf4oXjuB' },
    { id:'target',       name:'Target',        img:'https://drive.google.com/uc?export=view&id=1IE1vhCO7Njq0hRRt5FRbJ7YltHtzwRJr' },
    { id:'mercadolibre', name:'Mercado Libre', img:'https://drive.google.com/uc?export=view&id=1Y3uSYQPw50Wut1WVCrnCcsaYbyoSD7xH' },
    { id:'flipkart',     name:'Flipkart',      img:'https://drive.google.com/uc?export=view&id=1jCVIkW-ULS5GO9zD-dpDEV0Jsp7dTU4d' },
    { id:'amazonin',     name:'Amazon India',  img:'https://drive.google.com/uc?export=view&id=14jXDZSGLbiIehaCUvaK6ytpjW1fEZO7G' },
    { id:'shopee',       name:'Shopee',        img:'https://drive.google.com/uc?export=view&id=1myIvsI6UvOJSrLV45VHf4f7wo5Ow9Ucbv' },
    { id:'lazada',       name:'Lazada',        img:'https://drive.google.com/uc?export=view&id=1CGl9Ff1v1cG3O-UmVABo8wgQB-9JD_z3' },
    { id:'aliexpress',   name:'AliExpress',    img:'https://drive.google.com/uc?export=view&id=1Z5-ybY3i62klO-oCvgAXVHfHH0oRyzLL' },
    { id:'otto',         name:'Otto',          img:'https://drive.google.com/uc?export=view&id=1IqWAFrpAeoANqj93UxmO8HV51szrt4_a' },
    { id:'zalando',      name:'Zalando',       img:'https://drive.google.com/uc?export=view&id=1lAAIsrWowMJxXyMbffS-Je3odofKX6j-' },
    { id:'allegro',      name:'Allegro',       img:'https://drive.google.com/uc?export=view&id=1h2SYQvG8UL9uzAhsjXMxqEA9YaHSNZK' }
  ];

  var LS_CFG   = 'ogx.partnerConfig.v1';
  var LS_CLICK = 'ogx.clicks.v1';

function monthKey(){ var t=new Date(); return t.getFullYear()+'-'+('0'+(t.getMonth()+1)).slice(-2); }
  function readCfg(){ try{ var s=w.localStorage.getItem(LS_CFG); return s? JSON.parse(s):{}; }catch(e){ return {}; } }
  function saveCfg(o){ try{ w.localStorage.setItem(LS_CFG, JSON.stringify(o)); }catch(e){} }
  function readClicks(){ try{ var s=w.localStorage.getItem(LS_CLICK); return s? JSON.parse(s):{}; }catch(e){ return {}; } }
  function incClick(id){ try{ var m=monthKey(), o=readClicks(); o[m]=o[m]{}; o[m][id]=(o[m][id]0)+1; w.localStorage.setItem(LS_CLICK, JSON.stringify(o)); }catch(e){} }

  var track = $('#ogx-ft-track');
  var prev  = $('.ogx-ft-prev');
  var next  = $('.ogx-ft-next');

  function buildTiles(){
    if(!track) return;
    track.innerHTML='';
    var cfg = readCfg();
    PARTNERS.forEach(function(p){
      var it=d.createElement('button');
      it.type='button'; it.className='ogx-ft-item'; it.setAttribute('role','option'); it.setAttribute('aria-label',p.name);
      var logo=d.createElement('div'); logo.className='logo'; if(p.img) logo.style.backgroundImage="url('"+p.img+"')";
      var D=d.createElement('span'); D.className='ogx-badgeD'; D.textContent='D';
      it.appendChild(logo); it.appendChild(D);

      var st=cfg[p.id]||{};
      if(!st.track){ it.classList.add('is-disabled'); }
      if(!st.api || !st.effective){ D.style.opacity='.35'; D.style.filter='grayscale(1)'; }

      it.addEventListener('click', function(){
        if(it.classList.contains('is-disabled')) return;
        incClick(p.id);
        var url=st.track||'#';
        try{ w.open(url,'_blank','noopener'); }catch(e){ w.location.href=url; }
      });
      track.appendChild(it);
    });
  }

  function cloneForLoop(){
    var nodes=$$('.ogx-ft-item', track);
    if(nodes.length<1) return;
    var head=nodes.slice(0,6).map(function(n){ return n.cloneNode(true); });
    var tail=nodes.slice(-6).map(function(n){ return n.cloneNode(true); });
    tail.forEach(function(n){ track.insertBefore(n, track.firstChild); });
    head.forEach(function(n){ track.appendChild(n); });
    // center roughly to the original first item
    setTimeout(function(){
      var r0=nodes[0].getBoundingClientRect();
      var wv=track.getBoundingClientRect();
      track.scrollLeft += (r0.left+r0.width/2) - (wv.left+wv.width/2);
    },0);
  }

  // Drag + inertial scroll
  function enableDrag(){
    var down=false, sx=0, sl=0, v=0, raf;
    function start(e){ down=true; sx=(e.touches?e.touches[0].clientX:e.clientX); sl=track.scrollLeft; v=0; cancelAnimationFrame(raf); }
    function move(e){ if(!down)return; var x=(e.touches?e.touches[0].clientX:e.clientX); var dx=x-sx; track.scrollLeft=sl-dx; v=-dx; }
    function end(){ if(!down)return; down=false; var dec=.92; function step(){ if(Math.abs(v)<.5) return; track.scrollLeft+=v; v*=dec; raf=requestAnimationFrame(step); } raf=requestAnimationFrame(step); }
    track.addEventListener('mousedown', start); track.addEventListener('mousemove', move); w.addEventListener('mouseup', end);
    track.addEventListener('touchstart', start,{passive:true}); track.addEventListener('touchmove', move,{passive:true}); w.addEventListener('touchend', end);
  }

  // Focus zone + tooltip + autosnap
  var tip;
  function showTip(el){
    if(!tip){ tip=d.createElement('div'); tip.className='ogx-tooltip'; d.body.appendChild(tip); }
    tip.textContent=el.getAttribute('aria-label')||'';
    var r=el.getBoundingClientRect(); tip.style.left=(r.left+r.width/2)+'px'; tip.style.top=(r.top-6)+'px';
    tip.className='ogx-tooltip is-show';
    setTimeout(function(){ if(tip){ tip.className='ogx-tooltip'; } }, 1200);
  }
  function updateFocus(){
    var zone=$('.ogx-focuszone'); if(!zone) return;
    var tiles=$$('.ogx-ft-item', track); if(!tiles.length) return;

var z=zone.getBoundingClientRect(); var cx=z.left+z.width/2;
    var best=null, bestd=1e9;
    tiles.forEach(function(t){ var r=t.getBoundingClientRect(); var c=r.left+r.width/2; var dlt=Math.abs(c-cx); if(dlt<bestd){bestd=dlt; best=t;} });
    tiles.forEach(function(t){ t.classList.remove('is-focus'); });
    if(best){
      best.classList.add('is-focus'); showTip(best);
      var br=best.getBoundingClientRect(); var bc=br.left+br.width/2; var delta=bc-cx;
      track.scrollBy({left: delta, behavior:'smooth'});
    }
  }
  function bindFocusHandlers(){
    var to; track.addEventListener('scroll', function(){ clearTimeout(to); to=setTimeout(updateFocus,80); });
    w.addEventListener('resize', updateFocus);
    d.addEventListener('click', function(ev){ if(tip && !ev.target.closest('.ogx-ft-item')) tip.classList.remove('is-show'); });
    setTimeout(updateFocus,80);
  }

  function bindArrows(){
    function step(dir){ var wv=track.clientWidth||300; track.scrollBy({left:dir*wv*0.9, behavior:'smooth'}); }
    if(prev) prev.addEventListener('click', function(){ step(-1); });
    if(next) next.addEventListener('click', function(){ step(1); });
    track.addEventListener('keydown', function(e){ if(e.key==='ArrowLeft') step(-1); else if(e.key==='ArrowRight') step(1); });
  }

  function initFooter(){
    if(!track) return;
    buildTiles();
    cloneForLoop();
    enableDrag();
    bindArrows();
    bindFocusHandlers();
  }

  /* =========================
   * 4) Admin dialog (KO): Ctrl+Alt+O
   * ========================= */
  var admin = $('#ogx-admin');
  function openAdmin(){ if(admin) admin.hidden=false; }
  function closeAdmin(){ if(admin) admin.hidden=true; }
  d.addEventListener('keydown', function(e){ if(e.ctrlKey && e.altKey && (e.key==='o'||e.key==='O')) openAdmin(); if(e.key==='Escape') closeAdmin(); });
  var rowsHost = $('#ogx-admin-rows');
  function buildAdmin(){
    if(!admin || !rowsHost) return;
    rowsHost.innerHTML='';
    var cfg=readCfg();
    PARTNERS.forEach(function(p){
      var row=d.createElement('div'); row.className='ogx-admin-grid ogx-admin-row';
      row.innerHTML=''
        +'<div class="ogx-cell-id">'+p.id+'</div>'
        +'<div><input type="text" class="ogx-inp-track" placeholder="트랙 URL" /></div>'
        +'<div><input type="text" class="ogx-inp-api" placeholder="API 키 또는 엔드포인트" /></div>'
        +'<div><label style="display:inline-flex;align-items:center;gap:6px"><input type="checkbox" class="ogx-inp-eff" /> 발효</label></div>'
        +'<div><button type="button" class="ogx-btn ogx-apply">적용</button></div>';
      rowsHost.appendChild(row);
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
        initFooter(); // rebuild to reflect state
      });
    });
    $('.ogx-admin-close').onclick=closeAdmin;
    $('#ogx-admin-export').onclick=function(){
      var blob=new Blob([JSON.stringify(readCfg(),null,2)],{type:'application/json'});
      var a=d.createElement('a'); a.href=URL.createObjectURL(blob); a.download='ogx-partners-config.json'; a.click(); URL.revokeObjectURL(a.href);
    };
    $('#ogx-admin-import').onclick=function(){ $('#ogx-admin-file').click(); };
    $('#ogx-admin-file').onchange=function(ev){
      var f=ev.target.files && ev.target.files[0]; if(!f) return;
      var rd=new FileReader();
      rd.onload=function(){ try{ var obj=JSON.parse(rd.result); saveCfg(obj); buildAdmin(); initFooter(); }catch(e){ alert('Invalid JSON'); } };
      rd.readAsText(f);
    };
  }

/* =========================
   * 5) Translation orb (EN UI; no auto send)
   * ========================= */
  var fab=$('#ogx-trans-fab'); var orb=$('#ogx-trans-orb');
  var LS_ORB='ogx.trans.pos.v1';
  function saveOrbPos(x,y){ try{ w.localStorage.setItem(LS_ORB, JSON.stringify({x:x,y:y})); }catch(e){} }
  function loadOrbPos(){ try{ var s=w.localStorage.getItem(LS_ORB); return s? JSON.parse(s):null; }catch(e){ return null; } }

  function initOrb(){
    if(!fab || !orb) return;
    fab.addEventListener('click', function(){ orb.hidden=!orb.hidden; });
    $('.ogx-trans-close', orb).addEventListener('click', function(){ orb.hidden=true; });
    $('#ogx-trans-clear', orb).addEventListener('click', function(){ $('#ogx-trans-src').value=''; });
    $('#ogx-trans-run', orb).addEventListener('click', function(){
      var eng=$('.ogx-flag.is-sel', orb); var txt=$('#ogx-trans-src').value||''; var q=encodeURIComponent(txt); var url='https://translate.google.com/?sl=auto&tl=en&op=translate&text='+q;
      if(eng && eng.dataset.engine==='papago') url='https://papago.naver.com/?sk=auto&tk=en&st='+q;
      if(eng && eng.dataset.engine==='deepl')  url='https://www.deepl.com/translator#auto/en/'+q;
      try{ w.open(url,'_blank','noopener'); }catch(e){ w.location.href=url; }
    });
    $$('.ogx-flag', orb).forEach(function(b){
      b.addEventListener('click', function(){ $$('.ogx-flag', orb).forEach(function(x){ x.classList.remove('is-sel'); }); b.classList.add('is-sel'); });
    });
    // Drag move + persist
    var dragging=false, sx=0, sy=0, ox=0, oy=0;
    function place(x,y){ orb.style.right=''; orb.style.bottom=''; orb.style.left=(x|0)+'px'; orb.style.top=(y|0)+'px'; }
    var pos=loadOrbPos(); if(pos) place(pos.x,pos.y);
    orb.addEventListener('mousedown', function(e){ if(e.target.closest('textarea,button,input')) return; dragging=true; sx=e.clientX; sy=e.clientY; var r=orb.getBoundingClientRect(); ox=r.left; oy=r.top; e.preventDefault(); });
    d.addEventListener('mousemove', function(e){ if(!dragging) return; place(ox+e.clientX-sx, oy+e.clientY-sy); });
    d.addEventListener('mouseup', function(){ if(!dragging) return; dragging=false; var r=orb.getBoundingClientRect(); saveOrbPos(r.left, r.top); });
  }

  /* =========================
   * Bootstrap
   * ========================= */
  function init(){
    initFooter();
    buildAdmin();
    initOrb();
  }
  if(d.readyState==='loading'){ d.addEventListener('DOMContentLoaded', init); }
  else{ init(); }

})(window, document);
