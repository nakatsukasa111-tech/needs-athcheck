'use client';
import { useActionState } from 'react';
import { inviteMember } from './invite-actions';
export function InviteForm({ memberId }) {
  const [state, action, pending] = useActionState(inviteMember, {});
  return <form action={action}><input type="hidden" name="memberId" value={memberId}/>
    <label htmlFor={`invite-${memberId}`}>本人のメールアドレス</label><input id={`invite-${memberId}`} name="email" type="email" required/>
    <button disabled={pending || Boolean(state.success)}>{pending ? '送信しています…' : 'マイページへ招待'}</button>
    {state.error && <p role="alert" className="error">{state.error}</p>}{state.success && <p role="status">{state.success}</p>}
  </form>;
}
