/* Place-guide page content.
   As of this version, the snapshot / uniqueness / when-to-go / themed-activities /
   FAQ content is baked directly into each places/*.html file at build time by
   bake_place_content.py (run from the repo root, re-run any time
   content/places.json changes via the CMS). That means the content is already
   in the page's raw HTML — no fetch or render needed for it to be visible,
   which is what search engines and no-JS visitors see.

   This script now only does two things:
   1. Progressive enhancement: wires up the filter chips, collapsible groups,
      FAQ accordion, and itinerary add buttons on whatever markup is already
      in the page (baked or not).
   2. Fallback rendering: if a page hasn't been rebuilt yet (baked markup is
      missing), it fetches content/places.json and builds the same markup
      client-side, same as before, so nothing breaks for any page that's
      temporarily out of sync with the JSON. */
(function(){
  var PLACE = document.body.dataset.place || '';
  if(!PLACE) return;
  var norm = function(s){ return (s||'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim(); };
  var esc  = function(s){ return (s||'').replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];}); };
  var CATCOLOR = {culture:'#6e84a3', nature:'#4f938f', food:'#b5563a', adventure:'#c9a876'};
  var ORDER = ['Wildlife & nature','Culture & history','Food & markets','Adventure & outdoors','Coast & water','Cities & design','Slow days'];

  var KEY='diskoverus_itinerary_v1';
  function itin(){ try{ return JSON.parse(localStorage.getItem(KEY)||'[]')||[]; }catch(e){ return []; } }
  var cid = norm(PLACE).replace(/[0-9]/g,'').trim();
  function has(t){ return itin().some(function(i){ return i.countryId===cid && i.title===t; }); }
  function toggle(t,dur){
    var list=itin();
    var i=list.findIndex(function(x){ return x.countryId===cid && x.title===t; });
    if(i>-1) list.splice(i,1); else list.push({countryId:cid, countryName:PLACE, title:t, dur:dur||''});
    try{ localStorage.setItem(KEY, JSON.stringify(list)); }catch(e){}
    if(window.__placeItinSync) window.__placeItinSync(list);
    return i<0;
  }

  /* ---- Progressive enhancement: works on whatever markup is present,
     baked-at-build-time or freshly rendered by the fallback below. ---- */
  function wireInteractivity(){
    // filter chips
    var fil = document.getElementById('pcFilter');
    if(fil){
      fil.querySelectorAll('.pc-chip').forEach(function(b){
        b.addEventListener('click', function(){
          fil.querySelectorAll('.pc-chip').forEach(function(x){ x.classList.remove('on'); });
          b.classList.add('on');
          var active = b.dataset.k;
          document.querySelectorAll('.pc-group').forEach(function(g){
            g.style.display = (active==='All' || g.dataset.theme===active) ? '' : 'none';
            if(active!=='All') g.classList.remove('closed');
          });
        });
      });
    }
    // collapsible groups
    document.querySelectorAll('.pc-group-head').forEach(function(head){
      head.addEventListener('click', function(){ head.closest('.pc-group').classList.toggle('closed'); });
    });
    // FAQ accordion
    document.querySelectorAll('.pc-faq-q').forEach(function(q){
      q.addEventListener('click', function(){ q.closest('.pc-faq-item').classList.toggle('open'); });
    });
    // itinerary add buttons
    function paintAdds(){
      document.querySelectorAll('.pc-card').forEach(function(card){
        var t=card.dataset.title, b=card.querySelector('.pc-add');
        if(!b) return;
        var on=has(t); b.classList.toggle('added',on); b.textContent = on?'✓':'+';
        b.title = on?'Remove from your itinerary':'Add to your itinerary';
      });
    }
    document.querySelectorAll('.pc-add').forEach(function(b){
      b.addEventListener('click', function(){
        var card=b.closest('.pc-card');
        toggle(card.dataset.title, card.dataset.dur);
        paintAdds();
      });
    });
    paintAdds();
    window.__pcPaint = paintAdds;
  }

  var alreadyBaked = !!document.querySelector('.pc-filter, .pc-faq, .pc-snap, .pc-unique, .pc-when');
  if(alreadyBaked){
    wireInteractivity();
    return;
  }

  /* ---- Fallback: page hasn't been rebuilt with baked content yet.
     Fetch content/places.json and render the same markup client-side. ---- */
  function starRow(n){
    var h='';
    for(var i=1;i<=5;i++) h += '<span class="'+(i<=n?'on':'off')+'">★</span>';
    return '<span class="pc-stars">'+h+'</span>';
  }
  function fmtRange(r, suffix){
    if(!r || typeof r.low!=='number' || typeof r.high!=='number') return '';
    return '$'+r.low+'–$'+r.high+(suffix||'');
  }
  function snapshotHtml(snap){
    if(!snap) return '';
    var practical = snap.practical || {};
    var items=[
      ['Budget', snap.budget],
      ['Best for', snap.tripLength],
      ['Visa', snap.visa],
      ['Currency', snap.currency],
      ['Languages', snap.languages],
      ['Internet', snap.internet],
      ['Typical lodging', fmtRange(snap.lodging, '/night')],
      ['Driving side', practical.driving ? (practical.driving.charAt(0).toUpperCase()+practical.driving.slice(1)) : ''],
      ['Power & voltage', practical.voltage],
      ['Time zone', practical.timezone],
      ['Emergency number', practical.emergency]
    ].filter(function(p){ return (p[1]||'').toString().trim(); });
    if(!items.length && !(Array.isArray(snap.ratings) && snap.ratings.length)) return '';
    var grid = items.map(function(p){
      return '<div class="pc-snap-item"><span>'+esc(p[0])+'</span><b>'+esc(p[1])+'</b></div>';
    }).join('');
    var stars = (Array.isArray(snap.ratings) && snap.ratings.length)
      ? '<div class="pc-snap-stars">'+snap.ratings.map(function(r){
          return '<span class="pc-snap-stat">'+starRow(r.stars||0)+' '+esc(r.category||'')+'</span>';
        }).join('')+'</div>' : '';
    var visaNote = (snap.visa||practical.emergency)
      ? '<p class="pc-snap-caveat">Visa rules and emergency numbers can change without notice — confirm the specifics for your nationality and dates before you travel.</p>' : '';
    var smart = (snap.travelSmart||'').toString().trim()
      ? '<div class="pc-smart"><span class="pc-smart-label">Travel smart</span><p>'+esc(snap.travelSmart)+'</p></div>' : '';
    return '<div class="pc-snap"><div class="pc-snap-card"><div class="pc-snap-grid">'+grid+'</div>'+stars+visaNote+'</div>'+smart+'</div>';
  }

  function renderHero(c){
    if(!c.heroImage) return;
    if(document.querySelector('.pc-hero')) return;
    var placeHero = document.querySelector('.place-hero');
    if(!placeHero) return;
    var wrap = document.createElement('div');
    wrap.className = 'pc-hero';
    wrap.innerHTML = '<div class="pc-hero-inner"><img src="'+esc(c.heroImage)+'" alt="" loading="lazy"></div>';
    placeHero.parentNode.insertBefore(wrap, placeHero);
  }

  function render(c){
    renderHero(c);
    var acts=(c.activities||[]).filter(function(a){ return (a.title||'').trim(); });
    if(!acts.length) return;

    var section = document.querySelector('.section');
    if(!section) return;
    var host = document.createElement('div');
    section.parentNode.replaceChild(host, section);

    var html='';
    html += snapshotHtml(c.snapshot);
    if(c.uniqueness) html += '<div class="pc-unique"><p>'+esc(c.uniqueness)+'</p></div>';
    if(Array.isArray(c.seasons) && c.seasons.length){
      html += '<div class="pc-when"><h2>When to go</h2><div class="pc-when-grid">'+
        c.seasons.map(function(s){
          return '<div class="pc-season"><b>'+esc(s.label||'')+'</b><span>'+esc(s.months||'')+'</span><p>'+esc(s.note||'')+'</p></div>';
        }).join('')+'</div></div>';
    }

    var groups={};
    acts.forEach(function(a){ var k=a.theme||'More to see'; (groups[k]=groups[k]||[]).push(a); });
    var keys=Object.keys(groups).sort(function(a,b){
      var ia=ORDER.indexOf(a), ib=ORDER.indexOf(b);
      return (ia<0?99:ia)-(ib<0?99:ib);
    });

    html += '<div class="pc-filter" id="pcFilter">'+['All'].concat(keys).map(function(k){
      return '<button class="pc-chip'+(k==='All'?' on':'')+'" data-k="'+esc(k)+'">'+esc(k)+'</button>';
    }).join('')+'<span class="pc-count">'+acts.length+' things to do</span></div>';

    keys.forEach(function(k,gi){
      html += '<section class="pc-group'+(gi>1?' closed':'')+'" data-theme="'+esc(k)+'">'+
        '<div class="pc-group-head"><span class="pc-caret">▾</span><h3>'+esc(k)+'</h3>'+
        '<em>'+groups[k].length+'</em></div><div class="pc-items">'+
        groups[k].map(function(a){
          var col=CATCOLOR[(a.category||'').toLowerCase()]||'#c9a876';
          var meta=[];
          if(a.category) meta.push('<span>'+esc(a.category)+'</span>');
          if(a.duration) meta.push('<span>'+esc(a.duration)+'</span>');
          if(a.when) meta.push('<span class="pc-when-tag">'+esc(a.when)+'</span>');
          var img=(a.image||'').trim();
          var leadHtml = img
            ? '<img class="pc-thumb" src="'+esc(img)+'" alt="" loading="lazy">'
            : '<span class="pc-dot" style="background:'+col+'"></span>';
          return '<article class="pc-card'+(img?' has-thumb':'')+'" data-title="'+esc(a.title)+'" data-dur="'+esc(a.duration||'')+'">'+
            leadHtml+
            '<div class="pc-body"><h4>'+esc(a.title)+'</h4><p>'+esc(a.description||'')+'</p>'+
            (meta.length?'<div class="pc-meta">'+meta.join('')+'</div>':'')+'</div>'+
            '<button class="pc-add" type="button" aria-label="Add to itinerary">+</button></article>';
        }).join('')+'</div></section>';
    });

    if(Array.isArray(c.faq) && c.faq.length){
      html += '<div class="pc-faq"><h2>Common questions</h2>'+
        c.faq.map(function(f,i){
          return '<div class="pc-faq-item" data-i="'+i+'"><div class="pc-faq-q"><span class="pc-caret">▾</span>'+esc(f.q||'')+'</div>'+
            '<div class="pc-faq-a"><p>'+esc(f.a||'')+'</p></div></div>';
        }).join('')+'</div>';
    }

    host.outerHTML = html;

    if(Array.isArray(c.faq) && c.faq.length && !document.getElementById('pcFaqLd')){
      var ld={"@context":"https://schema.org","@type":"FAQPage","mainEntity":c.faq.map(function(f){
        return {"@type":"Question","name":f.q||'',"acceptedAnswer":{"@type":"Answer","text":f.a||''}};
      })};
      var ldEl=document.createElement('script'); ldEl.type='application/ld+json'; ldEl.id='pcFaqLd';
      ldEl.textContent=JSON.stringify(ld); document.head.appendChild(ldEl);
    }

    wireInteractivity();
  }

  fetch('../content/places.json',{cache:'no-cache'})
    .then(function(r){ return r.ok?r.json():null; })
    .then(function(data){
      if(!data) return;
      var match=(data.countries||[]).find(function(c){ return norm(c.name)===norm(PLACE); });
      if(match) render(match);
    })
    .catch(function(){});
})();
