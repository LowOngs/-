// scaffold: common.js


// ---- Default API endpoint templates & headers (override anytime) ----
(function(){
  // You can override these from skin.html before common.js, e.g.:
  // <script>window.DEAL_ENDPOINTS.coupang = "https://...";</script>
  window.DEAL_ENDPOINTS = Object.assign({
    coupang:   "https://api.example.com/coupang?token={token}",
    gmarket:   "https://api.example.com/gmarket?token={token}",
    "11st":    "https://api.example.com/11st?token={token}",
    musinsa:   "https://api.example.com/musinsa?token={token}",
    amazon:    "https://api.example.com/amazon?auth={token}",
    ebay:      "https://api.example.com/ebay?token={token}",
    aliexpress:"https://api.example.com/aliexpress?token={token}",
    otto:      "https://api.example.com/otto?token={token}",
    allegro:   "https://api.example.com/allegro?token={token}",
    lazada:    "https://api.example.com/lazada?token={token}",
    shopee:    "https://api.example.com/shopee?token={token}",
    auction:   "https://api.example.com/auction?token={token}"
  }, window.DEAL_ENDPOINTS || {});

  // Optional per-partner headers. Use '*' for defaults applied to all.
  window.DEAL_HEADERS = Object.assign({
    "*": {"X-Client": "Odyssey-Tistory"},
    amazon: {"Authorization": "Bearer {token}"},
    ebay:   {"X-API-Key": "{token}"}
  }, window.DEAL_HEADERS || {});

  // Helper to resolve header tokens
  window.__resolveHeaders__ = function(partnerKey, apiValue){
    var hdrs = (window.DEAL_HEADERS && (window.DEAL_HEADERS[partnerKey] || window.DEAL_HEADERS["*"])) || null;
    if (!hdrs) return null;
    var out = {};
    Object.keys(hdrs).forEach(function(k){
      out[k] = String(hdrs[k]).replace("{token}", String(apiValue||""));
    });
    return out;
  };
})();



// ---- Click tracking & stats modal ----
(function(){
  var SKEY = 'deal_click_stats_v122'; // { partner: { total: n, days: { 'YYYY-MM-DD': n } } }

  function today(){ var d=new Date(); return d.toISOString().slice(0,10); }
  function loadStats(){ try{ return JSON.parse(localStorage.getItem(SKEY)||'{}'); }catch(e){ return {}; } }
  function saveStats(s){ try{ localStorage.setItem(SKEY, JSON.stringify(s)); }catch(e){} }

  // Increment on partner click
  document.addEventListener('click', function(ev){
    var a = ev.target.closest && ev.target.closest('a[data-partner]');
    if (!a || a.classList.contains('is-disabled')) return;
    var key = a.getAttribute('data-partner');
    if (!key) return;
    var s = loadStats();
    var rec = s[key] || { total:0, days:{} };
    rec.total += 1;
    var t = today();
    rec.days[t] = (rec.days[t]||0) + 1;
    s[key] = rec; saveStats(s);
  }, true);

  // Stats modal render
  function sumRange(daysMap, days){
    var res=0; var now=new Date();
    for (var i=0;i<days;i++){
      var d=new Date(now.getTime() - i*86400000);
      var k=d.toISOString().slice(0,10);
      res += daysMap[k]||0;
    }
    return res;
  }
  function renderStats(){
    var tb = document.getElementById('deal_stats_body'); if (!tb) return;
    var s = loadStats();
    var keys = Object.keys(s);
    if (!keys.length){ tb.innerHTML = '<tr><td colspan="4" style="text-align:center; color:#888;">데이터 없음</td></tr>'; return; }
    tb.innerHTML = keys.map(function(k){
      var r=s[k]; var d7=sumRange(r.days||{},7); var d30=sumRange(r.days||{},30);
      var label = (window.PARTNER_LABELS && window.PARTNER_LABELS[k]) || k;
      return '<tr><td>'+label+'</td><td>'+ (r.total||0) +'</td><td>'+d7+'</td><td>'+d30+'</td></tr>';
    }).join('');
  }

  // Export CSV
  function exportCSV(){
    var s = loadStats();
    var rows = [['partner','label','total','last7','last30']];
    Object.keys(s).forEach(function(k){
      var r=s[k]; var d7=sumRange(r.days||{},7); var d30=sumRange(r.days||{},30);
      var label = (window.PARTNER_LABELS && window.PARTNER_LABELS[k]) || k;
      rows.push([k, label, String(r.total||0), String(d7), String(d30)]);
    });
    var csv = rows.map(function(cols){
      return cols.map(function(c){ return /[",\n]/.test(c)? ('"'+c.replace(/"/g,'""')+'"') : c; }).join(',');
    }).join('\n');
    var blob = new Blob([csv], {type:'text/csv;charset=utf-8;'});
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url; a.download = 'deal_click_stats.csv';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // Modal open/close
  var statsModal = document.getElementById('deal_stats_modal');
  var openStats = document.querySelector('.btn-operator-stats');
  if (openStats && statsModal){
    openStats.addEventListener('click', function(){
      renderStats();
      statsModal.hidden = false;
    });
  }
  if (statsModal){
    statsModal.addEventListener('click', function(ev){
      if (ev.target === statsModal) statsModal.hidden = true;
    });
    var closeBtn = statsModal.querySelector('[data-close-stats]');
    if (closeBtn){ closeBtn.addEventListener('click', function(){ statsModal.hidden = true; }); }
    var exportBtn = statsModal.querySelector('.btn-export-csv');
    if (exportBtn){ exportBtn.addEventListener('click', exportCSV); }
    var resetBtn = statsModal.querySelector('.btn-reset-stats');
    if (resetBtn){ resetBtn.addEventListener('click', function(){
      if (!confirm('통계를 초기화할까요?')) return;
      localStorage.removeItem(SKEY);
      renderStats();
    }); }
  }

  // Labels map for nicer table headings
  window.PARTNER_LABELS = {
    coupang:"쿠팡", gmarket:"지마켓", "11st":"11번가", musinsa:"무신사",
    amazon:"아마존", ebay:"이베이", aliexpress:"알리익스프레스", otto:"OTTO",
    allegro:"Allegro", lazada:"라자다", shopee:"Shopee", auction:"옥션"
  };
})();


// Render stats into 2-row grid boxes (total clicks per partner)
(function(){
  var SKEY = 'deal_click_stats_v122';
  function loadStats(){ try{ return JSON.parse(localStorage.getItem(SKEY)||'{}'); }catch(e){ return {}; } }
  function renderStatsGrid(){
    var s = loadStats();
    document.querySelectorAll('#deal_stats_modal .grid-item').forEach(function(box){
      var key = box.getAttribute('data-partner-k');
      var val = (s[key] && s[key].total) ? s[key].total : 0;
      var input = box.querySelector('.gi-value');
      if (input){
        input.value = String(val);
        input.setAttribute('readonly','readonly');
        input.setAttribute('tabindex','-1');
      }
    });
  }
  var statsModal = document.getElementById('deal_stats_modal');
  var openStats = document.querySelector('.btn-operator-stats');
  if (openStats && statsModal){
    openStats.addEventListener('click', function(){
      renderStatsGrid();
      statsModal.hidden = false;
    });
  }
})();


// KST-based month and yearly totals rendering
(function(){
  var SKEY = 'deal_click_stats_v122';
  function loadStats(){ try{ return JSON.parse(localStorage.getItem(SKEY)||'{}'); }catch(e){ return {}; } }

  function kstFromUTCDateStr(dstr){ // dstr = 'YYYY-MM-DD' saved in UTC
    var dt = new Date(dstr + 'T00:00:00Z'); // UTC midnight
    var k = new Date(dt.getTime() + 9*60*60*1000); // shift to KST
    return k;
  }
  function currentKST(){
    var now = new Date();
    return new Date(now.getTime() + (9*60*60*1000 - now.getTimezoneOffset()*60*1000));
  }
  function ymdKST(d){ // returns [yyyy, mm, dd]
    var y = d.getUTCFullYear();
    var m = d.getUTCMonth() + 1;
    var da = d.getUTCDate();
    return [y, m, da];
  }
  function sumMonthKST(daysMap, y, m){
    var sum = 0;
    for (var k in daysMap){
      if (!Object.prototype.hasOwnProperty.call(daysMap,k)) continue;
      var dt = kstFromUTCDateStr(k);
      var ym = ymdKST(dt);
      if (ym[0]===y && ym[1]===m) sum += daysMap[k]||0;
    }
    return sum;
  }
  function sumYearKST(daysMap, y){
    var sum = 0;
    for (var k in daysMap){
      if (!Object.prototype.hasOwnProperty.call(daysMap,k)) continue;
      var dt = kstFromUTCDateStr(k);
      var ym = ymdKST(dt);
      if (ym[0]===y) sum += daysMap[k]||0;
    }
    return sum;
  }
  function sumAll(daysMap){
    var s=0; for (var k in daysMap){ if (Object.prototype.hasOwnProperty.call(daysMap,k)) s += daysMap[k]||0; } return s;
  }

  function renderStatsMonthAndTotals(){
    var nowK = currentKST();
    var Y = nowK.getUTCFullYear();
    var M = nowK.getUTCMonth() + 1;
    var s = loadStats();

    // Per-partner month totals into 12 boxes
    document.querySelectorAll('#deal_stats_modal .grid-item[data-partner-k]').forEach(function(box){
      var key = box.getAttribute('data-partner-k');
      var rec = s[key] || { total:0, days:{} };
      var monthSum = sumMonthKST(rec.days||{}, Y, M);
      var input = box.querySelector('.gi-value');
      if (input){
        input.value = String(monthSum);
        input.setAttribute('readonly','readonly');
        input.setAttribute('tabindex','-1');
      }
    });

    // Overall yearly and cumulative totals (all partners combined)
    var yearTotal = 0, allTotal = 0;
    Object.keys(s).forEach(function(k){
      var rec = s[k] || { total:0, days:{} };
      yearTotal += sumYearKST(rec.days||{}, Y);
      allTotal  += sumAll(rec.days||{});
    });
    var yEl = document.getElementById('stats_year_total');
    var aEl = document.getElementById('stats_all_total');
    if (yEl) { yEl.value = String(yearTotal); yEl.setAttribute('readonly','readonly'); yEl.setAttribute('tabindex','-1'); }
    if (aEl) { aEl.value = String(allTotal);  aEl.setAttribute('readonly','readonly'); aEl.setAttribute('tabindex','-1'); }
  }

  // Hook into opening the stats modal
  (function(){
    var statsModal = document.getElementById('deal_stats_modal');
    var openStats = document.querySelector('.btn-operator-stats');
    if (openStats && statsModal){
      openStats.addEventListener('click', function(){
        renderStatsMonthAndTotals();
        statsModal.hidden = false;
      });
    }
  })();
})();


// Make the block above operator-entry (visitor counter) read-only
(function(){
  function makeReadOnly(root){
    if (!root) return;
    // Inputs & textareas: set readOnly
    root.querySelectorAll('input, textarea').forEach(function(el){
      try { el.readOnly = true; el.setAttribute('readonly','readonly'); } catch(e){}
      // prevent on-screen keyboards / edits
      el.addEventListener('keydown', function(ev){ ev.preventDefault(); }, {passive:false});
      el.addEventListener('input', function(ev){ ev.preventDefault(); ev.target.value = ev.target.defaultValue || ev.target.value; }, {passive:false});
    });
    // contentEditable off
    root.querySelectorAll('[contenteditable="true"], [contenteditable=""]').forEach(function(el){
      el.setAttribute('contenteditable','false');
    });
    // Prevent clicks that would edit
    root.addEventListener('click', function(ev){
      var t = ev.target;
      if (t && (t.tagName==='INPUT' || t.tagName==='TEXTAREA' || t.isContentEditable)){
        ev.preventDefault();
      }
    }, true);
    // Visual cue optional (no style change to avoid layout shift)
    root.classList.add('visitor-readonly');
  }

  function init(){
    var op = document.getElementById('deal_operator_entry');
    if (!op) return;
    var prev = op.previousElementSibling;
    if (!prev) return;
    makeReadOnly(prev);
  }

  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', init);
  } else { init(); }
})();

