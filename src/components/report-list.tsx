import { Button } from '@fohte/ui/button'
import { Chip } from '@fohte/ui/chip'
import { Panel } from '@fohte/ui/panel'
import { ChevronDownIcon, ChevronUpIcon } from 'lucide-react'

import {
  getStoryVariantGroups,
  getVisibleVariants,
  type ReportStoryView,
  type ReportVariantView,
  storyStatuses,
} from '#report-logic'
import { Comparison } from '#vrt-components/comparison'
import type { ReportViewMode } from '#vrt-components/report-header'

export type ReportListProps = {
  stories: ReportStoryView[]
  viewMode: ReportViewMode
  expandedStoryIds: string[]
  onExpandedStoryChange: (storyId: string, expanded: boolean) => void
  onOpenDetail?: (story: ReportStoryView, variant: ReportVariantView) => void
}

const statusTone = {
  changed: 'strong',
  new: 'muted',
  deleted: 'muted',
  unchanged: 'faint',
} as const

export function ReportList({
  stories,
  viewMode,
  expandedStoryIds,
  onExpandedStoryChange,
  onOpenDetail,
}: ReportListProps) {
  return (
    <main className="min-w-0 px-4 py-5 sm:px-6">
      <div className="mb-4 flex items-center justify-between gap-4">
        <h1 className="text-lg font-semibold text-foreground">Stories</h1>
        <p
          role="status"
          aria-live="polite"
          className="text-sm text-muted-foreground"
        >
          {stories.length} {stories.length === 1 ? 'story' : 'stories'}
        </p>
      </div>

      <section aria-label="Stories">
        {stories.length === 0 ? (
          <Panel className="flex min-h-32 items-center justify-center text-sm text-muted-foreground">
            No stories match this filter.
          </Panel>
        ) : (
          <div className="space-y-4">
            {stories.map((story) => {
              const { changed, unchanged, initial } =
                getStoryVariantGroups(story)
              const expanded = expandedStoryIds.includes(story.id)
              const visibleVariants = getVisibleVariants(
                { changed, unchanged, initial },
                expanded,
              )
              const label = story.displayName ?? story.storyId

              return (
                <article key={story.id} className="min-w-0">
                  <Panel padding="md" className="min-w-0 space-y-4 bg-card">
                    <header className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2">
                      <div className="flex flex-wrap items-center gap-1.5">
                        {storyStatuses(story).map((status) => (
                          <Chip key={status} tone={statusTone[status]}>
                            {status}
                          </Chip>
                        ))}
                      </div>
                      <h2 className="min-w-0 flex-1 truncate text-base font-semibold text-foreground">
                        {label}
                      </h2>
                      <span className="font-mono text-xs text-muted-foreground">
                        {story.component}
                      </span>
                    </header>

                    <div className="grid min-w-0 gap-5 2xl:grid-cols-2">
                      {visibleVariants.map((variant) => (
                        <Comparison
                          key={variant.name}
                          variant={variant}
                          storyLabel={`${story.component} / ${label}`}
                          mode={viewMode}
                          onOpenDetail={
                            onOpenDetail === undefined
                              ? undefined
                              : () => {
                                  onOpenDetail(story, variant)
                                }
                          }
                        />
                      ))}
                    </div>

                    {changed.length > 0 && unchanged.length > 0 && (
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        aria-expanded={expanded}
                        onClick={() => {
                          onExpandedStoryChange(story.id, !expanded)
                        }}
                      >
                        {expanded ? (
                          <ChevronUpIcon aria-hidden="true" />
                        ) : (
                          <ChevronDownIcon aria-hidden="true" />
                        )}
                        {expanded ? 'Hide' : 'Show'} {unchanged.length}{' '}
                        unchanged{' '}
                        {unchanged.length === 1 ? 'variant' : 'variants'}
                      </Button>
                    )}
                  </Panel>
                </article>
              )
            })}
          </div>
        )}
      </section>
    </main>
  )
}
