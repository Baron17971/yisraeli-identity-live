(function(){
'use strict';
const originalParams=new URLSearchParams(location.search);
const isStudentPath=location.pathname==='/student';
const directCode=(originalParams.get('code')||'').replace(/\D/g,'').slice(0,6);

// Allow the existing app to recognize a direct /student?code=... link,
// then restore the clean student URL after initialization.
if(isStudentPath&&directCode){
  const bootParams=new URLSearchParams(location.search);
  bootParams.set('role','student');
  bootParams.set('code',directCode);
  history.replaceState(null,'',location.pathname+'?'+bootParams.toString());
  setTimeout(function(){
    history.replaceState(null,'',location.pathname+'?code='+encodeURIComponent(directCode));
  },900);
}

function directStudentUrl(code){
  return location.origin+'/student?code='+encodeURIComponent(code);
}

function syncUi(){
  // Teacher share card: QR and copied link must be exactly the same URL.
  const shareCard=document.querySelector('.share-card');
  if(shareCard){
    const codeNode=document.querySelector('.teacher-header .room-code');
    const code=codeNode?(codeNode.textContent||'').replace(/\D/g,'').slice(0,6):'';
    if(code){
      const url=directStudentUrl(code);
      const linkBox=shareCard.querySelector('.share-link');
      if(linkBox) linkBox.textContent=url;
      const qr=shareCard.querySelector('.qr img');
      if(qr) qr.src='/api/qr?text='+encodeURIComponent(url);
      const copy=document.getElementById('copyLink');
      if(copy){
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
      if(intro) intro.textContent='סריקת ה־QR או העתקת הקישור מכניסות את התלמידים ישירות לכיתה.';
    }
  }

  // No manual student code login from the teacher home page.
  const manualStudentButton=document.getElementById('studentJoin');
  if(manualStudentButton){
    const divider=manualStudentButton.previousElementSibling;
    if(divider&&divider.classList.contains('access-divider')) divider.remove();
    manualStudentButton.remove();
  }

  // Direct student links auto-join. Hide the manual code form while the app connects.
  if(isStudentPath&&directCode){
    const joinCard=document.querySelector('.student-join');
    if(joinCard){
      const joinForm=joinCard.querySelector('.join');
      if(joinForm) joinForm.style.display='none';
      const back=joinCard.querySelector('#back');
      if(back) back.style.display='none';
      const text=joinCard.querySelector('p.muted');
      if(text) text.textContent='מתחברים לפעילות…';
    }
  }
}

new MutationObserver(syncUi).observe(document.documentElement,{childList:true,subtree:true});
if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',syncUi); else syncUi();
})();
