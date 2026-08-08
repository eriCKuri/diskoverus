"""
Bakes full country content (snapshot facts, "what makes it different", when-to-go
seasons, ALL activities grouped by theme, and FAQ) directly into each static
places/*.html file, instead of leaving it to load in afterward via a client-side
fetch of content/places.json (assets/place-content.js).

Why: Googlebot renders JS in a delayed second wave. The first-pass HTML it sees
for indexing was previously just a title + 4 hardcoded activities — thin next to
a big footer link list. Baking the full content in at build time means the raw
HTML Google (and anyone with JS off) sees is already complete.

This mirrors, field for field, the same HTML that assets/place-content.js builds
client-side (same class names: pc-snap, pc-unique, pc-when, pc-filter, pc-group,
pc-card, pc-faq) so styling (now shared in assets/theme.css) and behavior stay
identical. place-content.js has been rewritten to detect this baked markup and
only wire up interactivity (filter chips, collapsible groups, FAQ accordion,
itinerary add buttons) instead of re-rendering — see that file's comment block.

Safe to re-run any time content/places.json changes (e.g. after a CMS edit):
it always rebuilds the content block fresh from current JSON data.
"""
import glob, re, json

CAT_COLOR = {'adventure': '#c9a876', 'culture': '#6e84a3', 'nature': '#4f938f', 'food': '#b5563a'}
ORDER = ['Wildlife & nature', 'Culture & history', 'Food & markets', 'Adventure & outdoors',
         'Coast & water', 'Cities & design', 'Slow days']


def esc(s):
    return (s or '').replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;').replace('"', '&quot;').replace("'", '&#x27;')


def norm(s):
    s = (s or '').lower()
    s = re.sub(r'[^a-z0-9]+', ' ', s)
    return s.strip()


def star_row(n):
    n = n or 0
    return '<span class="pc-stars">' + ''.join(
        '<span class="%s">★</span>' % ('on' if i <= n else 'off') for i in range(1, 6)
    ) + '</span>'


def fmt_lodging(r):
    if not r or not isinstance(r.get('low'), (int, float)) or not isinstance(r.get('high'), (int, float)):
        return ''
    return '$%s–$%s/night' % (r['low'], r['high'])


def snapshot_html(snap):
    if not snap:
        return ''
    practical = snap.get('practical') or {}
    driving = practical.get('driving') or ''
    items = [
        ('Budget', snap.get('budget')),
        ('Best for', snap.get('tripLength')),
        ('Visa', snap.get('visa')),
        ('Currency', snap.get('currency')),
        ('Languages', snap.get('languages')),
        ('Internet', snap.get('internet')),
        ('Typical lodging', fmt_lodging(snap.get('lodging'))),
        ('Driving side', (driving[0].upper() + driving[1:]) if driving else ''),
        ('Power & voltage', practical.get('voltage')),
        ('Time zone', practical.get('timezone')),
        ('Emergency number', practical.get('emergency')),
    ]
    items = [(k, v) for k, v in items if str(v or '').strip()]
    ratings = snap.get('ratings') or []
    if not items and not ratings:
        return ''
    grid = ''.join('<div class="pc-snap-item"><span>%s</span><b>%s</b></div>' % (esc(k), esc(str(v))) for k, v in items)
    stars = ''
    if ratings:
        stars = '<div class="pc-snap-stars">' + ''.join(
            '<span class="pc-snap-stat">%s %s</span>' % (star_row(r.get('stars', 0)), esc(r.get('category', '')))
            for r in ratings
        ) + '</div>'
    visa_note = ''
    if snap.get('visa') or practical.get('emergency'):
        visa_note = ('<p class="pc-snap-caveat">Visa rules and emergency numbers can change without notice '
                      '— confirm the specifics for your nationality and dates before you travel.</p>')
    smart = ''
    ts = (snap.get('travelSmart') or '').strip()
    if ts:
        smart = '<div class="pc-smart"><span class="pc-smart-label">Travel smart</span><p>%s</p></div>' % esc(ts)
    return '<div class="pc-snap"><div class="pc-snap-card"><div class="pc-snap-grid">%s</div>%s%s</div>%s</div>' % (
        grid, stars, visa_note, smart)


def unique_html(u):
    if not (u or '').strip():
        return ''
    return '<div class="pc-unique"><p>%s</p></div>' % esc(u)


def seasons_html(seasons):
    if not seasons:
        return ''
    cards = ''.join(
        '<div class="pc-season"><b>%s</b><span>%s</span><p>%s</p></div>' % (
            esc(s.get('label', '')), esc(s.get('months', '')), esc(s.get('note', ''))
        ) for s in seasons
    )
    return '<div class="pc-when"><h2>When to go</h2><div class="pc-when-grid">%s</div></div>' % cards


def activities_html(acts):
    acts = [a for a in acts if (a.get('title') or '').strip()]
    if not acts:
        return ''
    groups = {}
    for a in acts:
        k = a.get('theme') or 'More to see'
        groups.setdefault(k, []).append(a)
    keys = sorted(groups.keys(), key=lambda k: (ORDER.index(k) if k in ORDER else 99))

    chips = ''.join(
        '<button class="pc-chip%s" data-k="%s">%s</button>' % (' on' if k == 'All' else '', esc(k), esc(k))
        for k in (['All'] + keys)
    )
    chips_html = '<div class="pc-filter" id="pcFilter">%s<span class="pc-count">%d things to do</span></div>' % (
        chips, len(acts))

    groups_html = ''
    for gi, k in enumerate(keys):
        closed = ' closed' if gi > 1 else ''
        items_html = ''
        for a in groups[k]:
            col = CAT_COLOR.get((a.get('category') or '').lower(), '#c9a876')
            meta = []
            if a.get('category'):
                meta.append('<span>%s</span>' % esc(a['category']))
            if a.get('duration'):
                meta.append('<span>%s</span>' % esc(a['duration']))
            if a.get('when'):
                meta.append('<span class="pc-when-tag">%s</span>' % esc(a['when']))
            meta_html = '<div class="pc-meta">%s</div>' % ''.join(meta) if meta else ''
            img = (a.get('image') or '').strip()
            lead = ('<img class="pc-thumb" src="%s" alt="" loading="lazy">' % esc(img)) if img \
                else '<span class="pc-dot" style="background:%s"></span>' % col
            items_html += (
                '<article class="pc-card%s" data-title="%s" data-dur="%s">%s'
                '<div class="pc-body"><h4>%s</h4><p>%s</p>%s</div>'
                '<button class="pc-add" type="button" aria-label="Add to itinerary">+</button></article>'
            ) % (' has-thumb' if img else '', esc(a['title']), esc(a.get('duration') or ''), lead,
                 esc(a['title']), esc(a.get('description') or ''), meta_html)
        groups_html += (
            '<section class="pc-group%s" data-theme="%s">'
            '<div class="pc-group-head"><span class="pc-caret">▾</span><h3>%s</h3><em>%d</em></div>'
            '<div class="pc-items">%s</div></section>'
        ) % (closed, esc(k), esc(k), len(groups[k]), items_html)

    return chips_html + groups_html


def faq_html(faq):
    if not faq:
        return ''
    items = ''.join(
        '<div class="pc-faq-item" data-i="%d"><div class="pc-faq-q"><span class="pc-caret">▾</span>%s</div>'
        '<div class="pc-faq-a"><p>%s</p></div></div>' % (i, esc(f.get('q', '')), esc(f.get('a', '')))
        for i, f in enumerate(faq)
    )
    return '<div class="pc-faq"><h2>Common questions</h2>%s</div>' % items


def faq_ld_script(faq):
    if not faq:
        return ''
    ld = {
        "@context": "https://schema.org", "@type": "FAQPage",
        "mainEntity": [
            {"@type": "Question", "name": f.get('q', ''),
             "acceptedAnswer": {"@type": "Answer", "text": f.get('a', '')}}
            for f in faq
        ]
    }
    return '<script type="application/ld+json" id="pcFaqLd">%s</script>' % json.dumps(ld, ensure_ascii=False)


def hero_html(img):
    if not (img or '').strip():
        return ''
    return '<div class="pc-hero"><div class="pc-hero-inner"><img src="%s" alt="" loading="lazy"></div></div>' % esc(img)


def build(c):
    """Full replacement for the old thin <section class="section"> block."""
    parts = [
        snapshot_html(c.get('snapshot')),
        unique_html(c.get('uniqueness')),
        seasons_html(c.get('seasons')),
        activities_html(c.get('activities') or []),
        faq_html(c.get('faq')),
    ]
    return ''.join(p for p in parts if p)


def main():
    data = json.load(open('content/places.json', encoding='utf-8'))
    by_norm = {norm(c['name']): c for c in data['countries']}

    files = sorted(glob.glob('places/*.html'))
    written, skipped = [], []

    for fp in files:
        s = open(fp, encoding='utf-8').read()
        m = re.search(r'<body[^>]*data-place="([^"]*)"', s)
        if not m:
            skipped.append((fp, 'no data-place attr'))
            continue
        place = m.group(1)
        c = by_norm.get(norm(place))
        if not c:
            skipped.append((fp, 'no JSON match for "%s"' % place))
            continue

        section_m = re.search(r'<section class="section">.*?</section>', s, re.S)
        if not section_m:
            skipped.append((fp, 'no .section block found'))
            continue

        new_block = build(c)
        if not new_block:
            skipped.append((fp, 'no content to bake (empty)'))
            continue

        out = s[:section_m.start()] + new_block + s[section_m.end():]

        hero = hero_html(c.get('heroImage'))
        if hero and '<section class="place-hero">' in out and 'class="pc-hero"' not in out:
            out = out.replace('<section class="place-hero">', hero + '<section class="place-hero">', 1)

        ld_script = faq_ld_script(c.get('faq'))
        if ld_script:
            ldm = re.search(r'<script type="application/ld\+json">.*?</script>', out, re.S)
            if ldm:
                out = out[:ldm.end()] + ld_script + out[ldm.end():]

        if out != s:
            open(fp, 'w', encoding='utf-8').write(out)
            written.append(fp)

    print('Written: %d' % len(written))
    print('Skipped: %d' % len(skipped))
    for s in skipped:
        print('  -', s)


if __name__ == '__main__':
    main()
