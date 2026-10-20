import {NextResponse} from 'next/server';

import sharp from 'sharp';
import {thumbnail,thumbnailPath} from '../../../lib/photo-thumbnail.mjs';
import {readPhotoGallery} from '../../../lib/photo-gallery';
import {client} from '../../../lib/supabase';
import {adminClient} from '../../../lib/admin';
import {photoInput,photoDetailsInput,PHOTO_BUCKET,uuid,matchesImage} from '../../../lib/photo-input.mjs';
import {validateAnnotations} from '../../../lib/photo-annotations.mjs';
export const runtime='nodejs',dynamic='force-dynamic';
const json=(body,status=200)=>NextResponse.json(body,{status,headers:{'Cache-Control':'private, no-store'}});
async function authorized(memberId){
 if(!uuid(memberId))throw Error('会員を確認できません。');
 const db=await client();const {data:u,error:ue}=await db.auth.getUser();if(ue||!u.user)throw Error('ログインし直してください。');
 const [m,staff]=await Promise.all([
 db.from('athlete_members').select('id,company_id').eq('id',memberId).eq('active',true).maybeSingle(),
 db.from('athlete_staff').select('company_id').eq('user_id',u.user.id).eq('active',true)
 ]);
 if(m.error||!m.data)throw Error('会員を確認できません。');
 if(staff.error||!staff.data?.some(s=>s.company_id===m.data.company_id))throw Error('スタッフ権限が必要です。');
 return {db,user:u.user,member:m.data,admin:adminClient()};
}
function sameOrigin(request){const origin=request.headers.get('origin');if(!origin||origin!==new URL(request.url).origin)throw Error('画面を開き直してください。');}
export async function POST(request){try{
 sameOrigin(request);const v=await request.json();const input=photoInput(v);const {admin,user,member}=await authorized(v.memberId);
 const record=await admin.from('athlete_measurements').select('id,company_id,member_id').eq('id',v.recordId).maybeSingle();
 if(record.error)throw Error('測定を確認できません。');
 if(record.data&&(record.data.company_id!==member.company_id||record.data.member_id!==member.id))throw Error('測定と会員が一致しません。');
 const session=await admin.from('athlete_photo_sessions').upsert({id:v.recordId,company_id:member.company_id,member_id:member.id,measurement_id:record.data?.id??null},{onConflict:'id',ignoreDuplicates:true}).select('company_id,member_id');
 if(session.error)throw Error('写真保存の準備ができませんでした。');
 const saved=session.data?.length?{data:session.data[0]}:await admin.from('athlete_photo_sessions').select('company_id,member_id').eq('id',v.recordId).single();
 if(saved.error||saved.data.company_id!==member.company_id||saved.data.member_id!==member.id)throw Error('測定と会員が一致しません。');
 const path=member.company_id+'/'+member.id+'/'+v.recordId+'/'+v.id+'.'+input.ext;
 const values={id:v.id,session_id:v.recordId,company_id:member.company_id,member_id:member.id,field_key:input.fieldKey,phase:input.phase,memo:input.memo,source:v.source,captured_at:input.capturedAt,created_by:user.id,object_path:path,mime_type:v.mime,byte_size:v.size};
 const inserted=await admin.from('athlete_photos').insert(values);
 if(inserted.error){const old=await admin.from('athlete_photos').select('*').eq('id',v.id).single();if(old.error||Object.entries(values).some(([k,val])=>(k==='captured_at'?(old.data[k]?new Date(old.data[k]).toISOString():null)!==val:old.data[k]!==val)))throw Error('写真の保存準備に失敗しました。');if(old.data.status==='ready')return json({id:v.id,ready:true});}
 const signed=await admin.storage.from(PHOTO_BUCKET).createSignedUploadUrl(path);
 if(signed.error)throw Error('写真の送信先を準備できませんでした。');
 return json({id:v.id,url:signed.data.signedUrl});
 }catch(e){return json({error:e.message||'保存の準備に失敗しました。'},400);}}
export async function PATCH(request){try{
 sameOrigin(request);const payload=await request.json();const {memberId,id}=payload;if(!uuid(id))throw Error('写真を確認できません。');
 const {admin,member}=await authorized(memberId);
 if(payload.action==='reorder'){
  if(!uuid(payload.otherId))throw Error('並び替える写真を確認してください。');
  const pair=await admin.from('athlete_photos').select('id,session_id,status').eq('company_id',member.company_id).eq('member_id',member.id).in('id',[id,payload.otherId]);
  if(pair.error||pair.data?.length!==2||pair.data.some(p=>p.status!=='ready'||p.session_id!==pair.data[0].session_id))throw Error('同じ測定記録の写真だけ並び替えられます。');
  const swapped=await admin.rpc('swap_athlete_photo_order',{first_id:id,second_id:payload.otherId});
  if(swapped.error)throw Error('写真の並び順を変更できませんでした。');
  return json({saved:true});
 }
 const result=await admin.from('athlete_photos').select('*').eq('id',id).eq('member_id',member.id).eq('company_id',member.company_id).single();
 if(result.error)throw Error('写真を確認できません。');const p=result.data;
 if(payload.action==='annotate'){
  if(p.status!=='ready')throw Error('保存済みの写真を選んでください。');
  if(!Number.isSafeInteger(payload.revision)||payload.revision!==p.annotation_revision)throw Error('他の変更がありました。写真一覧を読み直してください。');
  const annotations=validateAnnotations(payload.annotations);
  const updated=await admin.from('athlete_photos').update({annotations,annotation_revision:p.annotation_revision+1}).eq('id',id).eq('member_id',member.id).eq('company_id',member.company_id).eq('annotation_revision',p.annotation_revision).select('annotation_revision').maybeSingle();
  if(updated.error||!updated.data)throw Error('他の変更がありました。写真一覧を読み直してください。');
  return json({saved:true,revision:updated.data.annotation_revision});
 }
 if(payload.action==='edit'){
  if(p.status!=='ready')throw Error('保存済みの写真を選んでください。');
  const details=photoDetailsInput(payload);
  const updated=await admin.from('athlete_photos').update({field_key:details.fieldKey,phase:details.phase,memo:details.memo}).eq('id',id).eq('member_id',member.id).eq('company_id',member.company_id);
  if(updated.error)throw Error('写真の情報を変更できませんでした。');
  return json({saved:true});
 }
 if(payload.action!=null&&payload.action!=='finish')throw Error('操作を確認できません。');
 if(p.status==='ready')return json({saved:true});
 const file=await admin.storage.from(PHOTO_BUCKET).download(p.object_path);if(file.error)throw Error('写真の送信が完了していません。再試行してください。');
 const bytes=Buffer.from(await file.data.arrayBuffer());
 if(bytes.length!==p.byte_size||!matchesImage(bytes,p.mime_type))throw Error('写真の形式を確認できません。別の写真を選んでください。');
 const metadata=await sharp(bytes,{limitInputPixels:100000000}).metadata();if(!metadata.width||!metadata.height)throw Error('写真を読み込めません。');
 const small=await thumbnail(bytes);
 const thumb=await admin.storage.from(PHOTO_BUCKET).upload(thumbnailPath(p.object_path),small,{contentType:'image/webp',upsert:true,cacheControl:'3600'});
 if(thumb.error)throw Error('一覧画像の準備に失敗しました。再試行してください。');
 const update=await admin.from('athlete_photos').update({status:'ready'}).eq('id',id).eq('company_id',member.company_id);
 if(update.error)throw Error('送信済み写真の保存確定に失敗しました。再試行してください。');
 return json({saved:true});
 }catch(e){return json({error:e.message?.includes('Input')?'写真を読み込めません。JPEG・PNG・WebPでお試しください。':e.message||'写真を保存できませんでした。'},400);}}
export async function GET(request){try{
 const q=new URL(request.url).searchParams;const {db,admin,member}=await authorized(q.get('memberId'));
 if(q.has('photoId')){
  const photoId=q.get('photoId');if(!uuid(photoId))throw Error('写真を確認できません。');
  const detail=await db.from('athlete_photos').select('id,annotations,annotation_revision').eq('id',photoId).eq('member_id',member.id).eq('company_id',member.company_id).eq('status','ready').single();
  if(detail.error||!detail.data)throw Error('写真を確認できません。');
  return json(detail.data);
 }
 const offset=Math.max(0,Math.min(100000,Math.floor(Number(q.get('offset'))||0)));
 return json(await readPhotoGallery(db,admin,member.id,{offset,recordId:q.get('recordId'),fieldKey:q.get('fieldKey'),phase:q.get('phase')}));
 }catch(e){return json({error:e.message||'写真一覧を読み込めませんでした。'},400);}}
