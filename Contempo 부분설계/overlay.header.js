// overlay.header.js : Contempo-synced header vv63
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

  var editor=root.querySelector('.og-notice-editor');
  var textarea=root.querySelector('#og-notice');
  var btnApply=root.querySelector('.og-apply');
  var btnStop=root.querySelector('.og-stop');
  var ticker=root.querySelector('.og-notice-ticker');
  var tickTxt=root.querySelector('#og-notice-text');

  function loadNotice(){ try{return w.localStorage.getItem('ogNotice')||'';}catch(_){return'';} }
  function saveNotice(v){ try{w.localStorage.setItem('ogNotice',v||'');}catch(_){} }
  function showTicker(text){ if(!ticker||!tickTxt)return; if(!text){ticker.hidden=true;return;} tickTxt.textContent=text; ticker.hidden=false; }
  function playTicker(run){ if(!tickTxt)return; tickTxt.style.animationPlayState = run ? 'running' : 'paused'; }

  var current=loadNotice();
  showTicker(current); playTicker(!!current);

  if(isOwner && editor){ editor.hidden=false; if(textarea) textarea.value=current; }
  if(isOwner){ if(btnApply) btnApply.hidden=!!current; if(btnStop) btnStop.hidden=!current; }

  if(btnApply) btnApply.addEventListener('click', function(){
    var val=(textarea&&textarea.value||'').trim();
    saveNotice(val); showTicker(val); playTicker(!!val);
    if(isOwner){ btnApply.hidden=!!val; if(btnStop) btnStop.hidden=!val; }
    alert('공지 적용 완료');
  });
  if(btnStop) btnStop.addEventListener('click', function(){
    playTicker(false);
    if(isOwner){ btnStop.hidden=true; if(btnApply) btnApply.hidden=false; }
    alert('공지 흐름 중지됨');
  });
})(window,document);
