// overlay.header.js : translator 3 engines, search normalize, pager, owner-only notice editor
(function(w,d){
  var root = d.getElementById('og-header');
  if(!root) return;

  // Owner detect: set cookie 'ogOwner=1' or window.OG_IS_OWNER=true
  var isOwner = (w.OG_IS_OWNER === true) || (d.cookie.indexOf('ogOwner=1') > -1);

  // Translator UI
  var langSel = root.querySelector('#og-lang');
  var transBar = root.querySelector('#og-trans-bar');
  if(langSel && transBar){
    langSel.addEventListener('change', function(){
      if(langSel.value){ transBar.hidden = false; } else { transBar.hidden = true; }
    });
    transBar.addEventListener('click', function(e){
      var btn = e.target.closest('button[data-engine]'); if(!btn) return;
      var engine = btn.getAttribute('data-engine');
      var lang = langSel.value || 'en';
      var url = w.location.href;
      var dest = '#';
      if(engine === 'google'){
        dest = 'https://translate.google.com/translate?sl=auto&tl='+encodeURIComponent(lang)+'&u='+encodeURIComponent(url);
      }else if(engine === 'papago'){
        // Papago does not support URL param officially; pass URL as text
        dest = 'https://papago.naver.com/?sk=auto&tk='+encodeURIComponent(lang)+'&st='+encodeURIComponent(url);
      }else if(engine === 'deepl'){
        dest = 'https://www.deepl.com/translator#auto/'+encodeURIComponent(lang)+'/'+encodeURIComponent(url);
      }
      w.open(dest, '_blank', 'noopener,noreferrer');
    });
  }

  // Search normalize: #123 -> #000123
  var form = root.querySelector('form.og-search');
  if(form){
    form.addEventListener('submit', function(){
      var ipt=form.querySelector('input[name="q"]'); if(!ipt) return;
      var v=(ipt.value||'').trim(); var m=v.match(/^(?:#)?(\d{1,6})$/);
      if(m) ipt.value='#'+m[1].padStart(6,'0');
    });
  }

  // Pager wiring (Prev/Next)
  function findPager(sel){ return d.querySelector(sel); }
  var prev = root.querySelector('.og-prev');
  var next = root.querySelector('.og-next');
  var blogPrev = findPager('a.blog-pager-older-link, a#Blog1_blog-pager-older-link');
  var blogNext = findPager('a.blog-pager-newer-link, a#Blog1_blog-pager-newer-link');
  if(prev){ if(blogNext){ prev.href = blogNext.href; } else { prev.setAttribute('disabled','disabled'); } }
  if(next){ if(blogPrev){ next.href = blogPrev.href; } else { next.setAttribute('disabled','disabled'); } }

  // Notice editor: owner-only editor, public display from localStorage
  var editor = root.querySelector('.og-notice-editor');
  var disp   = root.querySelector('.og-notice-display');
  var textarea = root.querySelector('#og-notice');
  var applyBtn = root.querySelector('.og-apply');

  function renderNotice(){
    var val = '';
    try{ val = w.localStorage.getItem('ogNotice') || ''; }catch(_){}
    if(disp){ disp.textContent = val; }
    if(isOwner && textarea){ textarea.value = val; }
  }

  if(isOwner && editor){ editor.hidden = false; } // show editor only for owner
  renderNotice();

  if(applyBtn && textarea){
    applyBtn.addEventListener('click', function(){
      var val = textarea.value || '';
      try{ w.localStorage.setItem('ogNotice', val); }catch(_){}
      renderNotice();
      alert('Notice applied');
    });
  }
})(window, document);
