import 'server-only';
import {customerLesson} from './customer-lesson.mjs';
import {normalizeCatalog} from './methodbook-data.mjs';
// User-scoped authorization is checked on every request. Never cache bearer tokens or lessons.
export async function methodbookRequest(db,params){
 const {data:{session}}=await db.auth.getSession();if(!session?.access_token)throw Error('Login required');
 const response=await fetch('https://project-iqw46.vercel.app/api/athcheck?'+new URLSearchParams(params),{headers:{Authorization:'Bearer '+session.access_token,'x-athcheck-key':process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY},cache:'no-store',signal:AbortSignal.timeout(20000)});
 if(!response.ok)throw Error('Method Book unavailable');return response.json();
}
export async function methodbookCatalog(db){try{return normalizeCatalog(await methodbookRequest(db,{action:'catalog'}));}catch{return null;}}
export async function getCustomerLesson(db,id,measurement){try{
 const raw=await methodbookRequest(db,{action:'lesson',id,measurement}),lesson=customerLesson(raw);
 if(!lesson)return null;const media=kind=>'/api/exercise-media?'+new URLSearchParams({id,measurement,kind});
 return {...lesson,video:raw.hasVideo?media('demo'):null,poster:raw.hasPoster?media('poster'):null};
}catch{return null;}}
