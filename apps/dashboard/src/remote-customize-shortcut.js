function installCustomizeShortcut(){
  if(window.location.pathname!=="/remote")return;
  const actions=document.querySelector(".home-quick-actions");
  if(!actions||actions.querySelector(".customize-action"))return;
  const button=document.createElement("button");
  button.type="button";
  button.className="customize-action";
  button.innerHTML=`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h10 M18 7h2 M4 17h2 M10 17h10 M14 4v6 M6 14v6"/></svg><span><strong>Customize</strong><small>Metrics, goals &amp; data slides</small></span><b>›</b>`;
  button.addEventListener("click",()=>{window.location.href="/customize";});
  actions.appendChild(button);
}
const observer=new MutationObserver(installCustomizeShortcut);
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",()=>{installCustomizeShortcut();observer.observe(document.body,{childList:true,subtree:true});});else{installCustomizeShortcut();observer.observe(document.body,{childList:true,subtree:true});}
