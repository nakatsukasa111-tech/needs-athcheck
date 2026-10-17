'use client';
import { useActionState } from 'react';
import { inviteMember,unlinkMember } from './invite-actions';
export function InviteForm({memberId,link={}}){
 const [state,action,pending]=useActionState(inviteMember,{});
 const [removal,remove,removing]=useActionState(unlinkMember,{});
 const busy=pending||removing;
 return <div className="member-link"><h3>マイページ連携</h3>
  <p>{link.active?'連携済み：'+link.email:link.pending?'招待中：'+link.inviteEmail:'未連携'}</p>
  {link.pending&&<p className="muted">有効期限：{new Date(link.expires).toLocaleDateString('ja-JP',{timeZone:'Asia/Tokyo'})}</p>}
  {!link.active&&!link.pending&&<form action={action}><input type="hidden" name="memberId" value={memberId}/>
   <label htmlFor={'invite-'+memberId}>本人のメールアドレス</label><input id={'invite-'+memberId} name="email" type="email" required/>
   <p className="muted">登録済みのメールアドレスは、そのアカウントへ連携します。新規の場合は招待メールを送信します。</p>
   <button disabled={busy}>{pending?'処理しています…':'マイページへ招待・連携'}</button>
  </form>}
  {(link.active||link.invitation)&&<form action={remove}><input type="hidden" name="memberId" value={memberId}/>
   <p className="muted">解除すると、この会員のマイページを閲覧できなくなります。会員情報・測定履歴・ログインアカウントは残ります。</p>
   <button disabled={busy}>{removing?'解除しています…':link.active?'マイページ連携を解除':'招待を取り消す'}</button>
  </form>}
  {(state.error||removal.error)&&<p role="alert" className="error">{removal.error||state.error}</p>}
  {(removal.success||state.success)&&<p role="status">{removal.success||state.success}</p>}
 </div>;
}
