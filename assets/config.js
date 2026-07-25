/* ── Diskover Us site config ─────────────────────────────────────────────
   Photo uploads for traveler reviews use Cloudinary (free tier).
   To enable them, fill in BOTH values below with your Cloudinary details,
   then re-deploy. Until then, reviews still work — just without photos.

   How to get these (2 min):
   1. Make a free account at cloudinary.com
   2. Your "Cloud name" is shown on the dashboard → paste it below.
   3. Settings → Upload → Add upload preset → set "Signing Mode" to
      "Unsigned" → save → copy the preset name below.
──────────────────────────────────────────────────────────────────────── */
window.SITE_CONFIG = {
  cloudinaryCloud:  "",   // e.g. "diskoverus"
  cloudinaryPreset: "",   // e.g. "traveler_photos"

  /* Google Sheet feeds — THE way to edit site content with no redeploys.
     One spreadsheet, two tabs:
       "Content" tab → countries & activities (import content.csv to start)
       "Blog" tab    → blog posts            (import blog.csv to start)
     Publish the sheet (Share → Anyone with link → Viewer), then paste the
     two URLs below. Format: https://opensheet.elk.sh/<sheet-id>/<TabName>
     After this one-time setup: edit the sheet → refresh the site. Done. */
  sheetUrl: "",           // e.g. "https://opensheet.elk.sh/1AbC.../Content"
  blogUrl:  ""            // e.g. "https://opensheet.elk.sh/1AbC.../Blog"
};
