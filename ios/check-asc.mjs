// App Store Connect APIキーを単体で検証し、ビルド前に原因の分かるエラーを出す。
// xcodebuildは認証失敗を「Apple ID or password was entered incorrectly」としか言わないため。
// 使い方: ASC_KEY_ID=… ASC_ISSUER_ID=… ASC_KEY_PATH=AuthKey_….p8 node ios/check-asc.mjs
import {createPrivateKey,sign} from 'node:crypto';
import {readFileSync} from 'node:fs';

const keyId=(process.env.ASC_KEY_ID||'').trim();
const issuer=(process.env.ASC_ISSUER_ID||'').trim();
const bundleId=(process.env.BUNDLE_ID||'me.tinykitten.kittan-radar').trim();
const fail=message=>{console.error(`::error::${message}`);process.exit(1);};

if(!/^[A-Z0-9]{10}$/.test(keyId))fail(`ASC_KEY_IDはキーIDの10桁の英数字です（現在${keyId.length}文字）。`);
if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(issuer))fail(`ASC_ISSUER_IDはIssuer IDのUUID（36文字）です（現在${issuer.length}文字）。キーIDと取り違えていないか確認してください。`);
let pem;try{pem=readFileSync(process.env.ASC_KEY_PATH,'utf8');}catch{fail('ASC_KEY_P8のファイルを読めません。');}
if(!pem.includes('-----BEGIN PRIVATE KEY-----'))fail('ASC_KEY_P8が.p8ファイルの内容になっていません（-----BEGIN PRIVATE KEY-----で始まる全文を登録してください）。');
let key;try{key=createPrivateKey(pem);}catch{fail('ASC_KEY_P8の内容を秘密鍵として読めません。ファイル全体を改変せずに登録してください。');}
if(key.asymmetricKeyType!=='ec')fail('ASC_KEY_P8がApp Store ConnectのAPIキー（EC鍵）ではありません。');

const b64=value=>Buffer.from(typeof value==='string'?value:JSON.stringify(value)).toString('base64url');
function token(payload){
  const now=Math.floor(Date.now()/1000);
  const data=`${b64({alg:'ES256',kid:keyId,typ:'JWT'})}.${b64({...payload,iat:now,exp:now+600,aud:'appstoreconnect-v1'})}`;
  return `${data}.${sign('sha256',Buffer.from(data),{key,dsaEncoding:'ieee-p1363'}).toString('base64url')}`;
}
const get=jwt=>fetch(`https://api.appstoreconnect.apple.com/v1/apps?filter[bundleId]=${encodeURIComponent(bundleId)}&fields[apps]=bundleId,name`,{headers:{Authorization:`Bearer ${jwt}`}});

const response=await get(token({iss:issuer}));
if(response.status===401){
  // 個人キーはissの代わりにsub:userで認証する。通るなら個人キーを登録している。
  if((await get(token({sub:'user'}))).ok)fail('登録されているのは「個人キー」です。xcodebuildにはIssuer IDのある「チームキー」（アクセス: Admin）が必要です。チームキーを作り直してください。');
  fail('App Store ConnectがAPIキーを認証しませんでした。キーID・Issuer ID・.p8が同じチームキーのものか、キーが失効していないかを確認してください（作成直後は反映に数分かかる場合があります）。');
}
if(response.status===403)fail('APIキーの権限が足りません。アクセスが「Admin」のチームキーを使ってください。');
if(!response.ok)fail(`App Store Connect APIがエラーを返しました（${response.status}）。`);
const {data}=await response.json();
if(!data?.length)fail(`App Store ConnectにバンドルID ${bundleId} のAppがありません。「アプリ」から新規Appを作成してください。`);
console.log(`App Store Connect APIキーを確認しました（App: ${data[0].attributes.name}）。`);
