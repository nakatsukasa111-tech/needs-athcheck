import 'server-only';
import {unstable_cache} from 'next/cache';
import {normalizeCatalog} from './methodbook-data.mjs';
// Only validated public metadata is cached. Never cache member records or source lesson bodies.
const cached=unstable_cache(async()=>{
 const response=await fetch('https://project-iqw46.vercel.app/content-staff.json',{cache:'no-store',signal:AbortSignal.timeout(6000)});
 if(!response.ok)throw Error('Method Book unavailable');
 const text=await response.text();if(text.length>4000000)throw Error('Catalog too large');
 return normalizeCatalog(JSON.parse(text));
},['methodbook-metadata-v1'],{revalidate:60});
export async function methodbookCatalog(){try{return await cached();}catch{return null;}}
