(function(){
'use strict';

const CHOICES=[
  'שייכות','בית','משפחה','עברית','יהדות','מסורת','תרבות','קהילה','מולדת','מדינה',
  'דמוקרטיה','חגים','זיכרון','עתיד','אחריות','ערבות הדדית','צבא','חברה','מקום','חיבור'
];
const records=new Map();

function roomCode(){
  const fromUrl=(new URLSearchParams(location.search).get('code')||'').replace(/\D/g,'').slice(0,6);
  if(fromUrl) return fromUrl;
  const eyebrow=document.querySelector('.student-room .eyebrow.dark');
  const m=eyebrow&&eyebrow.textContent.match(/\d{6}/);
  return m?m[0]:'current';
}
function same(a,b){return a.length===b.length&&a.every((v,i)=>v===b[i]);}
function parseWords(v){return String(v||'').split(',').map(x=>x.trim()).filter(Boolean).slice(0,3);}

function enhance(){
  const input=document.getElementById('words');
  const submit=document.getElementById('submit');
  if(!input||!submit||document.querySelector('.identity-word-picker')) return;

  const code=roomCode();
  const serverWords=parseWords(input.value);
  let rec=records.get(code);
  if(!rec){
    rec={selected:[...serverWords],lastServer:[...serverWords],dirty:false};
    records.set(code,rec);
  }else if(!same(serverWords,rec.lastServer)){
    rec.selected=[...serverWords];
    rec.lastServer=[...serverWords];
    rec.dirty=false;
  }

  input.type='hidden';
  input.value=rec.selected.join(', ');

  const picker=document.createElement('div');
  picker.className='identity-word-picker';
  picker.innerHTML=`
    <div class="identity-slots" aria-label="שלוש המילים שלי">
      <button type="button" class="identity-slot" data-slot="0"></button>
      <button type="button" class="identity-slot" data-slot="1"></button>
      <button type="button" class="identity-slot" data-slot="2"></button>
    </div>
    <div class="identity-picker-head">
      <strong>בחרו עד שלוש מילים מהענן</strong>
      <button type="button" class="identity-clear">נקה בחירה</button>
    </div>
    <div class="identity-choice-cloud" aria-label="מילים לבחירה">
      ${CHOICES.map(w=>`<button type="button" class="identity-choice" data-word="${w}">${w}</button>`).join('')}
    </div>`;
  input.parentNode.insertBefore(picker,input);

  function renderPicker(){
    input.value=rec.selected.join(', ');
    picker.querySelectorAll('.identity-slot').forEach((slot,i)=>{
      const word=rec.selected[i]||'';
      slot.textContent=word||`בחירה ${i+1}`;
      slot.classList.toggle('filled',!!word);
      slot.disabled=!word;
      slot.title=word?'לחצו להסרה':'';
    });
    picker.querySelectorAll('.identity-choice').forEach(chip=>{
      const on=rec.selected.includes(chip.dataset.word);
      chip.classList.toggle('selected',on);
      chip.setAttribute('aria-pressed',on?'true':'false');
    });
    picker.querySelector('.identity-clear').disabled=rec.selected.length===0;
    submit.disabled=rec.selected.length===0;
  }

  picker.querySelectorAll('.identity-choice').forEach(chip=>chip.addEventListener('click',()=>{
    const word=chip.dataset.word;
    const idx=rec.selected.indexOf(word);
    if(idx>=0){
      rec.selected.splice(idx,1);
    }else if(rec.selected.length<3){
      rec.selected.push(word);
    }else{
      picker.classList.remove('limit-hit');
      void picker.offsetWidth;
      picker.classList.add('limit-hit');
    }
    rec.dirty=true;
    renderPicker();
  }));

  picker.querySelectorAll('.identity-slot').forEach(slot=>slot.addEventListener('click',()=>{
    const i=Number(slot.dataset.slot);
    if(rec.selected[i]){
      rec.selected.splice(i,1);
      rec.dirty=true;
      renderPicker();
    }
  }));

  picker.querySelector('.identity-clear').addEventListener('click',()=>{
    rec.selected=[];
    rec.dirty=true;
    renderPicker();
  });

  submit.addEventListener('click',()=>{input.value=rec.selected.join(', ');},true);
  renderPicker();
}

new MutationObserver(enhance).observe(document.getElementById('app'),{childList:true,subtree:true});
if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',enhance); else enhance();
})();
