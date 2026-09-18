(()=>{
 if(globalThis.__kittanRadar)return;globalThis.__kittanRadar=true;
 let host,root,route;
 function make(){
  if(host?.isConnected)return;
  host=document.createElement('div');host.id='kittan-radar';
  host.style.cssText='all:initial;position:fixed;right:24px;bottom:24px;z-index:2147483647;';
  root=host.attachShadow({mode:'closed'});
  root.innerHTML=`<style>
  :host{color-scheme:dark}*{box-sizing:border-box}section{width:300px;background:#13171b;color:#f7f7f0;border:1px solid #3b443d;border-radius:22px;padding:22px;font:14px/1.6 system-ui,sans-serif;box-shadow:0 18px 64px #0006}header{display:flex;align-items:center;justify-content:space-between;font-size:11px;letter-spacing:.12em;color:#b8c5b8}button{border:0;background:none;color:#b8c5b8;cursor:pointer;font:22px system-ui}h2{font-size:15px;margin:16px 0 0;font-weight:500}.number{font-size:64px;line-height:1.2;letter-spacing:-4px;font-weight:750;color:#d8f7a0}.number small{font-size:18px;letter-spacing:0;color:#b8c5b8}p{margin:10px 0 0;color:#b8c5b8;font-size:12px}.track{height:5px;background:#30382f;border-radius:9px;margin:14px 0}.fill{height:100%;border-radius:9px;background:#d8f7a0;width:0;transition:width .4s}footer{font-size:10px;color:#93a28e;margin-top:16px;border-top:1px solid #30382f;padding-top:12px}@media(max-width:380px){section{width:260px}}
  </style><section role="status" aria-live="polite"><header>KITTAN RADAR <button aria-label="閉じる">×</button></header><h2>このページ、好きそう？</h2><div class="number">…</div><div class="track"><div class="fill"></div></div><p class="status"></p><footer>Jev · 対話から推定</footer></section>`;
  root.querySelector('button').onclick=()=>host.remove();document.documentElement.append(host);
 }
 function render(m){make();route=location.href;const n=root.querySelector('.number'),s=root.querySelector('.status'),f=root.querySelector('.fill');f.style.width='0%';
  if(m.loading){n.textContent='…';s.textContent='Jevがあなたの好みと照合しています';return;}
  if(m.error){n.textContent='—';s.textContent=m.error;return;}
  const r=m.result;n.textContent=String(r.score);const small=document.createElement('small');small.textContent=' / 100';n.append(small);f.style.width=r.score+'%';
  s.textContent=`${r.score>=80?'かなり刺さりそう':r.score>=60?'気に入りそう':r.score>=40?'少し気になるかも':'今の好みとは遠め'} · 確信度 ${r.confidence}%${r.confidence<50?'（判断に迷いあり）':''}`;
  root.querySelector('footer').textContent=`Jev · ${m.scope==='selection'?'選択した文章':'ページ本文'} · 好きそう度は推定スコア`;
 }
 function extract(){
  const selection=getSelection()?.toString().trim();
  if(selection)return {title:document.title,text:selection.slice(0,12000),scope:'selection'};
  const base=document.querySelector('article')||document.querySelector('main')||document.body;
  const walker=document.createTreeWalker(base,NodeFilter.SHOW_TEXT);let text='',node;
  while((node=walker.nextNode())&&text.length<12000){const el=node.parentElement;
   if(!el||el.closest('script,style,noscript,input,textarea,select,[contenteditable],[hidden],[aria-hidden="true"],nav,header,footer,#kittan-radar'))continue;
   const st=getComputedStyle(el);if(st.display==='none'||st.visibility==='hidden'||!el.getClientRects().length)continue;
   const t=node.textContent.trim();if(t)text+=t+'\n';
  }
  return {title:document.title,text:text.slice(0,12000),scope:'page'};
 }
 chrome.runtime.onMessage.addListener((m,s,reply)=>{if(s.id!==chrome.runtime.id)return;if(m.type==='radar:render'){render(m);reply({ok:true});}if(m.type==='radar:extract')reply(extract());});
 setInterval(()=>{if(host?.isConnected&&route!==location.href)host.remove();},750);
})();
