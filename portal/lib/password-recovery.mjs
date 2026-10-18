export async function requestRecovery(db,email,site){
 email=String(email||'').trim();
 if(email.length>254||! /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))return {error:'メールアドレスを正しく入力してください。'};
 let target;try{target=new URL('/auth/password',site);if(!['https:','http:'].includes(target.protocol))throw Error();}catch{return {error:'再設定の準備ができていません。担当トレーナーへご連絡ください。'};}
 try{const {error}=await db.auth.resetPasswordForEmail(email,{redirectTo:target.href});
 if(error)return {error:error.status===429?'送信回数の上限に達しました。時間をおいて再度お試しください。':'メールを送信できませんでした。時間をおいて再度お試しください。'};
 return {success:'登録済みのメールアドレスの場合、再設定メールが届きます。迷惑メールフォルダーもご確認ください。'};
 }catch{return {error:'通信できませんでした。時間をおいて再度お試しください。'};}
}
