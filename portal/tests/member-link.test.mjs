import test from 'node:test';
import assert from 'node:assert/strict';
import {memberAdmin,revokeMemberLink,findAccount,readMemberLink} from '../lib/member-link.mjs';
function client(responses,log=[]){return {from(table){const call={table,filters:[]};log.push(call);const q={select(){return q},eq(k,v){call.filters.push([k,v]);return q},delete(){call.action='delete';return q},update(value){call.action='update';call.value=value;return q},maybeSingle(){return Promise.resolve(responses[table])},then(resolve,reject){return Promise.resolve(responses[table]).then(resolve,reject)}};return q;}}}
const member={id:'target',company_id:'company'};
test('管理者以外・他社の会員・未確認の会員は解除できず、特権操作を始めない',async()=>{
 for(const response of [{athlete_members:{data:member},athlete_staff:{data:{role:'trainer'}}},{athlete_members:{data:null}},{athlete_members:{data:member},athlete_staff:{data:null}}]){
  const log=[];await assert.rejects(revokeMemberLink(client(response),client({},log),'actor','target'));assert.equal(log.length,0);
 }
});
test('招待を先に取り消してから対象の閲覧権限だけを無効化し、会員・測定・Authを削除しない',async()=>{
 const authLog=[],log=[];const db=client({athlete_members:{data:member},athlete_staff:{data:{role:'admin'}}},authLog);
 const admin=client({athlete_invitations:{error:null},athlete_member_access:{error:null}},log);
 await revokeMemberLink(db,admin,'actor','target');
 assert.deepEqual(log.map(c=>c.table),['athlete_invitations','athlete_member_access']);
 for(const call of log)assert.deepEqual(call.filters,[['member_id','target'],['company_id','company']]);
 assert.deepEqual(log[1].value,{active:false});assert.equal(log[1].action,'update');
 assert.ok(authLog[1].filters.some(([k,v])=>k==='user_id'&&v==='actor'));
});
test('招待取消失敗を成功扱いせず、再試行できる',async()=>{
 const log=[];await assert.rejects(revokeMemberLink(client({athlete_members:{data:member},athlete_staff:{data:{role:'admin'}}}),client({athlete_invitations:{error:{}}},log),'actor','target'));
 assert.equal(log.length,1);
});
test('メール検索は別アドレスに一致せず、後続ページを調べる',async()=>{
 const admin={auth:{admin:{listUsers:async({page})=>({data:{users:page===1?Array.from({length:200},(_,i)=>({email:i+'@example.test'})):[{id:'found',email:'User@example.test',email_confirmed_at:'2026-01-01'}]}})}}};
 assert.equal((await findAccount(admin,'user@example.test')).id,'found');assert.equal(await findAccount(admin,'missing@example.test'),null);
});
test('解除済みは連携済み表示せず、保留招待と有効な連携を区別する',async()=>{
 const admin=client({athlete_member_access:{data:{active:false,user_id:'old'}},athlete_invitations:{data:{id:'invite',email:'person@example.test',accepted_at:null,expires_at:'2026-10-24'}}});
 const status=await readMemberLink(admin,member);assert.equal(status.active,false);assert.equal(status.pending,true);assert.equal(status.email,'');
});
