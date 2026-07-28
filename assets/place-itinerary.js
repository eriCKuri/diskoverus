/* Adds "+ / ✓" itinerary buttons to activities on a place guide page.
   Shares the same storage as the map page, and syncs to the signed-in
   user's Firestore itinerary so both stay in step. */
import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const cfg={apiKey:"AIzaSyBOYqcVkDwLy1NysEbfTQBcMVfgqdylKHE",authDomain:"diskover-us.firebaseapp.com",projectId:"diskover-us",storageBucket:"diskover-us.firebasestorage.app",messagingSenderId:"377421689821",appId:"1:377421689821:web:1c3e505011674682753c34"};
const app = getApps().length ? getApp() : initializeApp(cfg);
const auth = getAuth(app), db = getFirestore(app);

const KEY = 'diskoverus_itinerary_v1';
const placeName = document.body.dataset.place || '';
const countryId = (placeName||'').toLowerCase().replace(/[^a-z ]/g,'').trim();
let itin = [];
let user = null;

function load(){
  try{ itin = JSON.parse(localStorage.getItem(KEY) || '[]') || []; }catch(e){ itin = []; }
}
async function save(){
  try{ localStorage.setItem(KEY, JSON.stringify(itin)); }catch(e){}
  if(user){ try{ await setDoc(doc(db,'itineraries',user.uid), {itinerary:itin, updated:Date.now()}, {merge:true}); }catch(e){} }
}
const has = title => itin.some(it => it.countryId===countryId && it.title===title);

function style(){
  if(document.getElementById('placeItinCss')) return;
  const s=document.createElement('style'); s.id='placeItinCss';
  s.textContent = `
  .act{position:relative;}
  .act-add{
    flex-shrink:0; width:34px; height:34px; border-radius:50%; cursor:pointer;
    background:transparent; border:1px solid rgba(201,168,118,.5); color:var(--gold-light);
    font-size:17px; line-height:1; display:flex; align-items:center; justify-content:center;
    transition:all .18s ease; align-self:flex-start;
  }
  .act-add:hover{border-color:var(--brass); background:rgba(201,168,118,.12);}
  .act-add.added{background:var(--brass); border-color:var(--brass); color:#141414;}
  html[data-theme="light"] .act-add{border-color:rgba(138,101,41,.5); color:#8a6529;}
  html[data-theme="light"] .act-add.added{background:#8a6529; border-color:#8a6529; color:#fff;}
  .itin-fab{
    position:fixed; bottom:26px; right:26px; z-index:30; text-decoration:none;
    background:var(--brass); color:#141414; border-radius:30px; padding:13px 22px;
    font-family:'Inter',sans-serif; font-weight:600; font-size:13.5px;
    display:inline-flex; align-items:center; gap:9px; box-shadow:0 10px 30px rgba(0,0,0,.35);
  }
  html[data-theme="light"] .itin-fab{color:#fff;}
  .itin-fab span{background:rgba(0,0,0,.22); border-radius:999px; padding:2px 9px; font-size:12px;}
  .itin-toast{
    position:fixed; left:50%; bottom:92px; transform:translateX(-50%) translateY(8px);
    background:var(--ink-2); color:var(--paper); border:1px solid var(--line);
    border-radius:999px; padding:10px 20px; font-size:13px; z-index:40;
    opacity:0; pointer-events:none; transition:opacity .25s, transform .25s;
    box-shadow:0 10px 30px rgba(0,0,0,.4);
  }
  .itin-toast.show{opacity:1; transform:translateX(-50%) translateY(0);}
  @media(max-width:640px){ .itin-fab{bottom:18px; right:18px; padding:11px 18px;} }`;
  document.head.appendChild(s);
}

let fab, toast, toastT;
function ensureChrome(){
  if(!fab){
    fab=document.createElement('a');
    fab.className='itin-fab'; fab.href='account.html';
    document.body.appendChild(fab);
  }
  if(!toast){
    toast=document.createElement('div'); toast.className='itin-toast';
    document.body.appendChild(toast);
  }
  const n=itin.length;
  fab.style.display = n ? 'inline-flex' : 'none';
  fab.innerHTML = 'Your itinerary <span>'+n+'</span>';
  fab.href = '../account.html';
}
function say(msg){
  ensureChrome();
  toast.textContent=msg; toast.classList.add('show');
  clearTimeout(toastT); toastT=setTimeout(()=>toast.classList.remove('show'), 2200);
}

function paint(){
  if(window.__pcPaint){ try{ window.__pcPaint(); }catch(e){} }
  document.querySelectorAll('.act').forEach(el=>{
    const title = el.dataset.title || '';
    const btn = el.querySelector('.act-add');
    if(!btn) return;
    const on = has(title);
    btn.classList.toggle('added', on);
    btn.textContent = on ? '✓' : '+';
    btn.title = on ? 'Remove from your itinerary' : 'Add to your itinerary';
    btn.setAttribute('aria-label', btn.title);
  });
  ensureChrome();
}

function build(){
  style(); load();
  if(document.querySelector('.pc-card')) return;   // richer renderer owns this page
  document.querySelectorAll('.act').forEach(el=>{
    if(el.querySelector('.act-add')) return;
    const title = el.dataset.title || '';
    const dur = el.dataset.dur || '';
    const btn = document.createElement('button');
    btn.className='act-add'; btn.type='button'; btn.textContent='+';
    btn.addEventListener('click', async ()=>{
      const i = itin.findIndex(it=>it.countryId===countryId && it.title===title);
      if(i>-1){ itin.splice(i,1); say('Removed from your itinerary'); }
      else{ itin.push({countryId, countryName:placeName, title, dur}); say('Added to your itinerary'); }
      await save(); paint();
    });
    el.appendChild(btn);
  });
  paint();
}

onAuthStateChanged(auth, async u=>{
  user = u || null;
  if(user){
    try{
      const snap = await getDoc(doc(db,'itineraries',user.uid));
      if(snap.exists() && Array.isArray(snap.data().itinerary)){
        itin = snap.data().itinerary;
        try{ localStorage.setItem(KEY, JSON.stringify(itin)); }catch(e){}
      }
    }catch(e){}
  }
  paint();
});

if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', build);
else build();
