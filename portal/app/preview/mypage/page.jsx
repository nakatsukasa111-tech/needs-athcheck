import MemberHome from '../../components/member-home';
const records=[{id:'sample-1',measured_on:'2026-10-18',public_comment:'今回の測定結果とエクササイズをご確認ください。'},{id:'sample-2',measured_on:'2026-09-20',public_comment:'前回の測定記録'},{id:'sample-3',measured_on:'2026-08-23',public_comment:'初回の測定記録'}];
export default function PreviewMember(){return <MemberHome names={['デモ会員（架空）']} records={records} linked preview/>;}
