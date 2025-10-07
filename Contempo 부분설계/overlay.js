// overlay.layout.js
(function(w,d){
  'use strict';
  var $ = (s,c)=> (c||d).querySelector(s);
  var $$= (s,c)=> Array.prototype.slice.call((c||d).querySelectorAll(s));

  // Sidebar toggle (independent scroll preserved)
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

  // Footer partners (minimal, 12 placeholders; replace logos with your images)
  var partners = [
    {id:'amazon', img:'https://drive.google.com/uc?export=view&id=1TSqB8lWokfq6cmbCjJyLLEtS9A8YKDQ9'},
    {id:'ebay', img:'https://drive.google.com/uc?export=view&id=1DMHCahD75qUG49jWXRPoOjglYf4oXjuB'},
    {id:'target', img:'https://drive.google.com/uc?export=view&id=1IE1vhCO7Njq0hRRt5FRbJ7YltHtzwRJr'},
    {id:'mercadolibre', img:'https://drive.google.com/uc?export=view&id=1Y3uSYQPw50Wut1WVCrnCcsaYbyoSD7xH'},
    {id:'flipkart', img:'https://drive.google.com/uc?export=view&id=1jCVIkW-ULS5GO9zD-dpDEV0Jsp7dTU4d'},
    {id:'amazonin', img:'https://drive.google.com/uc?export=view&id=14jXDZSGLbiIehaCUvaK6ytpjW1fEZO7G'},
    {id:'shopee', img:'https://drive.google.com/uc?export=view&id=1myIvsI6UvOJSrLV45VH4f7wo5Ow9Ucbv'},
    {id:'lazada', img:'https://drive.google.com/uc?export=view&id=1CGl9Ff1v1cG3O-UmVABo8wgQB-9JD_z3'},
    {id:'aliexpress', img:'https://drive.google.com/uc?export=view&id=1Z5-ybY3i62klO-oCvgAXVHfHH0oRyzLL'},
    {id:'otto', img:'https://drive.google.com/uc?export=view&id=1IqWAFrpAeoANqj93UxmO8HV51szrt4_a'},
    {id:'zalando', img:'https://drive.google.com/uc?export=view&id=1lAAIsrWowMJxXyMbffS-Je3odofKX6j-'},
    {id:'allegro', img:'https://drive.google.com/uc?export=view&id=1h2SYQvG8UL9uzAhsjXMxqEA9YaHSNZK'}
  ];

  var track = $('.ogx-ft-track');
  var prev = $('.ogx-ft-prev');
  var next = $('.ogx-ft-next');
  if(track){
    partners.forEach(function(p){
      var item = d.createElement('button');
      item.className='ogx-ft-item'; item.type='button'; item.setAttribute('role','option'); item.setAttribute('aria-label', p.id);
      var logo = d.createElement('div'); logo.className='logo'; logo.style.backgroundImage="url('"+p.img+"')";
      var D = d.createElement('span'); D.className='ogx-badgeD'; D.textContent='D';
      item.appendChild(logo); item.appendChild(D);
      item.addEventListener('click', function(){ /* hook to tracking url if needed */ });
      track.appendChild(item);
    });
    function step(dir){ var wv = track.clientWidth||300; track.scrollBy({left: dir*wv*0.9, behavior:'smooth'}); }
    if(prev) prev.addEventListener('click', function(){ step(-1); });
    if(next) next.addEventListener('click', function(){ step(1); });
    track.addEventListener('keydown', function(e){ if(e.key==='ArrowLeft') step(-1); if(e.key==='ArrowRight') step(1); });
  }

  // Notice lane admin (Korean labels, admin-only reveal toggle hook)
  var noticeText = $('#ogx-notice-text');
  var noticeInput= $('#ogx-notice-input');
  var btnApply   = $('#ogx-notice-apply');
  var btnPause   = $('#ogx-notice-pause');
  var paused = false;

  if(btnApply && noticeInput && noticeText){
    btnApply.addEventListener('click', function(){
      var v = (noticeInput.value||'').trim();
      if(v){ noticeText.textContent = v; paused=false; noticeText.style.animationPlayState='running'; }
    });
  }
  if(btnPause && noticeText){
    btnPause.addEventListener('click', function(){
      paused = !paused;
      noticeText.style.animationPlayState = paused ? 'paused' : 'running';
      btnPause.textContent = paused ? '적용' : '중지';
    });
  }

})(window, document);
