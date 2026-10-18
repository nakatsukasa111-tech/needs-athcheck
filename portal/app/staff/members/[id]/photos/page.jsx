import Link from 'next/link';
import {staffMember} from '../../../../../lib/staff';
import {PhotoGallery} from '../../../photo-panel';
export const dynamic='force-dynamic';
export default async function Photos({params,searchParams}){const {id}=await params;const {member}=await staffMember(id);const query=await searchParams;return <><Link href={'/staff/members/'+id}>会員の測定履歴へ</Link><h1>{member.display_name}さんの写真</h1><PhotoGallery memberId={id} recordId={query.record||undefined}/></>;}
