import 'server-only';
import {photoLayout} from './photo-layout.mjs';
export async function readBoard(admin,member,sessionId){
 const [session,photos]=await Promise.all([
  admin.from('athlete_photo_sessions').select('id,photo_layout,layout_revision,created_at').eq('id',sessionId).eq('company_id',member.company_id).eq('member_id',member.id).single(),
  admin.from('athlete_photos').select('*').eq('session_id',sessionId).eq('company_id',member.company_id).eq('member_id',member.id).order('uploaded_at').limit(1000)
 ]);
 if(session.error||photos.error||!session.data)throw Error('写真を確認できません。');
 if(photos.data.length>=1000)throw Error('この測定の写真が多すぎます。別の測定記録を使用してください。');
 return {...session.data,photos:photos.data,layout:photoLayout(session.data.photo_layout,photos.data)};
}
export async function commitBoard(admin,member,board,layout,changes){
 const result=await admin.rpc('commit_athlete_photo_board',{p_session:board.id,p_company:member.company_id,p_member:member.id,p_revision:board.layout_revision,p_layout:layout,p_changes:changes});
 if(result.error){const error=Error(result.error.message.includes('CONFLICT')?'他の変更がありました。写真を読み直してから再度お試しください。':'写真を保存できませんでした。');error.conflict=result.error.message.includes('CONFLICT');throw error;}
 return result.data;
}
