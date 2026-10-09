import { useState } from 'react'

import {
  type ComparisonVariant,
  hasDiffMarkers,
  type ImageLabel,
} from '#vrt-components/comparison-model'

export type ComparisonImageProps = {
  label: ImageLabel
  source: string | null
  storyLabel: string
  variant: ComparisonVariant
  loading?: 'eager' | 'lazy'
  detail?: boolean
  markersVisible?: boolean
  markerOnly?: boolean
  position?: 'relative' | 'absolute'
  className?: string
}

function DifferenceMarkers({ variant }: { variant: ComparisonVariant }) {
  const regions = variant.diffRegions
  if (!hasDiffMarkers(variant) || regions === null || regions === undefined)
    return null

  return (
    <svg
      viewBox={`0 0 ${String(regions.width)} ${String(regions.height)}`}
      preserveAspectRatio="xMidYMid meet"
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 size-full"
    >
      {regions.rectangles.map((rectangle) => (
        <rect
          key={[rectangle.x, rectangle.y, rectangle.width, rectangle.height]
            .map(String)
            .join('-')}
          {...rectangle}
          fill="var(--color-primary)"
          fillOpacity="0.2"
          stroke="var(--color-primary)"
          strokeWidth="2"
        />
      ))}
    </svg>
  )
}

export function ComparisonImage({
  label,
  source,
  storyLabel,
  variant,
  loading = 'lazy',
  detail = false,
  markersVisible = false,
  markerOnly = false,
  position = 'relative',
  className,
}: ComparisonImageProps) {
  const [failedSource, setFailedSource] = useState<string | null>(null)
  const failed = source !== null && failedSource === source

  return (
    <span
      className={`${position} flex aspect-video w-full items-center justify-center overflow-hidden ${markerOnly ? 'bg-transparent' : 'bg-muted'} ${className ?? ''}`}
    >
      {!markerOnly && source !== null && (
        <img
          src={source}
          alt={`${label}: ${storyLabel}`}
          loading={loading}
          draggable={false}
          onError={() => {
            setFailedSource(source)
          }}
          className={`size-full object-contain ${failed ? 'hidden' : ''}`}
        />
      )}
      {!markerOnly && (source === null || failed) && (
        <span className="px-4 text-center font-mono text-xs text-muted-foreground">
          {label === 'Diff' ? 'Diff unavailable' : 'Image unavailable'}
        </span>
      )}
      {detail && markersVisible && <DifferenceMarkers variant={variant} />}
    </span>
  )
}
