import Link from 'next/link';
import { randomUUID } from 'node:crypto';
import { staffMember } from '../../../../../lib/staff';
import { todayJapan } from '../../../../../lib/measurement-input.mjs';
import {canFillDemo} from '../../../../../lib/demo-measurement.mjs';
import { MeasurementForm } from '../../../forms';
export const dynamic='force-dynamic';
export default async function Measure({params}){
  const {id}=await params;const {member}=await staffMember(id);
  return <><Link href={`/staff/members/${id}`}>会員の測定履歴へ</Link><h1>{member.display_name}さんの測定</h1><MeasurementForm demoEnabled={canFillDemo(member)} memberId={id} recordId={randomUUID()} today={todayJapan()}/></>;
}
