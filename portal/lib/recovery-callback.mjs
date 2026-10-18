export async function acceptRecoveryFragment(auth,hash,clear){
 const p=new URLSearchParams(hash.replace(/^#/,''));
 if(hash)clear();
 if(p.has('error')||p.has('error_code'))return false;
 const access_token=p.get('access_token'),refresh_token=p.get('refresh_token');
 if(access_token||refresh_token){
  if(!access_token||!refresh_token||!['recovery','invite'].includes(p.get('type')))return false;
  const {error}=await auth.setSession({access_token,refresh_token});
  if(error)return false;
 }
 const {data,error}=await auth.getUser();
 return !error&&!!data?.user;
}
