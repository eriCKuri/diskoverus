/* Keeps a place guide page in step with content/places.json.
   Renders the same "what makes it different" note, When-to-go block and
   theme-grouped activities as the map panel — with filter chips and
   collapsible sections so a 20-item list stays scannable. */
(function(){
  var PLACE = document.body.dataset.place || '';
  if(!PLACE) return;
  var norm = function(s){ return (s||'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim(); };
  var esc  = function(s){ return (s||'').replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];}); };
  var CATCOLOR = {culture:'#6e84a3', nature:'#4f938f', food:'#b5563a', adventure:'#c9a876'};
  var ORDER = ['Wildlife & nature','Culture & history','Food & markets','Adventure & outdoors','Coast & water','Cities & design','Slow days'];

  function style(){
    if(document.getElementById('placeContentCss')) return;
    var s=document.createElement('style'); s.id='placeContentCss';
    s.textContent = [
      '.pc-snap{max-width:1100px;margin:26px auto 0;padding:0 clamp(20px,4vw,48px);}',
      '.pc-snap-card{border:1px solid var(--line);border-radius:18px;padding:22px 24px;background:rgba(237,225,204,.03);}',
      'html[data-theme="light"] .pc-snap-card{background:#fff;border-color:rgba(20,20,20,.1);}',
      '.pc-snap-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:16px 20px;}',
      '.pc-snap-item span{display:block;font-family:"IBM Plex Mono",monospace;font-size:9.5px;letter-spacing:.08em;text-transform:uppercase;color:var(--brass);margin-bottom:4px;}',
      '.pc-snap-item b{font-size:14px;font-weight:500;line-height:1.4;display:block;}',
      '.pc-snap-stars{display:flex;flex-wrap:wrap;gap:16px 22px;margin-top:18px;padding-top:18px;border-top:1px solid var(--line);}',
      '.pc-snap-stat{display:flex;align-items:center;gap:8px;font-size:12.5px;color:var(--paper-dim);}',
      '.pc-snap-stat .pc-stars{display:inline-flex;gap:1px;}',
      '.pc-stars .on{color:var(--brass);} .pc-stars .off{color:rgba(237,225,204,.22);}',
      'html[data-theme="light"] .pc-stars .off{color:rgba(20,20,20,.18);}',
      '@media(max-width:640px){.pc-snap-card{padding:18px 18px;}}',
      '.pc-unique{max-width:1100px;margin:26px auto 0;padding:0 clamp(20px,4vw,48px);}',
      '.pc-unique p{border-left:2px solid var(--brass);padding-left:16px;margin:0;font-size:15.5px;line-height:1.75;color:var(--paper-dim);max-width:74ch;}',
      '.pc-when{max-width:1100px;margin:34px auto 0;padding:0 clamp(20px,4vw,48px);}',
      '.pc-when h2{font-family:Fraunces,serif;font-weight:500;font-size:22px;margin:0 0 14px;}',
      '.pc-when-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px;}',
      '.pc-season{border:1px solid var(--line);border-radius:14px;padding:15px 17px;background:rgba(237,225,204,.03);}',
      'html[data-theme="light"] .pc-season{background:#fff;border-color:rgba(20,20,20,.1);}',
      '.pc-season b{display:block;font-family:Fraunces,serif;font-weight:500;font-size:16px;margin-bottom:2px;}',
      '.pc-season span{display:block;font-family:"IBM Plex Mono",monospace;font-size:10.5px;letter-spacing:.07em;text-transform:uppercase;color:var(--brass);margin-bottom:7px;}',
      '.pc-season p{margin:0;font-size:13px;line-height:1.6;color:var(--text-dim);}',
      '.pc-filter{max-width:1100px;margin:34px auto 0;padding:0 clamp(20px,4vw,48px);display:flex;flex-wrap:wrap;gap:8px;align-items:center;}',
      '.pc-chip{font-family:"IBM Plex Mono",monospace;font-size:10.5px;letter-spacing:.06em;text-transform:uppercase;',
      'padding:7px 13px;border-radius:999px;border:1px solid rgba(237,225,204,.2);background:transparent;color:var(--text-dim);cursor:pointer;transition:all .18s;}',
      '.pc-chip:hover{color:var(--brass);border-color:var(--brass);}',
      '.pc-chip.on{background:var(--brass);color:#141414;border-color:var(--brass);}',
      'html[data-theme="light"] .pc-chip{border-color:rgba(20,20,20,.18);}',
      'html[data-theme="light"] .pc-chip.on{color:#fff;}',
      '.pc-count{font-family:"IBM Plex Mono",monospace;font-size:10.5px;color:var(--text-dim);margin-left:auto;}',
      '.pc-group{max-width:1100px;margin:26px auto 0;padding:0 clamp(20px,4vw,48px);}',
      '.pc-group-head{display:flex;align-items:center;gap:12px;cursor:pointer;padding:10px 0;border-bottom:1px solid var(--line);}',
      '.pc-group-head h3{font-family:Fraunces,serif;font-weight:500;font-size:20px;margin:0;flex:1;}',
      '.pc-group-head em{font-family:"IBM Plex Mono",monospace;font-style:normal;font-size:10.5px;color:var(--text-dim);}',
      '.pc-caret{width:22px;height:22px;flex-shrink:0;display:flex;align-items:center;justify-content:center;color:var(--brass);transition:transform .22s;font-size:11px;}',
      '.pc-group.closed .pc-caret{transform:rotate(-90deg);}',
      '.pc-items{display:flex;flex-direction:column;gap:12px;margin-top:14px;}',
      '.pc-group.closed .pc-items{display:none;}',
      '.pc-card{display:flex;gap:16px;align-items:flex-start;border:1px solid var(--line);border-radius:16px;padding:18px 20px;background:rgba(237,225,204,.02);transition:border-color .18s;}',
      '.pc-card:hover{border-color:rgba(201,168,118,.45);}',
      'html[data-theme="light"] .pc-card{background:#fff;border-color:rgba(20,20,20,.1);}',
      '.pc-card.has-thumb{padding:14px;}',
      '.pc-thumb{width:96px;height:96px;border-radius:12px;object-fit:cover;flex-shrink:0;display:block;}',
      '.pc-dot{width:8px;height:8px;border-radius:50%;flex-shrink:0;margin-top:8px;}',
      '.pc-body{flex:1;min-width:0;}',
      '.pc-body h4{font-family:Fraunces,serif;font-weight:500;font-size:18px;margin:0 0 6px;line-height:1.25;}',
      '.pc-body p{margin:0;font-size:14.5px;line-height:1.7;color:var(--paper-dim);max-width:72ch;}',
      '.pc-meta{display:flex;flex-wrap:wrap;gap:8px;margin-top:9px;font-family:"IBM Plex Mono",monospace;font-size:10px;letter-spacing:.07em;text-transform:uppercase;color:var(--text-dim);}',
      '.pc-meta .pc-when-tag{color:var(--brass);}',
      '.pc-add{flex-shrink:0;width:34px;height:34px;border-radius:50%;cursor:pointer;background:transparent;',
      'border:1px solid rgba(201,168,118,.5);color:var(--gold-light);font-size:17px;line-height:1;display:flex;align-items:center;justify-content:center;transition:all .18s;}',
      '.pc-add:hover{border-color:var(--brass);background:rgba(201,168,118,.12);}',
      '.pc-add.added{background:var(--brass);border-color:var(--brass);color:#141414;}',
      'html[data-theme="light"] .pc-add{border-color:rgba(138,101,41,.5);color:#8a6529;}',
      'html[data-theme="light"] .pc-add.added{background:#8a6529;border-color:#8a6529;color:#fff;}',
      '@media(max-width:640px){.pc-card{padding:15px 16px;gap:12px;}.pc-card.has-thumb{padding:10px;}.pc-thumb{width:64px;height:64px;border-radius:10px;}.pc-body h4{font-size:16.5px;}}',
      '.pc-faq{max-width:1100px;margin:40px auto 0;padding:0 clamp(20px,4vw,48px);}',
      '.pc-faq h2{font-family:Fraunces,serif;font-weight:500;font-size:22px;margin:0 0 14px;}',
      '.pc-faq-item{border-bottom:1px solid var(--line);}',
      '.pc-faq-q{display:flex;align-items:center;gap:12px;cursor:pointer;padding:15px 0;font-family:Fraunces,serif;font-weight:500;font-size:15.5px;}',
      '.pc-faq-q .pc-caret{width:18px;height:18px;flex-shrink:0;display:flex;align-items:center;justify-content:center;color:var(--brass);transition:transform .2s;font-size:10px;transform:rotate(-90deg);}',
      '.pc-faq-item.open .pc-faq-q .pc-caret{transform:rotate(0deg);}',
      '.pc-faq-a{max-height:0;overflow:hidden;transition:max-height .25s ease;}',
      '.pc-faq-item.open .pc-faq-a{max-height:400px;}',
      '.pc-faq-a p{margin:0 0 16px;font-size:14px;line-height:1.7;color:var(--paper-dim);max-width:72ch;}',
      '.pc-hero{max-width:1100px;margin:0 auto;padding:0 clamp(20px,4vw,48px);}',
      '.pc-hero-inner{position:relative;height:320px;border-radius:22px;overflow:hidden;}',
      '.pc-hero-inner img{width:100%;height:100%;object-fit:cover;display:block;}',
      '.pc-hero-inner::after{content:"";position:absolute;inset:0;background:linear-gradient(to bottom, rgba(0,0,0,0) 55%, rgba(0,0,0,.55) 100%);}',
      '@media(max-width:640px){.pc-hero-inner{height:200px;border-radius:16px;}}'
    ].join('');
    document.head.appendChild(s);
  }

  function starRow(n){
    var h='';
    for(var i=1;i<=5;i++) h += '<span class="'+(i<=n?'on':'off')+'">★</span>';
    return '<span class="pc-stars">'+h+'</span>';
  }
  function snapshotHtml(snap){
    if(!snap) return '';
    var items=[
      ['Budget', snap.budget],
      ['Best for', snap.tripLength],
      ['Visa', snap.visa],
      ['Currency', snap.currency],
      ['Languages', snap.languages],
      ['Internet', snap.internet]
    ].filter(function(p){ return (p[1]||'').toString().trim(); });
    if(!items.length && !(Array.isArray(snap.ratings) && snap.ratings.length)) return '';
    var grid = items.map(function(p){
      return '<div class="pc-snap-item"><span>'+esc(p[0])+'</span><b>'+esc(p[1])+'</b></div>';
    }).join('');
    var stars = (Array.isArray(snap.ratings) && snap.ratings.length)
      ? '<div class="pc-snap-stars">'+snap.ratings.map(function(r){
          return '<span class="pc-snap-stat">'+starRow(r.stars||0)+' '+esc(r.category||'')+'</span>';
        }).join('')+'</div>' : '';
    return '<div class="pc-snap"><div class="pc-snap-card"><div class="pc-snap-grid">'+grid+'</div>'+stars+'</div></div>';
  }

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
    style();
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

    html += '<div class="pc-filter" id="pcFilter"></div>';
    keys.forEach(function(k,gi){
      html += '<section class="pc-group" data-theme="'+esc(k)+'">'+
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

    if(Array.isArray(c.faq) && c.faq.length){
      var old=document.getElementById('pcFaqLd'); if(old) old.remove();
      var ld={"@context":"https://schema.org","@type":"FAQPage","mainEntity":c.faq.map(function(f){
        return {"@type":"Question","name":f.q||'',"acceptedAnswer":{"@type":"Answer","text":f.a||''}};
      })};
      var ldEl=document.createElement('script'); ldEl.type='application/ld+json'; ldEl.id='pcFaqLd';
      ldEl.textContent=JSON.stringify(ld); document.head.appendChild(ldEl);
      document.querySelectorAll('.pc-faq-item').forEach(function(item){
        item.querySelector('.pc-faq-q').addEventListener('click', function(){ item.classList.toggle('open'); });
      });
    }

    // filter chips
    var fil=document.getElementById('pcFilter');
    var active='All';
    function paintChips(){
      fil.innerHTML = ['All'].concat(keys).map(function(k){
        return '<button class="pc-chip'+(k===active?' on':'')+'" data-k="'+esc(k)+'">'+esc(k)+'</button>';
      }).join('') + '<span class="pc-count">'+acts.length+' things to do</span>';
      fil.querySelectorAll('.pc-chip').forEach(function(b){
        b.addEventListener('click', function(){
          active=b.dataset.k; paintChips();
          document.querySelectorAll('.pc-group').forEach(function(g){
            g.style.display = (active==='All' || g.dataset.theme===active) ? '' : 'none';
            g.classList.remove('closed');
          });
        });
      });
    }
    paintChips();

    // collapsible groups — everything past the first two starts closed
    document.querySelectorAll('.pc-group').forEach(function(g,i){
      if(i>1) g.classList.add('closed');
      g.querySelector('.pc-group-head').addEventListener('click', function(){ g.classList.toggle('closed'); });
    });

    // itinerary buttons
    function paintAdds(){
      document.querySelectorAll('.pc-card').forEach(function(card){
        var t=card.dataset.title, b=card.querySelector('.pc-add');
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

  fetch('../content/places.json',{cache:'no-cache'})
    .then(function(r){ return r.ok?r.json():null; })
    .then(function(data){
      if(!data) return;
      var match=(data.countries||[]).find(function(c){ return norm(c.name)===norm(PLACE); });
      if(match) render(match);
    })
    .catch(function(){});
})();
