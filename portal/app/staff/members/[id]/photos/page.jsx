import Link from 'next/link';
import {adminClient} from '../../../../../lib/admin';
import {readPhotoGallery} from '../../../../../lib/photo-gallery';
import {staffMember} from '../../../../../lib/staff';
import {PhotoGallery} from '../../../photo-panel';
export const dynamic='force-dynamic';
export default async function Photos({params,searchParams}){const {id}=await params;const {db,member}=await staffMember(id);const query=await searchParams;let initial;try{initial=await readPhotoGallery(db,adminClient(),id,{recordId:query.record});}catch{/* Client retry keeps the page usable after a transient storage failure. */}return <><Link href={'/staff/members/'+id}>会員の測定履歴へ</Link><h1>{member.display_name}さんの写真</h1><PhotoGallery initial={initial} memberId={id} recordId={query.record||undefined}/></>;}
