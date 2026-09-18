const API='https://api.typesafe.ai/v1/systemone';
export default {async fetch(request,env){
 const json=(obj,status)=>Response.json(obj,{status,headers:{'Cache-Control':'no-store'}});
 if(new URL(request.url).pathname!=='/evaluate')return json({error:'Not found'},404);
 if(request.method!=='POST')return json({error:'Method not allowed'},405);
 if(!env.RADAR_TOKEN||!env.TYPESAFE_API_KEY)return json({error:'Server is not configured'},503);
 if(request.headers.get('Authorization')!==`Bearer ${env.RADAR_TOKEN}`)return json({error:'Unauthorized'},401);
 if(!request.headers.get('Content-Type')?.startsWith('application/json'))return json({error:'JSON required'},415);
 try{
  const reader=request.body?.getReader();if(!reader)return json({error:'Body required'},400);
  let size=0,chunks=[];while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>100000){await reader.cancel();return json({error:'Payload too large'},413);}chunks.push(value);}
  const bytes=new Uint8Array(size);let offset=0;for(const c of chunks){bytes.set(c,offset);offset+=c.length;}
  const body=JSON.parse(new TextDecoder().decode(bytes));
  if(body.model!=='jev-latest'||!body.state||body.questions?.affinity?.type!=='score'||Object.keys(body.questions).length!==1)return json({error:'Invalid request'},400);
  const upstream=await fetch(API,{method:'POST',headers:{Authorization:`Bearer ${env.TYPESAFE_API_KEY}`,'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(20000),redirect:'error'});
  if(!upstream.ok)return json({error:'Jev request failed'},upstream.status);
  return json(await upstream.json(),200);
 }catch(e){return json({error:e instanceof SyntaxError?'Invalid JSON':'Upstream unavailable'},e instanceof SyntaxError?400:502);}
}};
