// Private source JSON stays outside Git. No lesson body, video or credential is imported.
import {readFileSync} from 'node:fs';
import {createClient} from '@supabase/supabase-js';
const [path,revision,baseUrl]=process.argv.slice(2);
if(!path||!revision||!baseUrl)throw Error('Usage: node --env-file=.env.local scripts/import-method-book.mjs <private-json> <revision> <book-url> [--demo]');
const origin=new URL(baseUrl);if(origin.protocol!=='https:'||origin.username||origin.password||origin.search)throw Error('教材URLが不正です');
const demo=process.argv.includes('--demo');
if(demo&&process.env.NEXT_PUBLIC_SUPABASE_URL!=='https://eoofavwbhhlcmzjpkgnf.supabase.co')throw Error('デモ許可は専用開発環境のみ使用できます');
const db=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false}});
const companyId=process.env.ATHLETE_IMPORT_COMPANY_ID;
if(!companyId)throw Error('ATHLETE_IMPORT_COMPANY_IDが必要です');
const data=JSON.parse(readFileSync(path,'utf8'));
const lessons=data.lessons.map(l=>({company_id:companyId,id:l.id,title:l.title,tags:Object.entries(l.tags??{}).flatMap(([group,tags])=>tags.map(t=>`${group}:${t}`)),source_approved:l.approval_status==='approved',demo_approved:demo,member_enabled:demo,member_url:demo?new URL(`#${l.id}`,origin).href:null,source_revision:revision,synced_at:new Date().toISOString()}));
const result=await db.from('athlete_lessons').upsert(lessons);
if(result.error)throw Error(result.error.message);
console.log(JSON.stringify({imported:lessons.length,demo}));
