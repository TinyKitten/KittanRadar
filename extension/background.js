import {API,evaluate} from './core.js';
const running=new Set();
chrome.storage.local.setAccessLevel({accessLevel:'TRUSTED_CONTEXTS'});
chrome.runtime.onInstalled.addListener(({reason})=>{if(reason==='install')chrome.runtime.openOptionsPage();});
chrome.action.onClicked.addListener(async tab=>{
  if(!tab.id||running.has(tab.id))return;
  running.add(tab.id);
  let documentId;
  async function show(payload){await chrome.tabs.sendMessage(tab.id,{type:'radar:render',...payload},documentId?{documentId}:{});}
  try{
    if(!/^https?:\/\//.test(tab.url||''))throw new Error('通常のWebページで実行してください。');
    const injected=await chrome.scripting.executeScript({target:{tabId:tab.id},files:['content.js']});
    documentId=injected[0].documentId;
    const settings=await chrome.storage.local.get(['mode','apiKey','workerUrl','workerToken','profile']);
    const worker=settings.mode==='worker';
    const token=worker?settings.workerToken:settings.apiKey;
    if(!token){await show({error:'設定画面でJevの接続情報を保存してください。'});await chrome.runtime.openOptionsPage();return;}
    await show({loading:true});
    const page=await chrome.tabs.sendMessage(tab.id,{type:'radar:extract'},{documentId});
    const profile=settings.profile||await (await fetch(chrome.runtime.getURL('profile.json'))).json();
    const result=await evaluate(page,profile,worker?settings.workerUrl:API,token);
    await show({result,scope:page.scope});
  }catch(e){try{await show({error:e.name==='TimeoutError'?'応答がタイムアウトしました。再実行してください。':e.message});}catch{await chrome.action.setBadgeText({tabId:tab.id,text:'!'});}}
  finally{running.delete(tab.id);}
});
