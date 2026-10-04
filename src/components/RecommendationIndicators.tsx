import { getIndicators } from '@/lib/indicators/data';
import { IndicatorSection } from './IndicatorSection';
export async function RecommendationIndicators({publicId}:{publicId:string}) {
  try { return <IndicatorSection publicId={publicId} initial={await getIndicators(publicId)}/>; }
  catch { return <IndicatorSection publicId={publicId} initial={null} initialError/>; }
}
