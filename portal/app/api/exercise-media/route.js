import {client} from '../../../lib/supabase';
import {methodbookRequest} from '../../../lib/methodbook';
export const dynamic='force-dynamic';
export async function GET(request){
 const headers={'Cache-Control':'private, no-store','Referrer-Policy':'no-referrer'};
 const q=new URL(request.url).searchParams,id=q.get('id'),measurement=q.get('measurement'),kind=q.get('kind');
 if(!/^[-a-zA-Z0-9_]{1,100}$/.test(id||'')||!/^[-a-f0-9]{36}$/i.test(measurement||'')||!['demo','poster'].includes(kind))return Response.json({error:'Invalid request'},{status:400,headers});
 const db=await client(),{data,error}=await db.auth.getUser();if(error||!data.user)return Response.json({error:'Login required'},{status:401,headers});
 try{const {url}=await methodbookRequest(db,{action:'media',id,measurement,kind});const target=new URL(url);if(target.protocol!=='https:'||!target.hostname.endsWith('.supabase.co')||!target.pathname.startsWith('/storage/v1/object/sign/book-media/'))throw Error('Invalid media');
 return new Response(null,{status:302,headers:{...headers,Location:url}});
 }catch{return Response.json({error:'教材を取得できませんでした'},{status:403,headers});}
}
