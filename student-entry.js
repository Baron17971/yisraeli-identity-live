(function(){
'use strict';
const PROD_ORIGIN='https://yisraeli-identity-live.vercel.app';
const params=new URLSearchParams(location.search);
const code=(params.get('code')||'').replace(/\D/g,'').slice(0,6);

// /student?code=XXXXXX is the public student link.
// Normalize it once to the app's native student state before app.js loads.
if(location.pathname==='/student' && code){
  location.replace(PROD_ORIGIN+'/?role=student&code='+encodeURIComponent(code));
  return;
}

function directStudentUrl(roomCode){
  return PROD_ORIGIN+'/student?code='+encodeURIComponent(roomCode);
}

function syncTeacherShare(){
  const shareCard=document.querySelector('.share-card');
  if(!shareCard) return;
  const codeNode=document.querySelector('.teacher-header .room-code');
  const roomCode=codeNode?(codeNode.textContent||'').replace(/\D/g,'').slice(0,6):'';
  if(!roomCode) return;

  const url=directStudentUrl(roomCode);
  const linkBox=shareCard.querySelector('.share-link');
  if(linkBox && linkBox.textContent!==url) linkBox.textContent=url;

  const qr=shareCard.querySelector('.qr img');
  const qrSrc='/api/qr?text='+encodeURIComponent(url);
  if(qr && qr.getAttribute('src')!==qrSrc) qr.setAttribute('src',qrSrc);

  const copy=document.getElementById('copyLink');
  if(copy && copy.dataset.directLink!==url){
    copy.dataset.directLink=url;
    copy.onclick=async function(){
      try{
        await navigator.clipboard.writeText(url);
        copy.textContent='הקישור הועתק ✓';
      }catch(e){}
    };
  }

  const manualCodeNote=shareCard.querySelector('.tiny');
  if(manualCodeNote) manualCodeNote.remove();
  const intro=shareCard.querySelector('p.muted');
  const introText='סריקת ה־QR או העתקת הקישור מכניסות את התלמידים ישירות לכיתה.';
  if(intro && intro.textContent!==introText) intro.textContent=introText;
}

function removeManualStudentEntry(){
  const manualStudentButton=document.getElementById('studentJoin');
  if(!manualStudentButton) return;
  const divider=manualStudentButton.previousElementSibling;
  if(divider&&divider.classList.contains('access-divider')) divider.remove();
  manualStudentButton.remove();
}

function syncUi(){
  syncTeacherShare();
  removeManualStudentEntry();
}

let queued=false;
const observer=new MutationObserver(function(){
  if(queued) return;
  queued=true;
  requestAnimationFrame(function(){
    queued=false;
    syncUi();
  });
});
observer.observe(document.getElementById('app')||document.body,{childList:true,subtree:true});
if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',syncUi); else syncUi();
})();
