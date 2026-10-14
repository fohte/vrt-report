import { Button } from '@fohte/ui/button'
import { SegmentedControl } from '@fohte/ui/segmented-control'

import {
  countPassedStories,
  countStoriesWithChanges,
  countStoriesWithStatus,
  type ReportFilter,
  type ReportStoryView,
} from '#report-logic'

export type ReportViewMode = 'pair' | 'diff' | 'slider'

export type ReportHeaderProps = {
  filter: ReportFilter
  stories: ReportStoryView[]
  viewMode: ReportViewMode
  onFilterChange: (filter: ReportFilter) => void
  onViewModeChange: (viewMode: ReportViewMode) => void
}

const viewModeOptions: { value: ReportViewMode; label: string }[] = [
  { value: 'pair', label: 'Before + After' },
  { value: 'diff', label: 'Diff' },
  { value: 'slider', label: 'Slider' },
]

const countTone: Record<ReportFilter, string> = {
  all: 'text-muted-foreground',
  changes: 'text-foreground',
  changed: 'text-tint-orange-foreground',
  new: 'text-tint-green-foreground',
  deleted: 'text-destructive',
  passed: 'text-muted-foreground',
}

export function ReportHeader({
  filter,
  stories,
  viewMode,
  onFilterChange,
  onViewModeChange,
}: ReportHeaderProps) {
  const filters: { value: ReportFilter; label: string; count: number }[] = [
    {
      value: 'changes',
      label: 'Changes',
      count: countStoriesWithChanges(stories),
    },
    { value: 'all', label: 'All', count: stories.length },
    {
      value: 'changed',
      label: 'Changed',
      count: countStoriesWithStatus(stories, 'changed'),
    },
    {
      value: 'new',
      label: 'New',
      count: countStoriesWithStatus(stories, 'new'),
    },
    {
      value: 'deleted',
      label: 'Deleted',
      count: countStoriesWithStatus(stories, 'deleted'),
    },
    { value: 'passed', label: 'Passed', count: countPassedStories(stories) },
  ]

  return (
    <header className="sticky top-0 z-20 flex min-h-16 flex-col gap-3 border-b border-border bg-background/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/80 lg:flex-row lg:items-center lg:gap-6">
      <div className="flex shrink-0 items-baseline gap-3">
        <strong className="font-mono text-base font-semibold tracking-wider text-foreground">
          VRT
        </strong>
        <span className="text-sm text-muted-foreground">
          Visual regression report
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 lg:ml-auto">
        <div
          role="group"
          aria-label="Filter stories"
          className="flex flex-wrap items-center gap-1.5"
        >
          {filters.map((option) => (
            <Button
              key={option.value}
              type="button"
              variant="secondary"
              size="sm"
              aria-label={`${option.label}, ${String(option.count)} ${option.count === 1 ? 'story' : 'stories'}`}
              aria-pressed={filter === option.value}
              onClick={() => {
                onFilterChange(option.value)
              }}
              className={`gap-1.5 ${filter === option.value ? 'border-primary bg-primary/5 text-primary' : ''}`}
            >
              <span>{option.label}</span>
              <span
                className={`font-mono text-[0.65rem] ${countTone[option.value]}`}
              >
                {option.count}
              </span>
            </Button>
          ))}
        </div>

        <SegmentedControl
          aria-label="Image comparison mode"
          value={viewMode}
          options={viewModeOptions}
          onValueChange={onViewModeChange}
        />
      </div>
    </header>
  )
}
