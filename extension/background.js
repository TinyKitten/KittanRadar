import {API,evaluate} from './core.js';
const ext=globalThis.browser??chrome;
const running=new Set();
// SafariはsetAccessLevelをsession領域でしかサポートせず、localでは例外になる。起動時に落ちてリスナー未登録にならないよう握りつぶす。
try{ext.storage.local.setAccessLevel?.({accessLevel:'TRUSTED_CONTEXTS'})?.catch?.(()=>{});}catch{}
async function openOptions(){try{await ext.runtime.openOptionsPage();}catch{}}
ext.runtime.onInstalled.addListener(({reason})=>{if(reason==='install')openOptions();});
ext.action.onClicked.addListener(async tab=>{
  if(!tab.id||running.has(tab.id))return;
  running.add(tab.id);
  let documentId;
  // documentIdはChromeのみ。Safariは実行結果にも送信オプションにも持たないため、あるときだけ渡す。
  const send=message=>documentId?ext.tabs.sendMessage(tab.id,message,{documentId}):ext.tabs.sendMessage(tab.id,message);
  async function show(payload){await send({type:'radar:render',...payload});}
  try{
    if(!/^https?:\/\//.test(tab.url||''))throw new Error('通常のWebページで実行してください。');
    const injected=await ext.scripting.executeScript({target:{tabId:tab.id},files:['content.js']});
    documentId=injected?.[0]?.documentId;
    const settings=await ext.storage.local.get(['mode','apiKey','workerUrl','workerToken','profile']);
    const worker=settings.mode==='worker';
    const token=worker?settings.workerToken:settings.apiKey;
    if(!token){await show({error:'設定画面でJevの接続情報を保存してください。'});await openOptions();return;}
    await show({loading:true});
    const page=await send({type:'radar:extract'});
    const profile=settings.profile||await (await fetch(ext.runtime.getURL('profile.json'))).json();
    const result=await evaluate(page,profile,worker?settings.workerUrl:API,token);
    await show({result,scope:page.scope});
  }catch(e){try{await show({error:e.name==='TimeoutError'?'応答がタイムアウトしました。再実行してください。':e.message});}catch{try{await ext.action.setBadgeText({tabId:tab.id,text:'!'});}catch{}}}
  finally{running.delete(tab.id);}
});
