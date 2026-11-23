import { getIndicators } from '@/lib/indicators/data';
import { IndicatorSection } from './IndicatorSection';
import { seriesId } from '@/lib/indicators/series';
export async function RecommendationIndicators({publicId}:{publicId:string}) {
  try {
    const recent=await getIndicators(publicId);
    // A recommendation with only old measurements must still show its real chart.
    const allHistory=recent.has_older && recent.latest.some(latest=>!recent.values.some(value=>seriesId(value)===seriesId(latest)));
    return <IndicatorSection publicId={publicId} initial={allHistory?await getIndicators(publicId,true):recent} initialAllHistory={allHistory}/>;
  }
  catch { return <IndicatorSection publicId={publicId} initial={null} initialError/>; }
}
