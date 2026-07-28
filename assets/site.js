/* Diskover Us — shared site chrome: theme toggle + site-wide search.
   Loaded on every page. No dependencies. */
(function(){
  var PRE = location.pathname.indexOf('/places/') > -1 ? '../' : '';

  /* ─────────── theme ─────────── */
  var SUN = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4.2"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M19.1 4.9l-1.4 1.4M6.3 17.7l-1.4 1.4"/></svg>';
  var MOON = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>';

  function currentTheme(){
    try{ return localStorage.getItem('du_theme') || 'dark'; }catch(e){ return 'dark'; }
  }
  function applyTheme(t){
    document.documentElement.setAttribute('data-theme', t === 'light' ? 'light' : 'dark');
    try{ localStorage.setItem('du_theme', t); }catch(e){}
    document.querySelectorAll('.theme-btn').forEach(function(b){
      b.innerHTML = t === 'light' ? MOON : SUN;
      b.setAttribute('aria-label', t === 'light' ? 'Switch to dark mode' : 'Switch to light mode');
      b.title = t === 'light' ? 'Dark mode' : 'Light mode';
    });
  }

  /* ─────────── search index ─────────── */
  var INDEX = null, loading = null;
  var THEME_SYN = {
    'Wildlife & nature': 'safari animals birds national park rainforest jungle volcanoes mountains reserve',
    'Culture & history': 'museum temple ruins heritage architecture art history local life',
    'Food & markets': 'coffee restaurants street food cooking wine market cuisine',
    'Adventure & outdoors': 'hiking trekking climbing rafting adventure sports extreme outdoors mountains',
    'Coast & water': 'beach beaches diving snorkeling swimming island sea coastline surf',
    'Cities & design': 'city urban architecture design nightlife shopping',
    'Slow days': 'relax relaxing chill spa slow honeymoon romantic luxury'
  };
  var PLACE_SLUGS = ["argentina","australia","chile","costa-rica","croatia","egypt","france","greece","iceland","india","indonesia","italy","japan","jordan","kenya","mexico","morocco","new-zealand","norway","peru","portugal","south-africa","spain","sri-lanka","switzerland","tanzania","thailand","vietnam"];
  function slugify(s){ return (s||'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,''); }
  function esc(s){ return (s||'').replace(/[&<>"]/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]; }); }
  function j(url){ return fetch(PRE+url, {cache:'no-cache'}).then(function(r){ return r.ok ? r.json() : null; }).catch(function(){ return null; }); }

  function countryHref(name){
    var s = slugify(name);
    return PLACE_SLUGS.indexOf(s) > -1 ? PRE+'places/'+s+'.html' : PRE+'index.html';
  }

  function buildIndex(){
    if(loading) return loading;
    loading = Promise.all([j('content/blog.json'), j('content/gallery.json'), j('content/videos.json'), j('content/places.json')])
      .then(function(res){
        var blog=res[0]||{}, gal=res[1]||{}, vid=res[2]||{}, pl=res[3]||{};
        var items=[], seen={};

        (blog.posts||[]).forEach(function(p){
          if(!(p.title||'').trim()) return;
          items.push({ g:'Journal', t:p.title, s:(p.excerpt||p.date||'Blog post'),
            u:PRE+'blog.html', img:(p.image||'').trim(),
            k:[p.title, p.excerpt, p.body, (p.countries||[]).join(' ')].join(' ') });
        });

        (gal.items||[]).forEach(function(g){
          if(!(g.image||'').trim()) return;
          var label = g.place || g.country || 'Photo';
          items.push({ g:'Photos', t:label, s:[g.country, g.location].filter(Boolean).join(' · '),
            u:PRE+'gallery.html', img:(g.image.charAt(0)==='/'? PRE.replace('../','/')+g.image.slice(1) : g.image),
            k:[g.place, g.country, g.location, g.caption].join(' ') });
        });

        (vid.items||[]).forEach(function(v){
          var m=(v.youtube||'').match(/(?:youtu\.be\/|v=|shorts\/|embed\/)([A-Za-z0-9_-]{6,})/);
          if(!m) return;
          items.push({ g:'Videos', t:(v.title||v.country||'Video'), s:v.country||'',
            u:PRE+'gallery.html', img:'https://i.ytimg.com/vi/'+m[1]+'/default.jpg',
            k:[v.title, v.country].join(' ') });
        });

        (pl.countries||[]).forEach(function(c){
          if(!(c.name||'').trim()) return;
          seen[slugify(c.name)] = 1;
          items.push({ g:'Destinations', t:c.name, s:c.region||c.blurb||'Destination',
            u:countryHref(c.name), icon:'◈', k:[c.name, c.region, c.blurb, c.uniqueness].join(' ') });
          (c.activities||[]).forEach(function(a){
            if(!(a.title||'').trim()) return;
            items.push({ g:'Things to do', t:a.title, s:c.name+(a.theme?' · '+a.theme:''), u:countryHref(c.name),
              img:(a.image||'').trim(), icon:'✦',
              k:[a.title, a.description, a.theme, a.category, THEME_SYN[a.theme]||'', c.name].join(' ') });
          });
        });

        PLACE_SLUGS.forEach(function(s){
          if(seen[s]) return;
          var name = s.split('-').map(function(w){ return w.charAt(0).toUpperCase()+w.slice(1); }).join(' ');
          items.push({ g:'Destinations', t:name, s:'Destination guide', u:PRE+'places/'+s+'.html', icon:'◈', k:name });
        });

        INDEX = items;
        return items;
      });
    return loading;
  }

  /* ─────────── search UI ─────────── */
  var scrim, panel, input, results, sel = -1, hits = [];

  function buildUI(){
    scrim = document.createElement('div'); scrim.className='ss-scrim';
    panel = document.createElement('div'); panel.className='ss-panel'; panel.setAttribute('role','dialog');
    panel.innerHTML =
      '<input class="ss-input" id="ssInput" type="search" autocomplete="off" placeholder="Search destinations, things to do, photos, videos, journal…">' +
      '<div class="ss-results" id="ssResults"></div>' +
      '<div class="ss-hint"><span>↑↓ to navigate</span><span>↵ to open</span><span>esc to close</span></div>';
    document.body.appendChild(scrim); document.body.appendChild(panel);
    input = panel.querySelector('#ssInput'); results = panel.querySelector('#ssResults');
    scrim.addEventListener('click', close);
    input.addEventListener('input', function(){ run(input.value); });
    input.addEventListener('keydown', function(e){
      if(e.key==='ArrowDown'){ e.preventDefault(); move(1); }
      else if(e.key==='ArrowUp'){ e.preventDefault(); move(-1); }
      else if(e.key==='Enter'){ var a=results.querySelectorAll('.ss-item')[sel]; if(a) location.href=a.getAttribute('href'); }
      else if(e.key==='Escape'){ close(); }
    });
  }
  function move(d){
    var els=results.querySelectorAll('.ss-item'); if(!els.length) return;
    sel=(sel+d+els.length)%els.length;
    els.forEach(function(e,i){ e.classList.toggle('sel', i===sel); });
    els[sel].scrollIntoView({block:'nearest'});
  }
  function open(){
    if(!panel) buildUI();
    buildIndex().then(function(){ if(input.value) run(input.value); });
    scrim.classList.add('show'); panel.classList.add('show');
    setTimeout(function(){ input.focus(); }, 60);
    run(input.value||'');
  }
  function close(){ if(!panel) return; scrim.classList.remove('show'); panel.classList.remove('show'); }

  function run(q){
    q=(q||'').trim().toLowerCase(); sel=-1;
    if(!INDEX){ results.innerHTML='<div class="ss-empty">Loading…</div>'; return; }
    if(!q){
      results.innerHTML='<div class="ss-empty">Type to search across destinations, things to do, photos, videos and journal entries.</div>';
      return;
    }
    hits = INDEX.filter(function(it){ return (it.k||'').toLowerCase().indexOf(q) > -1; }).slice(0, 60);
    if(!hits.length){ results.innerHTML='<div class="ss-empty">Nothing found for “'+esc(q)+'”.</div>'; return; }
    var order=['Destinations','Things to do','Journal','Photos','Videos'], html='';
    order.forEach(function(g){
      var group=hits.filter(function(h){ return h.g===g; });
      if(!group.length) return;
      html += '<div class="ss-group">'+g+'</div>';
      group.slice(0,12).forEach(function(h){
        var thumb = h.img ? '<img src="'+esc(h.img)+'" alt="" loading="lazy">'
                          : '<span class="ss-ico">'+(h.icon||'●')+'</span>';
        html += '<a class="ss-item" href="'+esc(h.u)+'">'+thumb+
                '<span class="ss-txt"><b>'+esc(h.t)+'</b><span>'+esc(h.s||'')+'</span></span></a>';
      });
    });
    results.innerHTML=html;
  }

  /* ─────────── inject buttons ─────────── */
  function inject(){
    applyTheme(currentTheme());
    document.querySelectorAll('.nav-right').forEach(function(nav){
      if(nav.querySelector('.theme-btn')) return;
      var sb=document.createElement('button');
      sb.className='search-btn'; sb.type='button'; sb.title='Search'; sb.setAttribute('aria-label','Search');
      sb.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>';
      sb.addEventListener('click', open);
      var tb=document.createElement('button');
      tb.className='theme-btn'; tb.type='button';
      tb.addEventListener('click', function(){ applyTheme(currentTheme()==='light'?'dark':'light'); });
      nav.insertBefore(tb, nav.firstChild);
      nav.insertBefore(sb, nav.firstChild);
    });
    applyTheme(currentTheme());
  }

  document.addEventListener('keydown', function(e){
    var tag=(document.activeElement&&document.activeElement.tagName)||'';
    if(tag==='INPUT'||tag==='TEXTAREA') return;
    if(e.key==='/' ){ e.preventDefault(); open(); }
  });

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', inject);
  else inject();
})();
