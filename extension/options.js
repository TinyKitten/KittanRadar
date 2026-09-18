import {validateProfile} from './core.js';
const $=id=>document.getElementById(id);
const defaults=await (await fetch('profile.json')).json();
const s=await chrome.storage.local.get(['mode','apiKey','workerUrl','workerToken','profile']);
for(const id of ['mode','apiKey','workerUrl','workerToken'])$(id).value=s[id]||(id==='mode'?'direct':'');
$('profile').value=JSON.stringify(s.profile||defaults,null,2);
function toggle(){$('direct').hidden=$('mode').value!=='direct';$('worker').hidden=$('mode').value!=='worker';}toggle();$('mode').onchange=toggle;
$('reset').onclick=()=>{$('profile').value=JSON.stringify(defaults,null,2);};
$('settings').onsubmit=async e=>{e.preventDefault();try{
 const profile=validateProfile(JSON.parse($('profile').value));let workerUrl=$('workerUrl').value.trim();
 if($('mode').value==='worker'){
  const u=new URL(workerUrl);if(u.protocol!=='https:'||u.username||u.password||u.search||u.hash)throw new Error('Worker URLはクエリや認証情報のないHTTPS URLにしてください。');
  if(!$('workerToken').value.trim())throw new Error('接続トークンを入力してください。');
  const allowed=await chrome.permissions.request({origins:[u.origin+'/*']});if(!allowed)throw new Error('Workerへの接続権限が必要です。');workerUrl=u.href;
 }else if(!$('apiKey').value.trim())throw new Error('APIキーを入力してください。');
 await chrome.storage.local.set({mode:$('mode').value,apiKey:$('apiKey').value.trim(),workerUrl,workerToken:$('workerToken').value.trim(),profile});$('status').textContent='保存しました。Webページで拡張アイコンをクリックしてください。';
 }catch(e){$('status').textContent=e.message;}};
