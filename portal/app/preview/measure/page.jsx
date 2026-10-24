import PreviewMeasure from './preview-measure';
import settings from '../../../lib/preview-scoring-settings.json';
import {todayJapan} from '../../../lib/measurement-input.mjs';
export const dynamic='force-dynamic';
export default function Page(){return <PreviewMeasure settings={settings} today={todayJapan()}/>;}
