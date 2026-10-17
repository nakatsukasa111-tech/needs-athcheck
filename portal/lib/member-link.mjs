// Server-side orchestration. All privileged operations follow an admin check.
export async function memberAdmin(db,userId,memberId){
 const m=await db.from('athlete_members').select('id,company_id').eq('id',memberId).eq('active',true).maybeSingle();
 if(m.error||!m.data)throw Error('会員を確認できませんでした。');
 const s=await db.from('athlete_staff').select('role').eq('user_id',userId).eq('company_id',m.data.company_id).eq('active',true).maybeSingle();
 if(s.error||s.data?.role!=='admin')throw Error('管理者のみマイページ連携を変更できます。');
 return m.data;
}
export async function findAccount(admin,email){
 for(let page=1;page<=50;page++){
  const {data,error}=await admin.auth.admin.listUsers({page,perPage:200});
  if(error)throw Error('アカウントを確認できませんでした。');
  const found=data.users.find(u=>u.email?.toLowerCase()===email);if(found)return found;
  if(data.users.length<200)return null;
 }
 throw Error('アカウントを確認できませんでした。');
}
export async function revokeMemberLink(db,admin,userId,memberId){
 const member=await memberAdmin(db,userId,memberId);
 // Cancel invitations first; then disable access, including any claim that
 // completed while cancellation waited for the invitation row lock.
 const invitations=await admin.from('athlete_invitations').delete().eq('member_id',memberId).eq('company_id',member.company_id);
 if(invitations.error)throw Error('招待を取り消せませんでした。再度お試しください。');
 const access=await admin.from('athlete_member_access').update({active:false}).eq('member_id',memberId).eq('company_id',member.company_id);
 if(access.error)throw Error('連携を解除できませんでした。再度お試しください。');
 return member;
}
export async function readMemberLink(admin,member){
 const [a,i]=await Promise.all([
  admin.from('athlete_member_access').select('user_id,active').eq('member_id',member.id).eq('company_id',member.company_id).maybeSingle(),
  admin.from('athlete_invitations').select('id,email,accepted_at,expires_at').eq('member_id',member.id).eq('company_id',member.company_id).maybeSingle()
 ]);
 if(a.error||i.error)throw Error('マイページ連携の状態を読み込めませんでした。');
 let email='';
 if(a.data?.active){const u=await admin.auth.admin.getUserById(a.data.user_id);if(u.error)throw Error('連携アカウントを確認できませんでした。');email=u.data.user.email||'';}
 return {active:!!a.data?.active,email,pending:!!i.data&&!i.data.accepted_at,invitation:!!i.data,inviteEmail:i.data?.email||'',expires:i.data?.expires_at||''};
}
