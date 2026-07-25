/* Shared traveler-reviews module for per-place guide pages. */
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, collection, addDoc, deleteDoc, doc, getDocs, query, where }
  from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBOYqcVkDwLy1NysEbfTQBcMVfgqdylKHE",
  authDomain: "diskover-us.firebaseapp.com",
  projectId: "diskover-us",
  storageBucket: "diskover-us.firebasestorage.app",
  messagingSenderId: "377421689821",
  appId: "1:377421689821:web:1c3e505011674682753c34"
};
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const slug = document.body.dataset.slug;
const placeName = document.body.dataset.place;
let currentUser = null;

function starsSvg(n){
  let h='';
  for(let i=1;i<=5;i++){
    h += `<svg class="${i<=n?'star-on':'star-off'}" data-v="${i}" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>`;
  }
  return `<span class="stars">${h}</span>`;
}
function esc(s){ return (s||'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }
function timeAgo(ms){
  const d=Math.floor((Date.now()-ms)/1000);
  if(d<60) return 'just now';
  if(d<3600) return Math.floor(d/60)+'m ago';
  if(d<86400) return Math.floor(d/3600)+'h ago';
  if(d<2592000) return Math.floor(d/86400)+'d ago';
  return new Date(ms).toLocaleDateString(undefined,{month:'short',year:'numeric'});
}
async function uploadPhoto(file){
  const cfg = window.SITE_CONFIG||{};
  if(!cfg.cloudinaryCloud || !cfg.cloudinaryPreset || !file) return '';
  const fd=new FormData(); fd.append('file',file); fd.append('upload_preset',cfg.cloudinaryPreset);
  const r=await fetch(`https://api.cloudinary.com/v1_1/${cfg.cloudinaryCloud}/image/upload`,{method:'POST',body:fd});
  if(!r.ok) throw new Error('upload failed');
  const j=await r.json(); return j.secure_url||'';
}
function injectAggregateRating(reviews){
  const old=document.getElementById('reviewLd'); if(old) old.remove();
  if(!reviews.length) return;
  const avg = reviews.reduce((s,r)=>s+(r.rating||0),0)/reviews.length;
  const ld={ "@context":"https://schema.org","@type":"TouristAttraction","name":placeName,
    "aggregateRating":{"@type":"AggregateRating","ratingValue":avg.toFixed(1),"reviewCount":reviews.length,"bestRating":5,"worstRating":1},
    "review": reviews.slice(0,5).map(r=>({"@type":"Review","author":{"@type":"Person","name":r.author||"Traveler"},
      "reviewRating":{"@type":"Rating","ratingValue":r.rating||0,"bestRating":5},"reviewBody":r.text||""})) };
  const s=document.createElement('script'); s.type='application/ld+json'; s.id='reviewLd';
  s.textContent=JSON.stringify(ld); document.head.appendChild(s);
}
async function fetchReviews(){
  const qs = await getDocs(query(collection(db,'reviews'), where('placeId','==',slug)));
  const out=[]; qs.forEach(d=>out.push({id:d.id,...d.data()}));
  out.sort((a,b)=>(b.created||0)-(a.created||0));
  return out;
}
async function render(){
  const box=document.getElementById('placeReviews'); if(!box) return;
  box.innerHTML=`<div class="rev-empty">Loading traveler experiences…</div>`;
  let reviews=[];
  try{ reviews=await fetchReviews(); }
  catch(e){ box.innerHTML=`<div class="rev-empty">Couldn't load reviews right now.</div>`; return; }
  injectAggregateRating(reviews);
  const avg=reviews.length?reviews.reduce((s,r)=>s+(r.rating||0),0)/reviews.length:0;
  const head=`<div class="reviews-head"><h2>Traveler experiences</h2>${reviews.length?`<span class="rev-avg">${starsSvg(Math.round(avg))} ${avg.toFixed(1)} · ${reviews.length}</span>`:''}</div>`;
  const list=reviews.length?`<div class="rev-list">${reviews.map(r=>`
    <div class="rev-card">
      <div class="rev-card-top"><span class="rev-author">${esc(r.author||'Traveler')}</span><span class="rev-date">${timeAgo(r.created||Date.now())}</span></div>
      ${starsSvg(r.rating||0)}
      ${r.text?`<p class="rev-text">${esc(r.text)}</p>`:''}
      ${r.photoUrl?`<img class="rev-photo" src="${esc(r.photoUrl)}" alt="Traveler photo from ${esc(placeName)}" loading="lazy">`:''}
      ${currentUser && r.uid===currentUser.uid?`<button class="rev-del" data-id="${r.id}">Delete</button>`:''}
    </div>`).join('')}</div>`:`<div class="rev-empty">No experiences shared yet.${currentUser?' Be the first.':''}</div>`;
  const cfg=window.SITE_CONFIG||{};
  const photoField=(cfg.cloudinaryCloud&&cfg.cloudinaryPreset)?`<label class="rev-file">Photo (optional) <input type="file" id="revPhoto" accept="image/*"></label>`:'';
  let add;
  if(currentUser){
    add=`<div class="rev-add">
      <button class="rev-add-btn" id="revAddBtn">Share your experience</button>
      <div class="rev-form" id="revForm">
        <div class="rate-pick" id="revRate">${starsSvg(0)}</div>
        <textarea id="revText" placeholder="What was it like? What would you tell a friend heading here?" maxlength="2000"></textarea>
        ${photoField}
        <p class="rev-err" id="revErr"></p>
        <button class="rev-submit" id="revSubmit">Post experience</button>
      </div></div>`;
  } else {
    add=`<div class="rev-add"><p class="rev-signin"><a href="../index.html#signin">Sign in</a> to share your experience.</p></div>`;
  }
  box.innerHTML=head+list+add;
  box.querySelectorAll('.rev-del').forEach(b=>b.addEventListener('click', async ()=>{
    try{ await deleteDoc(doc(db,'reviews',b.dataset.id)); render(); }catch(e){}
  }));
  if(!currentUser) return;
  let picked=0; const rate=document.getElementById('revRate');
  function paint(){ rate.innerHTML=starsSvg(picked); rate.querySelectorAll('svg').forEach(s=>s.addEventListener('click',()=>{picked=+s.dataset.v; paint();})); }
  paint();
  document.getElementById('revAddBtn').addEventListener('click',()=>document.getElementById('revForm').classList.toggle('show'));
  document.getElementById('revSubmit').addEventListener('click', async ()=>{
    const err=document.getElementById('revErr'); err.textContent='';
    const text=document.getElementById('revText').value.trim();
    if(!picked){ err.textContent='Please pick a star rating.'; return; }
    if(!text){ err.textContent='Please write a few words.'; return; }
    const btn=document.getElementById('revSubmit'); btn.disabled=true; btn.textContent='Posting…';
    try{
      let photoUrl=''; const pf=document.getElementById('revPhoto');
      if(pf && pf.files[0]) photoUrl=await uploadPhoto(pf.files[0]);
      await addDoc(collection(db,'reviews'),{ placeId:slug, placeName:placeName, uid:currentUser.uid,
        author: currentUser.displayName || (currentUser.email? currentUser.email.split('@')[0]:'Traveler'),
        rating:picked, text:text, photoUrl:photoUrl, created:Date.now() });
      render();
    }catch(e){ err.textContent='Could not post — check your connection and try again.'; btn.disabled=false; btn.textContent='Post experience'; }
  });
}
onAuthStateChanged(auth, u=>{ currentUser=u||null; render(); });
