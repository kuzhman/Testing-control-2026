import { createClient } from 'npm:@supabase/supabase-js@2';
const cors={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization, apikey, content-type, x-share-code','Access-Control-Allow-Methods':'POST, OPTIONS'};
const respond=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers:{...cors,'Content-Type':'application/json'}});
const encoder=new TextEncoder();
async function digest(s:string){return [...new Uint8Array(await crypto.subtle.digest('SHA-256',encoder.encode(s)))].map(x=>x.toString(16).padStart(2,'0')).join('')}
Deno.serve(async req=>{
 if(req.method==='OPTIONS')return new Response(null,{headers:cors});if(req.method!=='POST')return respond({error:'Method not allowed'},405);
 const provided=req.headers.get('x-share-code')||'',secret=Deno.env.get('TC_SHARED_CODE')||'';
 if(!secret||provided.length<12||provided.length>200||await digest(provided)!==await digest(secret))return respond({error:'Access denied'},403);
 const url=Deno.env.get('SUPABASE_URL')!,service=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;const db=createClient(url,service,{auth:{persistSession:false}});
 try{
 const b=await req.json();if(JSON.stringify(b).length>15_000_000)return respond({error:'Payload too large'},413);
 if(b.action==='pull'){const tables=['tc_companies','tc_entries','tc_photos'];const out:any={};for(const [i,t] of tables.entries()){const {data,error}=await db.from(t).select('data').limit(5000);if(error)throw error;out[['companies','entries','photos'][i]]=(data||[]).map(x=>x.data)}return respond(out)}
 if(b.action==='push'){if(!['companies','entries'].includes(b.table)||!b.record?.id)return respond({error:'Invalid record'},400);const r=b.record;const table=b.table==='companies'?'tc_companies':'tc_entries';if(b.table==='entries'&&!/^[0-9a-f-]{36}$/i.test(r.id))return respond({error:'Invalid ID'},400);const {error}=await db.from(table).upsert({id:r.id,data:r});if(error)throw error;return respond({ok:true})}
 if(b.action==='photo'){const p=b.record;if(!p?.id||!p?.entryId)return respond({error:'Invalid photo'},400);if(b.data){const raw=Uint8Array.from(atob(b.data),c=>c.charCodeAt(0));if(raw.length>10_485_760)return respond({error:'Photo too large'},413);const {error}=await db.storage.from('tc-photos').upload(p.id+'.jpg',raw,{contentType:'image/jpeg',upsert:true});if(error)throw error}if(p.deleted)await db.storage.from('tc-photos').remove([p.id+'.jpg']);const {error}=await db.from('tc_photos').upsert({id:p.id,data:p});if(error)throw error;return respond({ok:true})}
 if(b.action==='getPhoto'){const {data,error}=await db.storage.from('tc-photos').download(b.id+'.jpg');if(error)return respond({data:null});const bytes=new Uint8Array(await data.arrayBuffer());let binary='';for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.slice(i,i+8192));return respond({data:btoa(binary)})}
 return respond({error:'Unknown action'},400)
 }catch(e){console.error(e);return respond({error:'Server operation failed'},500)}
});
