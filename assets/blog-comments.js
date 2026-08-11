/* Per-post blog comments. Same Firestore pattern as assets/reviews.js
   (sign in required to post, delete-own-comment, no moderation UI beyond
   that), keyed on a stable postId derived the same way blog.html derives
   each post's #post-<slug> anchor id, so a comment thread survives a post
   being re-sorted or the page being re-rendered from a fresh JSON fetch. */
import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, collection, addDoc, deleteDoc, doc, getDocs, query, where }
  from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const cfg = {
  apiKey: "AIzaSyBOYqcVkDwLy1NysEbfTQBcMVfgqdylKHE",
  authDomain: "diskover-us.firebaseapp.com",
  projectId: "diskover-us",
  storageBucket: "diskover-us.firebasestorage.app",
  messagingSenderId: "377421689821",
  appId: "1:377421689821:web:1c3e505011674682753c34"
};
const app = getApps().length ? getApp() : initializeApp(cfg);
const auth = getAuth(app);
const db = getFirestore(app);

function esc(s){ return (s||'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }
function timeAgo(ms){
  const d=Math.floor((Date.now()-ms)/1000);
  if(d<60) return 'just now';
  if(d<3600) return Math.floor(d/60)+'m ago';
  if(d<86400) return Math.floor(d/3600)+'h ago';
  if(d<2592000) return Math.floor(d/86400)+'d ago';
  return new Date(ms).toLocaleDateString(undefined,{month:'short',year:'numeric'});
}
if(!document.getElementById('blogCommentsCss')){
  const st=document.createElement('style'); st.id='blogCommentsCss';
  st.textContent=`
    .post-comments{margin-top:36px;padding-top:28px;border-top:1px solid var(--line);}
    .post-comments h3{font-family:'IBM Plex Mono',monospace;font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:var(--brass);margin:0 0 16px;}
    .pc-list{display:flex;flex-direction:column;gap:12px;margin-bottom:16px;}
    .pc-item{border:1px solid var(--line);border-radius:12px;padding:13px 15px;}
    .pc-item-top{display:flex;align-items:center;justify-content:space-between;gap:10px;}
    .pc-author{font-weight:600;font-size:13px;color:var(--paper);}
    .pc-date{font-family:'IBM Plex Mono',monospace;font-size:10px;color:var(--text-dim);}
    .pc-text{font-size:14px;line-height:1.6;color:var(--paper-dim);margin:7px 0 0;white-space:pre-wrap;}
    .pc-del{background:none;border:none;color:var(--text-dim);font-size:11px;cursor:pointer;padding:0;margin-top:6px;}
    .pc-del:hover{color:var(--rust);}
    .pc-empty{font-size:13.5px;color:var(--text-dim);line-height:1.5;margin:0 0 16px;}
    .pc-form textarea{width:100%;background:rgba(0,0,0,0.3);border:1px solid rgba(237,225,204,0.16);border-radius:12px;padding:11px 13px;color:var(--paper);font-family:'Inter',sans-serif;font-size:14px;min-height:70px;resize:vertical;}
    .pc-form textarea:focus{outline:none;border-color:var(--brass);}
    .pc-form-row{display:flex;justify-content:space-between;align-items:center;gap:10px;margin-top:8px;}
    .pc-submit{background:var(--brass);color:#141414;border:none;border-radius:999px;padding:9px 18px;font-family:'Inter',sans-serif;font-weight:600;font-size:13px;cursor:pointer;}
    .pc-submit:disabled{opacity:.6;cursor:default;}
    .pc-err{color:var(--rust);font-size:12px;}
    .pc-signin{font-size:13.5px;color:var(--text-dim);line-height:1.5;}
    .pc-signin a{color:var(--brass);text-decoration:underline;}
  `;
  document.head.appendChild(st);
}

let currentUser = null;
let knownPosts = [];

async function fetchComments(postId){
  const qs = await getDocs(query(collection(db,'blogComments'), where('postId','==',postId)));
  const out=[]; qs.forEach(d=>out.push({id:d.id, ...d.data()}));
  out.sort((a,b)=>(a.created||0)-(b.created||0));
  return out;
}

async function renderThread(postId, postTitle, box){
  box.innerHTML = '<p class="pc-empty">Loading comments…</p>';
  let comments=[];
  try{ comments = await fetchComments(postId); }
  catch(e){ box.innerHTML = '<p class="pc-empty">Couldn\'t load comments right now.</p>'; return; }

  const list = comments.length
    ? '<div class="pc-list">'+comments.map(c=>`
        <div class="pc-item">
          <div class="pc-item-top"><span class="pc-author">${esc(c.author||'Traveler')}</span><span class="pc-date">${timeAgo(c.created||Date.now())}</span></div>
          <p class="pc-text">${esc(c.text||'')}</p>
          ${currentUser && c.uid===currentUser.uid ? `<button class="pc-del" data-id="${c.id}">Delete</button>` : ''}
        </div>`).join('')+'</div>'
    : '<p class="pc-empty">No comments yet.'+(currentUser?' Be the first.':'')+'</p>';

  const form = currentUser
    ? `<div class="pc-form">
        <textarea id="pcText-${postId}" maxlength="1000" placeholder="Add a comment…"></textarea>
        <div class="pc-form-row">
          <span class="pc-err" id="pcErr-${postId}"></span>
          <button type="button" class="pc-submit" id="pcSubmit-${postId}">Post comment</button>
        </div>
      </div>`
    : `<p class="pc-signin"><a href="index.html#signin">Sign in</a> to leave a comment.</p>`;

  box.innerHTML = `<h3>Comments${comments.length?' ('+comments.length+')':''}</h3>` + list + form;

  box.querySelectorAll('.pc-del').forEach(b=>b.addEventListener('click', async ()=>{
    try{ await deleteDoc(doc(db,'blogComments',b.dataset.id)); renderThread(postId, postTitle, box); }catch(e){}
  }));

  const submitBtn = document.getElementById('pcSubmit-'+postId);
  if(submitBtn){
    submitBtn.addEventListener('click', async ()=>{
      const ta = document.getElementById('pcText-'+postId);
      const err = document.getElementById('pcErr-'+postId);
      const text = ta.value.trim();
      err.textContent = '';
      if(!text){ err.textContent='Write something first.'; return; }
      submitBtn.disabled = true; submitBtn.textContent = 'Posting…';
      try{
        await addDoc(collection(db,'blogComments'), {
          postId, postTitle,
          uid: currentUser.uid,
          author: currentUser.displayName || (currentUser.email ? currentUser.email.split('@')[0] : 'Traveler'),
          text, created: Date.now()
        });
        renderThread(postId, postTitle, box);
      }catch(e){
        err.textContent = 'Could not post — check your connection and try again.';
        submitBtn.disabled = false; submitBtn.textContent = 'Post comment';
      }
    });
  }
}

function mountAll(){
  knownPosts.forEach(p=>{
    const article = document.getElementById(p.id);
    if(!article) return;
    const bodyEl = article.querySelector('.post-body');
    if(!bodyEl) return;
    let box = bodyEl.querySelector('.post-comments');
    if(!box){
      box = document.createElement('div');
      box.className = 'post-comments';
      bodyEl.appendChild(box);
    }
    renderThread(p.id, p.title, box);
  });
}

document.addEventListener('du:postsRendered', e=>{
  knownPosts = (e.detail && e.detail.posts) || [];
  if(knownPosts.length) mountAll();
});
onAuthStateChanged(auth, user=>{
  currentUser = user || null;
  if(knownPosts.length) mountAll();
});
