(()=>{
 if(globalThis.__kittanRadar)return;globalThis.__kittanRadar=true;
 let host,root,route,fonts;
 function loadFonts(){
  if(fonts)return;fonts=true;
  for(const [family,file,weight] of [['Kittan Inter','inter.woff2','100 900'],['Kittan Sans JP','kittan-sans-jp-regular.woff2','400'],['Kittan Sans JP','kittan-sans-jp-medium.woff2','500'],['Kittan Sans JP','kittan-sans-jp-bold.woff2','700']]){
   try{const f=new FontFace(family,`url(${chrome.runtime.getURL('fonts/'+file)})`,{weight,display:'swap'});document.fonts.add(f);f.load().catch(()=>{});}catch{}
  }
 }
 function make(){
  if(host?.isConnected)return;
  loadFonts();
  host=document.createElement('div');host.id='kittan-radar';
  host.style.cssText='all:initial;position:fixed;right:24px;bottom:24px;z-index:2147483647;';
  root=host.attachShadow({mode:'closed'});
  root.innerHTML=`<style>
  :host{color-scheme:light dark;--bg:#fff;--text:#0b1a2c;--muted:#56687e;--line:#dde7f3;--track:#e5f3ff;--accent:#008ffe;--shadow:0 1px 2px #0b1a2c14,0 18px 56px #0b1a2c29}@media(prefers-color-scheme:dark){:host{--bg:#0e1a2b;--text:#e8f1fb;--muted:#8fa3bb;--line:#1f3048;--track:#16304f;--shadow:0 18px 64px #0009}}*{box-sizing:border-box}section{width:300px;background:var(--bg);color:var(--text);border:1px solid var(--line);border-radius:22px;padding:22px;font:14px/1.6 "Kittan Inter","Kittan Sans JP",system-ui,sans-serif;font-feature-settings:"palt";letter-spacing:.02em;-webkit-font-smoothing:antialiased;box-shadow:var(--shadow)}header{display:flex;align-items:center;justify-content:space-between;font-size:11px;font-weight:600;letter-spacing:.18em;color:var(--accent)}button{border:0;background:none;color:var(--muted);cursor:pointer;font:300 22px/1 "Kittan Inter",system-ui}button:hover{color:var(--text)}h2{font-size:15px;margin:16px 0 0;font-weight:700;letter-spacing:.03em}.number{font-size:64px;line-height:1.15;letter-spacing:-.04em;font-weight:600;font-variant-numeric:tabular-nums;color:var(--accent)}.number small{font-size:16px;font-weight:500;letter-spacing:.02em;color:var(--muted)}p{margin:10px 0 0;color:var(--muted);font-size:12px;letter-spacing:.04em}.track{height:5px;background:var(--track);border-radius:9px;margin:14px 0}.fill{height:100%;border-radius:9px;background:linear-gradient(90deg,#5cb6ff,var(--accent));width:0;transition:width .4s}footer{font-size:10px;letter-spacing:.04em;color:var(--muted);margin-top:16px;border-top:1px solid var(--line);padding-top:12px}@media(max-width:380px){section{width:260px}}
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
