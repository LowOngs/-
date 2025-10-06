// overlay.header.js : Contempo-synced header v64-en

(function(w,d){
  var root = d.getElementById('og-header');
  if(!root) return;

  var isOwner = (w.OG_IS_OWNER === true) || (d.cookie.indexOf('ogOwner=1') > -1);

  try {
    var cs = w.getComputedStyle(d.body);
    root.style.backgroundImage   = cs.backgroundImage;
    root.style.backgroundColor   = cs.backgroundColor;
    root.style.backgroundSize    = cs.backgroundSize;
    root.style.backgroundRepeat  = cs.backgroundRepeat;
    root.style.backgroundPosition= cs.backgroundPosition;
  } catch(_){}

  function onScroll(){
    var y = w.scrollY || d.documentElement.scrollTop || 0;
    if(y>8) root.classList.add('og-compact'); else root.classList.remove('og-compact');
  }
  w.addEventListener('scroll', onScroll, {passive:true}); onScroll();

  var langSel = root.querySelector('#og-lang');
  var transBar = root.querySelector('#og-trans-bar');
  var tipBtn = root.querySelector('.og-tip-btn');
  var tipBox = root.querySelector('.og-tooltip');
  if(langSel && transBar){
    langSel.addEventListener('change', function(){ transBar.hidden = !langSel.value; });
  }
  if(tipBtn && tipBox){
    tipBtn.addEventListener('click', function(){
      var vis = !tipBox.hasAttribute('hidden');
      if(vis) tipBox.setAttribute('hidden',''); else { tipBox.removeAttribute('hidden'); setTimeout(function(){ tipBox.setAttribute('hidden',''); }, 5000); }
    });
  }
  if(transBar){
    transBar.addEventListener('click', function(e){
      var btn = e.target.closest('button[data-engine]'); if(!btn) return;
      var engine = btn.getAttribute('data-engine');
      var lang = (langSel && langSel.value) || 'en';
      var url = w.location.href;
      var dest = '#';
      if(engine === 'google') dest = 'https://translate.google.com/translate?sl=auto&tl='+encodeURIComponent(lang)+'&u='+encodeURIComponent(url);
      else if(engine === 'papago') dest = 'https://papago.naver.com/?sk=auto&tk='+encodeURIComponent(lang)+'&st='+encodeURIComponent(url);
      else if(engine === 'deepl') dest = 'https://www.deepl.com/translator#auto/'+encodeURIComponent(lang)+'/'+encodeURIComponent(url);
      w.open(dest, '_blank', 'noopener,noreferrer');
    });
  }

  var form = root.querySelector('form.og-search');
  if(form){
    form.addEventListener('submit', function(){
      var ipt=form.querySelector('input[name="q"]'); if(!ipt) return;
      var v=(ipt.value||'').trim(); var m=v.match(/^(?:#)?(\d{1,6})$/);
      if(m) ipt.value='#'+m[1].padStart(6,'0');
    });
  }

  function q(sel){ return d.querySelector(sel); }
  var prev = root.querySelector('.og-prev');
  var next = root.querySelector('.og-next');
  var blogPrev = q('a.blog-pager-older-link, a#Blog1_blog-pager-older-link');
  var blogNext = q('a.blog-pager-newer-link, a#Blog1_blog-pager-newer-link');
  if(prev){ if(blogNext) prev.href = blogNext.href; else prev.setAttribute('disabled','disabled'); }
  if(next){ if(blogPrev) next.href = blogPrev.href; else next.setAttribute('disabled','disabled'); }

  // Notice system
  var editor = root.querySelector('.og-notice-editor');
  var textarea = root.querySelector('#og-notice');
  var btnApply = root.querySelector('.og-apply');
  var btnStop  = root.querySelector('.og-stop');
  var ticker   = root.querySelector('.og-notice-ticker');
  var tickTxt  = root.querySelector('#og-notice-text');
  var btnPrev  = root.querySelector('.og-notice-btn.prev');
  var btnNext  = root.querySelector('.og-notice-btn.next');

  function loadList(){
    try{
      var raw = w.localStorage.getItem('ogNoticeList');
      if(!raw) return [];
      var arr = JSON.parse(raw);
      return Array.isArray(arr)? arr : [];
    }catch(_){
      return [];
    }
  }
  function saveList(arr){
    try{ w.localStorage.setItem('ogNoticeList', JSON.stringify(arr||[])); }catch(_){}
  }
  function loadIndex(){
    try{ return parseInt(w.localStorage.getItem('ogNoticeIndex')||'0',10) || 0; }catch(_){ return 0; }
  }
  function saveIndex(i){
    try{ w.localStorage.setItem('ogNoticeIndex', String(i||0)); }catch(_){}
  }
  function loadRunning(){
    try{ return w.localStorage.getItem('ogNoticeRunning') === '1'; }catch(_){ return false; }
  }
  function saveRunning(b){
    try{ w.localStorage.setItem('ogNoticeRunning', b? '1':'0'); }catch(_){}
  }

  var list = loadList();
  var idx  = Math.min(loadIndex(), Math.max(0, list.length-1));
  var run  = loadRunning();

  function renderTicker(){
    if(!ticker || !tickTxt) return;
    if(!list.length){
      ticker.hidden = true;
      if(btnPrev) btnPrev.disabled = true;
      if(btnNext) btnNext.disabled = true;
      return;
    }
    tickTxt.textContent = list[idx] || '';
    ticker.hidden = false;
    if(btnPrev) btnPrev.disabled = (list.length<=1);
    if(btnNext) btnNext.disabled = (list.length<=1);
    tickTxt.style.animationPlayState = run ? 'running' : 'paused';
  }

  function showEditor(show){
    if(!editor) return;
    editor.hidden = !show;
  }

  if(isOwner){
    showEditor(!run);
  } else {
    showEditor(false);
  }

  renderTicker();

  if(btnApply) btnApply.addEventListener('click', function(){
    if(!textarea) return;
    var lines = (textarea.value||'').split(/\r?\n/).map(function(s){return s.trim();}).filter(Boolean);
    list = lines;
    idx = 0;
    run = list.length>0;
    saveList(list); saveIndex(idx); saveRunning(run);
    renderTicker();
    if(isOwner){ 
      showEditor(!run);
      if(btnApply) btnApply.hidden = !!run;
      if(btnStop)  btnStop.hidden  = !run;
    }
    if(!run) alert('No notices entered.');
  });

  if(btnStop) btnStop.addEventListener('click', function(){
    run = false; saveRunning(run); renderTicker();
    if(isOwner){ 
      showEditor(true);
      if(btnApply) btnApply.hidden = false;
      if(btnStop)  btnStop.hidden  = true;
    }
  });

  function shift(delta){
    if(!list.length) return;
    idx = (idx + delta + list.length) % list.length;
    saveIndex(idx); renderTicker();
  }
  if(btnPrev) btnPrev.addEventListener('click', function(){ shift(-1); });
  if(btnNext) btnNext.addEventListener('click', function(){ shift(1); });
})(window,document);
