'use server';
import {revalidatePath} from 'next/cache';
import { requireUser } from '../../lib/supabase';
import { adminClient } from '../../lib/admin';
import {memberAdmin,findAccount,revokeMemberLink} from '../../lib/member-link.mjs';
function refresh(id){revalidatePath('/staff');revalidatePath('/staff/members/'+id);revalidatePath('/mypage');revalidatePath('/');}
export async function unlinkMember(previous,form){
 const {db,user}=await requireUser();const id=String(form.get('memberId')??'');
 try{await revokeMemberLink(db,adminClient(),user.id,id);refresh(id);return {success:'マイページ連携と招待を解除しました。会員情報・測定履歴は残っています。'};}
 catch(e){return {error:e.message};}
}
export async function inviteMember(previous,form){
 const {db,user}=await requireUser();const memberId=String(form.get('memberId')??'');
 const email=String(form.get('email')??'').trim().toLowerCase();
 if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||email.length>254)return {error:'メールアドレスをご確認ください。'};
 try{
  const member=await memberAdmin(db,user.id,memberId),admin=adminClient();
  const bound=await admin.from('athlete_member_access').select('user_id,active').eq('member_id',memberId).eq('company_id',member.company_id).maybeSingle();
  if(bound.error)throw Error('連携状態を確認できません。');
  if(bound.data?.active)throw Error('この会員は連携済みです。変更する場合は先に解除してください。');
  const existing=await findAccount(admin,email);
  if(existing){
   if(!existing.email_confirmed_at)throw Error('このメールアドレスは登録途中です。先に招待メールからメール確認を完了してください。');
   const other=await admin.from('athlete_member_access').select('member_id').eq('user_id',existing.id).eq('company_id',member.company_id).eq('active',true);
   if(other.error)throw Error('既存の連携を確認できません。');
   if(other.data.some(a=>a.member_id!==memberId))throw Error('このメールアドレスは別の会員と連携中です。先にその会員のマイページ連携を解除してください。');
   const cancelled=await admin.from('athlete_invitations').delete().eq('member_id',memberId).eq('company_id',member.company_id);
   if(cancelled.error)throw Error('以前の招待を取り消せませんでした。');
   // Replacing an inactive association preserves the member and measurements.
   const linked=await admin.from('athlete_member_access').upsert({member_id:memberId,company_id:member.company_id,user_id:existing.id,active:true},{onConflict:'member_id'});
   if(linked.error)throw Error('マイページ連携を登録できませんでした。');
   refresh(memberId);return {success:'登録済みアカウントと連携しました。同じメールアドレスとパスワードでマイページにログインできます。メールは送信していません。'};
  }
  if(!process.env.SITE_URL)throw Error('招待の設定が完了していません。');
  const pending=await db.from('athlete_invitations').insert({company_id:member.company_id,member_id:memberId,email}).select('id').single();
  if(pending.error)throw Error('招待済みです。再招待する場合は、先に招待を取り消してください。');
  // A previously deactivated row must not block the verified invitation claim.
  const cleared=await admin.from('athlete_member_access').delete().eq('member_id',memberId).eq('company_id',member.company_id).eq('active',false);
  if(cleared.error){await db.from('athlete_invitations').delete().eq('id',pending.data.id);throw Error('以前の連携を整理できませんでした。');}
  const {error}=await admin.auth.admin.inviteUserByEmail(email,{redirectTo:new URL('/auth/password',process.env.SITE_URL).href});
  if(error){await db.from('athlete_invitations').delete().eq('id',pending.data.id);throw Error('招待を送信できませんでした。時間をおいて再度お試しください。');}
  refresh(memberId);return {success:'招待メールを送信しました。'};
 }catch(e){return {error:e.message};}
}
