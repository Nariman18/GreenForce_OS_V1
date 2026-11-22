import type { Overlay, PropertyPreview } from '@greenforce/shared';
import { Database, Droplets, Flame, Landmark, Map as MapIcon, Waves, Zap } from 'lucide-react';
import { formatDateTime, formatNumber } from '@/lib/format';
import { Badge, type BadgeTone } from './ui/badge';
import { Fact } from './ui/card';

const OVERLAY_STYLE: Record<Overlay['category'], { tone: BadgeTone; Icon: typeof Flame }> = {
  wildfire: { tone: 'danger', Icon: Flame },
  flood: { tone: 'info', Icon: Droplets },
  coastal: { tone: 'info', Icon: Waves },
  heritage: { tone: 'progress', Icon: Landmark },
  planning: { tone: 'neutral', Icon: MapIcon },
  environmental: { tone: 'warning', Icon: MapIcon },
  utility: { tone: 'brand', Icon: Zap },
};

export function OverlayList({ overlays }: { overlays: Overlay[] }) {
  if (!overlays.length) return <p className="text-sm text-muted">No geographic overlays on this parcel.</p>;
  return (
    <ul className="space-y-2">
      {overlays.map((overlay) => {
        const { tone, Icon } = OVERLAY_STYLE[overlay.category];
        return (
          <li key={overlay.code} className="flex flex-wrap items-start gap-2 text-sm">
            <Badge tone={tone} icon={<Icon className="size-3.5" aria-hidden />}>
              {overlay.category}
            </Badge>
            <div className="min-w-0 flex-1">
              <p className="font-medium">{overlay.name}</p>
              <p className="text-xs text-muted">
                {overlay.source}
                {overlay.note ? ` · ${overlay.note}` : ''}
              </p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

/** Jurisdiction-specific property intelligence (brief §2). */
export function PropertyFacts({ property }: { property: Pick<PropertyPreview, 'data' | 'parcelId'> }) {
  const { data } = property;
  if (data.jurisdiction === 'DK') {
    return (
      <dl className="grid grid-cols-2 gap-x-6 gap-y-4 lg:grid-cols-3">
        <Fact label="BBR use" value={`${data.bbrUseCode} · ${data.bbrUseText}`} />
        <Fact label="Year built" value={data.yearBuilt ?? 'Not built'} />
        <Fact
          label="Building area"
          value={data.buildingAreaM2 ? `${formatNumber(data.buildingAreaM2)} m²` : '—'}
        />
        <Fact label="Plot area" value={`${formatNumber(data.plotAreaM2)} m²`} />
        <Fact label="Heating" value={data.heating ?? '—'} />
        <Fact label="Storeys / units" value={`${data.storeys ?? '—'} / ${data.dwellingUnits ?? '—'}`} />
        <Fact label="Cadastral parcel" value={data.cadastralParcel} />
        <Fact label="BFE number" value={data.bfeNumber} mono />
        <Fact label="Municipality" value={`${data.municipality} (${data.municipalityCode})`} />
        <Fact label="Building authority" value={data.authority} />
        <Fact label="Funding route" value={data.fundingRoute} />
      </dl>
    );
  }
  return (
    <dl className="grid grid-cols-2 gap-x-6 gap-y-4 lg:grid-cols-3">
      <Fact label="Cadastral parcel" value={data.cadastralParcel} mono />
      <Fact label="Cadastral district" value={data.cadastralDistrict} />
      <Fact label="Land use" value={data.landUse} />
      <Fact label="Year built" value={data.yearBuilt ?? 'Not built'} />
      <Fact
        label="Building area"
        value={data.buildingAreaM2 === null ? '—' : `${formatNumber(data.buildingAreaM2)} m²`}
      />
      <Fact label="Plot area" value={`${formatNumber(data.plotAreaM2)} m²`} />
      <Fact label="Storeys / units" value={`${data.storeys ?? '—'} / ${data.dwellingUnits ?? '—'}`} />
      <Fact label="Heating" value={data.heating ?? '—'} />
      <Fact label="Municipality" value={data.municipality} />
      <Fact label="Federal state" value={data.federalState} />
      <Fact label="Building authority" value={data.authority} />
      <Fact label="Planning" value={data.zoning} />
      <Fact label="Funding route" value={data.fundingRoute} />
    </dl>
  );
}

export function SourceNote({ source }: { source: PropertyPreview['source'] }) {
  return (
    <p className="flex items-start gap-1.5 text-xs text-muted">
      <Database className="mt-0.5 size-3.5 shrink-0" aria-hidden />
      <span>
        Source: {source.label} · retrieved {formatDateTime(source.retrievedAt)}
        {source.isDemo && (
          <strong className="font-medium text-amber-800"> · Demo data, not a live registry lookup</strong>
        )}
      </span>
    </p>
  );
}
