/* Swaps the nav "Sign in" button for the user's avatar on every page. */
import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
const cfg={apiKey:"AIzaSyBOYqcVkDwLy1NysEbfTQBcMVfgqdylKHE",authDomain:"diskover-us.firebaseapp.com",projectId:"diskover-us",storageBucket:"diskover-us.firebasestorage.app",messagingSenderId:"377421689821",appId:"1:377421689821:web:1c3e505011674682753c34"};
const app=getApps().length?getApp():initializeApp(cfg);
const PERSON='<svg viewBox="0 0 24 24" fill="currentColor" style="width:16px;height:16px;display:block"><path d="M12 12a4.8 4.8 0 1 0 0-9.6 4.8 4.8 0 0 0 0 9.6zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/></svg>';
/* Same outline glyph the homepage's guest avatar button uses, so a signed-out
   visitor sees one consistent "account" icon everywhere instead of a plain-
   text "Sign in" pill on subpages and an icon button on the homepage. */
const GUEST='<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" style="width:17px;height:17px"><circle cx="10" cy="7.2" r="3.3"/><path d="M3.3 17c1.2-3.6 4-5.2 6.7-5.2s5.5 1.6 6.7 5.2"/></svg>';
onAuthStateChanged(getAuth(app), user=>{
  document.querySelectorAll('[data-authnav]').forEach(el=>{
    if(!el.dataset.signin) el.dataset.signin = el.getAttribute('href');
    if(!user){
      el.href = el.dataset.signin;
      el.title = 'Sign in';
      el.setAttribute('aria-label','Sign in or join');
      el.innerHTML = GUEST;
      return;
    }
    el.href = el.dataset.account || 'account.html';
    el.title='My account';
    el.setAttribute('aria-label','My account');
    el.innerHTML = user.photoURL
      ? '<img src="'+user.photoURL+'" alt="">'
      : PERSON;
  });
});

try{
  if(!localStorage.getItem('du_cookie_ok')){
    const pre = location.pathname.includes('/places/') ? '../' : '';
    const cb=document.createElement('div');
    cb.style.cssText='position:fixed;left:16px;right:16px;bottom:16px;z-index:80;background:rgba(20,20,20,0.94);border:1px solid rgba(237,225,204,0.18);border-radius:14px;padding:14px 16px;display:flex;gap:14px;align-items:center;flex-wrap:wrap;font-size:12.5px;color:rgba(237,225,204,0.75);max-width:560px;margin:0 auto;box-shadow:0 12px 30px rgba(0,0,0,.5);font-family:Inter,sans-serif;';
    cb.innerHTML='<span style="flex:1;min-width:200px;line-height:1.5">We use essential cookies & local storage to keep you signed in and save your itinerary. <a href="'+pre+'privacy.html" style="color:#c9a876">Privacy Policy</a></span><button style="background:#c9a876;color:#141414;border:none;border-radius:999px;padding:8px 18px;font-weight:600;font-size:12px;cursor:pointer">OK</button>';
    document.body.appendChild(cb);
    cb.querySelector('button').addEventListener('click',()=>{ localStorage.setItem('du_cookie_ok','1'); cb.remove(); });
  }
}catch(e){}
