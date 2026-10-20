import 'server-only';
import {PHOTO_BUCKET,uuid} from './photo-input.mjs';
import {thumbnailPath} from './photo-thumbnail.mjs';
import {photoLayout} from './photo-layout.mjs';
export async function readPhotoGallery(db,admin,memberId,{offset=0,recordId}={}){
 if(recordId&&!uuid(recordId))throw Error('測定を確認できません。');
 let query=db.from('athlete_photo_sessions').select('id,created_at,photo_layout,layout_revision').eq('member_id',memberId).order('created_at').order('id');
 query=recordId?query.eq('id',recordId):query.range(offset,offset+5);
 const sessions=await query;if(sessions.error)throw Error('写真一覧を読み込めませんでした。');
 const shown=sessions.data.slice(0,recordId?1:5);
 if(!shown.length)return {photos:[],groups:[],hasMore:false,loadedAt:Date.now()};
 const result=await db.from('athlete_photos').select('id,session_id,field_key,phase,memo,source,captured_at,uploaded_at,status,deleted_at,annotation_revision,object_path,preview_path').eq('member_id',memberId).eq('status','ready').in('session_id',shown.map(s=>s.id)).order('uploaded_at').limit(1000);
 if(result.error)throw Error('写真一覧を読み込めませんでした。');
 if(result.data.length>=1000)throw Error('写真が多いため、測定記録を指定して開いてください。');
 const paths=result.data.flatMap(p=>[p.object_path,p.preview_path||thumbnailPath(p.object_path)]);
 const signed=paths.length?await admin.storage.from(PHOTO_BUCKET).createSignedUrls(paths,300):{data:[],error:null};
 if(signed.error)throw Error('写真を読み込めませんでした。');
 const photos=result.data.map((p,i)=>{const {object_path,preview_path,...rest}=p;return {...rest,url:signed.data[i*2]?.signedUrl??null,thumbnailUrl:signed.data[i*2+1]?.signedUrl??null};});
 return {photos,groups:shown.map(s=>({id:s.id,created_at:s.created_at,revision:s.layout_revision,layout:photoLayout(s.photo_layout,result.data.filter(p=>p.session_id===s.id))})),hasMore:!recordId&&sessions.data.length>5,nextOffset:offset+shown.length,loadedAt:Date.now()};
}
