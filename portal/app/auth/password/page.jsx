import { requireUser } from '../../../lib/supabase';
import { PasswordForm } from './form';
export const dynamic = 'force-dynamic';
export default async function PasswordPage() {
  await requireUser();
  return <section className="card login"><h1>マイページの利用を始める</h1><p>次回から使うパスワードを設定してください。</p><PasswordForm/></section>;
}
