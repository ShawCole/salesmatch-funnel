import { useMemo } from 'react';
import { useFilters } from '../../contexts/FilterContext';
import { useRenderPerf } from '../../hooks/useRenderPerf';
import { FloatingCard } from './FloatingCard';
import { HorizontalBar } from '../charts/HorizontalBar';
import { reshapeCities } from '../../utils/aggregation';

export function TopCitiesCard({ onClose, compact }: { onClose?: () => void; compact?: boolean }) {
  useRenderPerf('TopCitiesCard');
  const { apiData } = useFilters();
  const data = useMemo(
    () => apiData ? reshapeCities(apiData.aggregations.top_cities, 10) : [],
    [apiData],
  );

  return (
    <FloatingCard title="Top Cities" className="w-[340px]" noPadding onClose={onClose}>
      <HorizontalBar data={data} color="#10b981" height={compact ? 225 : 240} yAxisWidth={130} compact={compact} />
    </FloatingCard>
  );
}
