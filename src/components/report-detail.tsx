import { Button } from '@fohte/ui/button'
import { SegmentedControl } from '@fohte/ui/segmented-control'

import type { ReportStoryView, ReportVariantView } from '#report-logic'
import { Comparison, hasDiffMarkers } from '#vrt-components/comparison'

export type DetailComparisonMode = 'diff' | 'slide' | '2up' | 'blend' | 'toggle'

export type ReportDetailProps = {
  story: ReportStoryView
  variant: ReportVariantView
  mode: DetailComparisonMode
  markersVisible: boolean
  position: string
  navigable: boolean
  onModeChange: (mode: DetailComparisonMode) => void
  onMarkersToggle: () => void
  onPrevious: () => void
  onNext: () => void
  onClose: () => void
}

const modeOptions: { value: DetailComparisonMode; label: string }[] = [
  { value: 'diff', label: 'Diff' },
  { value: 'slide', label: 'Slide' },
  { value: '2up', label: '2-up' },
  { value: 'blend', label: 'Blend' },
  { value: 'toggle', label: 'Toggle' },
]

export function ReportDetail({
  story,
  variant,
  mode,
  markersVisible,
  position,
  navigable,
  onModeChange,
  onMarkersToggle,
  onPrevious,
  onNext,
  onClose,
}: ReportDetailProps) {
  const storyLabel = story.displayName ?? story.storyId
  const comparisonLabel = story.component
    ? `${story.component} / ${storyLabel}`
    : storyLabel

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="report-detail-title"
      className="fixed inset-0 z-50 flex h-dvh flex-col overflow-hidden bg-background text-foreground"
    >
      <header className="flex shrink-0 flex-wrap items-center gap-3 border-b border-border bg-background px-4 py-3 sm:px-6">
        <div className="min-w-0 flex-1 basis-full sm:basis-48">
          <p className="truncate text-xs text-muted-foreground">
            {comparisonLabel}
          </p>
          <h1
            id="report-detail-title"
            className="truncate text-base font-semibold"
          >
            {storyLabel}
          </h1>
          <p className="truncate text-xs text-muted-foreground">
            {variant.name} · {variant.status}
          </p>
        </div>

        {variant.status === 'changed' && (
          <SegmentedControl
            aria-label="Detail comparison mode"
            value={mode}
            options={modeOptions}
            onValueChange={onModeChange}
          />
        )}

        {hasDiffMarkers(variant) && (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            aria-pressed={markersVisible}
            aria-keyshortcuts="m"
            title="Toggle difference markers (m)"
            onClick={onMarkersToggle}
          >
            Difference markers
          </Button>
        )}

        <div
          role="group"
          aria-label="Image navigation"
          className="flex items-center gap-2"
        >
          <Button
            type="button"
            variant="secondary"
            size="sm"
            aria-label="Previous image"
            disabled={!navigable}
            onClick={onPrevious}
          >
            Prev
          </Button>
          <span
            aria-label="Image position"
            aria-live="polite"
            className="min-w-16 text-center font-mono text-xs text-muted-foreground"
          >
            {position}
          </span>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            aria-label="Next image"
            disabled={!navigable}
            onClick={onNext}
          >
            Next
          </Button>
        </div>

        <Button
          type="button"
          variant="secondary"
          size="sm"
          aria-label="Close detail"
          onClick={onClose}
        >
          Close
        </Button>
      </header>

      <main className="min-h-0 flex-1 overflow-auto p-4 sm:p-6">
        <div className="mx-auto max-w-7xl">
          <Comparison
            variant={variant}
            storyLabel={comparisonLabel}
            mode={mode}
            detail
            markersVisible={markersVisible}
          />
        </div>
      </main>
    </div>
  )
}
