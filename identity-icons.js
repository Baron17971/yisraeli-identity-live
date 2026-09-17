(function(){
'use strict';
const ICONS={
  'יהדות':'judaism.png',
  'עברית':'hebrew.png',
  'מקום':'place.png',
  'משפחה':'family.png',
  'קהילה':'community.png',
  'תרבות':'culture.png',
  'זיכרון':'memory.png',
  'עתיד':'future.png'
};
const base='/identity-icons/';
function findKey(text=''){return Object.keys(ICONS).find(k=>String(text).includes(k));}
function imgFor(key,cls='identity-criterion-icon'){
  const img=document.createElement('img');
  img.src=base+ICONS[key];
  img.alt='';
  img.setAttribute('aria-hidden','true');
  img.className=cls;
  return img;
}
function enhanceItem(item){
  const label=item.querySelector('label');
  if(!label||label.dataset.iconReady==='1')return;
  const key=findKey(label.textContent);
  if(!key)return;
  const score=label.querySelector('[id^="v-"]');
  const scoreText=score?.textContent||'';
  const scoreId=score?.id||'';
  label.textContent='';
  label.classList.add('identity-visual-label');
  label.dataset.iconReady='1';
  const main=document.createElement('span');
  main.className='identity-visual-main';
  main.appendChild(imgFor(key));
  const name=document.createElement('span');
  name.className='identity-visual-name';
  name.textContent=key;
  main.appendChild(name);
  label.appendChild(main);
  if(scoreId){
    const value=document.createElement('span');
    value.id=scoreId;
    value.className='identity-visual-score';
    value.textContent=scoreText;
    label.appendChild(value);
  }
  item.classList.add('identity-visual-item');
}
function enhanceProjector(){
  document.querySelectorAll('.projector-bar-label b').forEach(b=>{
    if(b.dataset.iconReady==='1')return;
    const key=findKey(b.textContent);
    if(!key)return;
    b.dataset.iconReady='1';
    b.classList.add('projector-identity-name');
    b.prepend(imgFor(key,'projector-identity-icon'));
  });
}
function enhance(){
  document.querySelectorAll('.identity-item').forEach(enhanceItem);
  enhanceProjector();
}
function start(){
  enhance();
  new MutationObserver(enhance).observe(document.body,{childList:true,subtree:true});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();
