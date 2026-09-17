(function(){
  'use strict';
  const from='מה הופך לישראלי?';
  const to='מה הופך אדם לישראלי';
  function fix(root=document.body){
    const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
    let n;
    while((n=walker.nextNode())){
      if(n.nodeValue && n.nodeValue.includes(from)) n.nodeValue=n.nodeValue.split(from).join(to);
    }
  }
  const start=()=>{
    fix();
    const target=document.getElementById('app')||document.body;
    new MutationObserver(()=>fix(target)).observe(target,{childList:true,subtree:true,characterData:true});
  };
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',start); else start();
})();
