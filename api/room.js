import { getCache } from '@vercel/functions';
import crypto from 'node:crypto';

const TTL = 2592000;
const NS = 'yisraeli-identity-live-v1';
const SHARDS = 24;
const cache = () => getCache(undefined, NS);
const roomKey = code => `r:${code}`;
const shardKey = (code, stage, index) => `s:${code}:${stage}:${index}`;
const clean = (v,max=160)=>typeof v==='string'?v.trim().slice(0,max):'';
const newCode = ()=>String(crypto.randomInt(100000,1000000));
function hash(value){let r=2166136261;for(const c of value){r^=c.charCodeAt(0);r=Math.imul(r,16777619)}return r>>>0}
const bucketFor = voterId => hash(voterId)%SHARDS;
function sameToken(a,b){if(!a||!b)return false;const aa=Buffer.from(String(a)),bb=Buffer.from(String(b));return aa.length===bb.length&&crypto.timingSafeEqual(aa,bb)}
async function readBody(req){if(req.body&&typeof req.body==='object')return req.body;const chunks=[];for await(const chunk of req)chunks.push(chunk);try{return JSON.parse(Buffer.concat(chunks).toString())}catch{return {}}}
async function getRoom(code){return cache().get(roomKey(code))}
async function saveRoom(room){await cache().set(roomKey(room.code),room,{ttl:TTL})}
const publicRoom = room => ({code:room.code,className:room.className,activeStage:room.activeStage,stageOpen:room.stageOpen,resultsVisible:room.resultsVisible,version:room.version,createdAt:room.createdAt,updatedAt:room.updatedAt});

async function getBucket(code,stage,voterId){return await cache().get(shardKey(code,stage,bucketFor(voterId)))||{}}
async function putEntry(code,stage,voterId,value){const key=shardKey(code,stage,bucketFor(voterId));for(let attempt=0;attempt<5;attempt++){const current=await cache().get(key)||{};await cache().set(key,{...current,[voterId]:value},{ttl:TTL});const verify=await cache().get(key)||{};if(JSON.stringify(verify[voterId])===JSON.stringify(value))return true;await new Promise(r=>setTimeout(r,25+attempt*25))}return false}
async function deleteStage(code,stage){await Promise.all(Array.from({length:SHARDS},(_,i)=>cache().delete(shardKey(code,stage,i))))}
async function allEntries(code,stage){const buckets=await Promise.all(Array.from({length:SHARDS},(_,i)=>cache().get(shardKey(code,stage,i))));return buckets.filter(Boolean).flatMap(b=>Object.values(b))}

const IDENTITY_KEYS=['יהדות','עברית','מקום','משפחה','קהילה','תרבות','זיכרון','עתיד'];
const LAB_CASES=[
 {id:'born',title:'נולד בישראל וחי כאן',options:['מאוד ישראלי/ת','ישראלי/ת במידה מסוימת','לא בטוח/ה']},
 {id:'arab',title:'אזרח ערבי שמגדיר עצמו פלסטיני, חי ועובד בישראל ודובר עברית',options:['מאוד ישראלי/ת','ישראלי/ת במידה מסוימת','לא בטוח/ה']},
 {id:'immigrant',title:'חייל נוצרי שעלה מרוסיה, חי בישראל ורואה את עתידו כאן; משפחתו ברוסיה',options:['מאוד ישראלי/ת','ישראלי/ת במידה מסוימת','לא בטוח/ה']},
 {id:'abroad',title:'ישראלי שנולד כאן וחי כבר שנים רבות בחו״ל',options:['מאוד ישראלי/ת','ישראלי/ת במידה מסוימת','לא בטוח/ה']}
];

async function stageSummary(room){
 if(room.activeStage===1){const rows=await allEntries(room.code,1);const freq={};for(const r of rows){for(const w of (r.words||[])){const k=clean(w,35);if(k)freq[k]=(freq[k]||0)+1}}return{total:rows.length,words:freq};}
 if(room.activeStage===2){const rows=await allEntries(room.code,2);const sums=Object.fromEntries(IDENTITY_KEYS.map(k=>[k,0]));for(const r of rows){for(const k of IDENTITY_KEYS)sums[k]+=Number(r.values?.[k]||0)}const avg={};for(const k of IDENTITY_KEYS)avg[k]=rows.length?+(sums[k]/rows.length).toFixed(2):0;return{total:rows.length,averages:avg};}
 if(room.activeStage===3){const rows=await allEntries(room.code,3);const cases=LAB_CASES.map(c=>({id:c.id,title:c.title,options:c.options,counts:c.options.map((_,i)=>rows.filter(r=>Number(r.answers?.[c.id])===i).length)}));return{total:rows.length,cases};}
 return{total:0};
}

function validateStagePayload(stage,body){
 if(stage===1){const raw=Array.isArray(body.words)?body.words:[];const words=[...new Set(raw.map(x=>clean(x,35)).filter(Boolean))].slice(0,3);return words.length?{words}:null;}
 if(stage===2){const values={};for(const k of IDENTITY_KEYS){const n=Number(body.values?.[k]);if(!Number.isInteger(n)||n<1||n>5)return null;values[k]=n}return{values};}
 if(stage===3){const answers={};for(const c of LAB_CASES){const n=Number(body.answers?.[c.id]);if(!Number.isInteger(n)||n<0||n>=c.options.length)return null;answers[c.id]=n}return{answers};}
 return null;
}

export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store');
 try{
  if(req.method==='GET'){
   const code=clean(req.query?.code,10),voterId=clean(req.query?.voterId,120),teacherToken=clean(req.query?.teacherToken,100);
   if(!code)return res.status(400).json({error:'missing_code'});
   const room=await getRoom(code);if(!room)return res.status(404).json({error:'room_not_found'});
   const teacher=sameToken(teacherToken,room.teacherToken);
   const bucket=voterId?await getBucket(code,room.activeStage,voterId):{};
   const myResponse=voterId?(bucket[voterId]||null):null;
   const summary=(teacher||room.resultsVisible)?await stageSummary(room):null;
   return res.json({...publicRoom(room),teacher,myResponse,summary,identityKeys:IDENTITY_KEYS,labCases:LAB_CASES});
  }
  if(req.method!=='POST')return res.status(405).json({error:'method'});
  const body=await readBody(req),action=clean(body.action,30);
  if(action==='create'){
   let code='';for(let i=0;i<10;i++){const c=newCode();if(!await getRoom(c)){code=c;break}}
   if(!code)return res.status(503).json({error:'code_generation'});
   const now=Date.now();const room={code,teacherToken:crypto.randomBytes(24).toString('hex'),className:clean(body.className,60),activeStage:1,stageOpen:false,resultsVisible:true,version:1,createdAt:now,updatedAt:now};
   await saveRoom(room);return res.status(201).json({...publicRoom(room),teacherToken:room.teacherToken,summary:await stageSummary(room),identityKeys:IDENTITY_KEYS,labCases:LAB_CASES});
  }
  const code=clean(body.code,10),room=await getRoom(code);if(!room)return res.status(404).json({error:'room_not_found'});
  if(action==='submit'){
   if(!room.stageOpen)return res.status(409).json({error:'stage_closed'});
   const voterId=clean(body.voterId,120);if(!voterId)return res.status(400).json({error:'missing_voter'});
   const value=validateStagePayload(room.activeStage,body);if(!value)return res.status(400).json({error:'invalid_response'});
   const ok=await putEntry(code,room.activeStage,voterId,{...value,updatedAt:Date.now()});if(!ok)return res.status(409).json({error:'retry'});
   room.updatedAt=Date.now();await saveRoom(room);return res.json({ok:true,myResponse:value});
  }
  if(!sameToken(clean(body.teacherToken,100),room.teacherToken))return res.status(403).json({error:'teacher_auth_failed'});
  if(action==='setStage'){
   const stage=Number(body.stage);if(![1,2,3].includes(stage))return res.status(400).json({error:'bad_stage'});room.activeStage=stage;room.stageOpen=false;room.resultsVisible=true;
  }else if(action==='setOpen')room.stageOpen=Boolean(body.open);
  else if(action==='setVisibility')room.resultsVisible=Boolean(body.visible);
  else if(action==='resetStage')await deleteStage(code,room.activeStage);
  else if(action==='resetAll'){for(const s of [1,2,3])await deleteStage(code,s);room.activeStage=1;room.stageOpen=false;room.resultsVisible=true;}
  else return res.status(400).json({error:'action'});
  room.version+=1;room.updatedAt=Date.now();await saveRoom(room);
  return res.json({...publicRoom(room),teacher:true,summary:await stageSummary(room),identityKeys:IDENTITY_KEYS,labCases:LAB_CASES});
 }catch(error){console.error(error);return res.status(500).json({error:'server_error'})}
}
