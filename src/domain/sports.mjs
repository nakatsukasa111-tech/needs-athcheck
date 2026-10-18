export const sports=[['golf','ゴルフ'],['baseball','野球'],['tennis','テニス'],['soccer','サッカー'],['sprint','スプリント'],['basketball','バスケットボール'],['lacrosse','ラクロス'],['volleyball','バレーボール'],['karate','空手'],['naginata','薙刀'],['other','その他']];
export function sportInput(form){
 const sport=String(form.get('sport')??'').trim();
 if(!sport)return {};
 if(!sports.some(([id])=>id===sport))throw Error('競技を選択してください。');
 const sport_other=sport==='other'?String(form.get('sport_other')??'').trim():null;
 if(sport==='other'&&(!sport_other||sport_other.length>100))throw Error('その他の競技名を1〜100文字で入力してください。');
 const sport_role=sport==='baseball'?String(form.get('sport_role')??'batter'):null;
 if(sport_role&&!['batter','pitcher','both'].includes(sport_role))throw Error('野球の役割を選択してください。');
 const throwing_hand=String(form.get('throwing_hand')??'R'),batting_hand=String(form.get('batting_hand')??'R');
 if(!['R','L'].includes(throwing_hand)||!['R','L'].includes(batting_hand))throw Error('利き手を選択してください。');
 return {sport,sport_other,sport_role,throwing_hand,batting_hand};
}
export function initialSport(profile={}){return profile.sport==='baseball'?(profile.sport_role==='pitcher'?'baseball-pitcher':'baseball-batter'):sports.some(([key])=>key===profile.sport)&&profile.sport!=='other'?profile.sport:'golf';}
