import 'server-only';
import {PHOTO_BUCKET,uuid} from './photo-input.mjs';
import {thumbnailPath} from './photo-thumbnail.mjs';
export async function readPhotoGallery(db,admin,memberId,{offset=0,recordId,fieldKey,phase}={}){
 if(recordId&&!uuid(recordId))throw Error('測定を確認できません。');
 let query=db.from('athlete_photos').select('id,session_id,field_key,phase,memo,source,captured_at,uploaded_at,sort_order,annotation_revision,object_path').eq('member_id',memberId).eq('status','ready').order('sort_order',{ascending:false}).order('id').range(offset,offset+23);
 if(recordId)query=query.eq('session_id',recordId);
 if(fieldKey)query=query.eq('field_key',fieldKey);
 if(phase)query=query.eq('phase',phase);
 const result=await query;if(result.error)throw Error('写真一覧を読み込めませんでした。');
 const paths=result.data.flatMap(p=>[p.object_path,thumbnailPath(p.object_path)]);
 const signed=paths.length?await admin.storage.from(PHOTO_BUCKET).createSignedUrls(paths,300):{data:[],error:null};
 if(signed.error)throw Error('写真を読み込めませんでした。');
 return {photos:result.data.map((p,i)=>{const {object_path,...rest}=p;return {...rest,url:signed.data[i*2]?.signedUrl??null,thumbnailUrl:signed.data[i*2+1]?.signedUrl??null};}),hasMore:result.data.length===24,loadedAt:Date.now()};
}
