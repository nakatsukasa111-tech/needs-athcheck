import {NextResponse} from 'next/server';

import sharp from 'sharp';
import {client} from '../../../lib/supabase';
import {adminClient} from '../../../lib/admin';
import {photoInput,PHOTO_BUCKET,uuid,matchesImage} from '../../../lib/photo-input.mjs';
export const runtime='nodejs',dynamic='force-dynamic';
const json=(body,status=200)=>NextResponse.json(body,{status,headers:{'Cache-Control':'private, no-store'}});
async function authorized(memberId){
 if(!uuid(memberId))throw Error('会員を確認できません。');
 const db=await client();const {data:u,error:ue}=await db.auth.getUser();if(ue||!u.user)throw Error('ログインし直してください。');
 const m=await db.from('athlete_members').select('id,company_id').eq('id',memberId).eq('active',true).maybeSingle();
 if(m.error||!m.data)throw Error('会員を確認できません。');
 const staff=await db.from('athlete_staff').select('user_id').eq('company_id',m.data.company_id).eq('user_id',u.user.id).eq('active',true).maybeSingle();
 if(staff.error||!staff.data)throw Error('スタッフ権限が必要です。');
 return {db,user:u.user,member:m.data,admin:adminClient()};
}
function sameOrigin(request){const origin=request.headers.get('origin');if(!origin||origin!==new URL(request.url).origin)throw Error('画面を開き直してください。');}
export async function POST(request){try{
 sameOrigin(request);const v=await request.json();const input=photoInput(v);const {admin,user,member}=await authorized(v.memberId);
 const record=await admin.from('athlete_measurements').select('id,company_id,member_id').eq('id',v.recordId).maybeSingle();
 if(record.error)throw Error('測定を確認できません。');
 if(record.data&&(record.data.company_id!==member.company_id||record.data.member_id!==member.id))throw Error('測定と会員が一致しません。');
 const session=await admin.from('athlete_photo_sessions').upsert({id:v.recordId,company_id:member.company_id,member_id:member.id,measurement_id:record.data?.id??null},{onConflict:'id',ignoreDuplicates:true});
 if(session.error)throw Error('写真保存の準備ができませんでした。');
 const saved=await admin.from('athlete_photo_sessions').select('company_id,member_id').eq('id',v.recordId).single();
 if(saved.error||saved.data.company_id!==member.company_id||saved.data.member_id!==member.id)throw Error('測定と会員が一致しません。');
 const path=member.company_id+'/'+member.id+'/'+v.recordId+'/'+v.id+'.'+input.ext;
 const values={id:v.id,session_id:v.recordId,company_id:member.company_id,member_id:member.id,field_key:v.fieldKey,phase:v.phase,source:v.source,captured_at:input.capturedAt,created_by:user.id,object_path:path,mime_type:v.mime,byte_size:v.size};
 const inserted=await admin.from('athlete_photos').insert(values);
 if(inserted.error){const old=await admin.from('athlete_photos').select('*').eq('id',v.id).single();if(old.error||Object.entries(values).some(([k,val])=>(k==='captured_at'?(old.data[k]?new Date(old.data[k]).toISOString():null)!==val:old.data[k]!==val)))throw Error('写真の保存準備に失敗しました。');if(old.data.status==='ready')return json({id:v.id,ready:true});}
 const signed=await admin.storage.from(PHOTO_BUCKET).createSignedUploadUrl(path);
 if(signed.error)throw Error('写真の送信先を準備できませんでした。');
 return json({id:v.id,url:signed.data.signedUrl});
 }catch(e){return json({error:e.message||'保存の準備に失敗しました。'},400);}}
export async function PATCH(request){try{
 sameOrigin(request);const {memberId,id}=await request.json();if(!uuid(id))throw Error('写真を確認できません。');
 const {admin,member}=await authorized(memberId);
 const result=await admin.from('athlete_photos').select('*').eq('id',id).eq('member_id',member.id).eq('company_id',member.company_id).single();
 if(result.error)throw Error('写真を確認できません。');const p=result.data;if(p.status==='ready')return json({saved:true});
 const file=await admin.storage.from(PHOTO_BUCKET).download(p.object_path);if(file.error)throw Error('写真の送信が完了していません。再試行してください。');
 const bytes=Buffer.from(await file.data.arrayBuffer());
 if(bytes.length!==p.byte_size||!matchesImage(bytes,p.mime_type))throw Error('写真の形式を確認できません。別の写真を選んでください。');
 const metadata=await sharp(bytes,{limitInputPixels:100000000}).metadata();if(!metadata.width||!metadata.height)throw Error('写真を読み込めません。');
 const update=await admin.from('athlete_photos').update({status:'ready'}).eq('id',id).eq('company_id',member.company_id);
 if(update.error)throw Error('送信済み写真の保存確定に失敗しました。再試行してください。');
 return json({saved:true});
 }catch(e){return json({error:e.message?.includes('Input')?'写真を読み込めません。JPEG・PNG・WebPでお試しください。':e.message||'写真を保存できませんでした。'},400);}}
export async function GET(request){try{
 const q=new URL(request.url).searchParams;const {db,admin,member}=await authorized(q.get('memberId'));
 const offset=Math.max(0,Math.min(100000,Number(q.get('offset'))||0));
 let query=db.from('athlete_photos').select('id,session_id,field_key,phase,source,captured_at,uploaded_at,object_path').eq('member_id',member.id).eq('status','ready').order('uploaded_at',{ascending:false}).order('id').range(offset,offset+23);
 if(q.get('recordId')){if(!uuid(q.get('recordId')))throw Error('測定を確認できません。');query=query.eq('session_id',q.get('recordId'));}
 if(q.get('fieldKey'))query=query.eq('field_key',q.get('fieldKey'));
 if(q.get('phase'))query=query.eq('phase',q.get('phase'));
 const result=await query;if(result.error)throw Error('写真一覧を読み込めませんでした。');
 const signed=result.data.length?await admin.storage.from(PHOTO_BUCKET).createSignedUrls(result.data.map(p=>p.object_path),300):{data:[],error:null};
 if(signed.error)throw Error('写真を読み込めませんでした。');
 return json({photos:result.data.map((p,i)=>{const {object_path,...rest}=p;return {...rest,url:signed.data[i]?.signedUrl??null};}),hasMore:result.data.length===24});
 }catch(e){return json({error:e.message||'写真一覧を読み込めませんでした。'},400);}}
