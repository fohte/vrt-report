import { useEffect, useMemo, useRef, useState } from 'react'

import {
  createDetailEntryIndex,
  detailId as createDetailId,
  getAdjacentDetailEntry,
  getDetailPosition,
  getVisibleDetailEntries,
  getVisibleStories,
  normalizeSearchQuery,
  type ReportFilter,
  type ReportSelection,
  type ReportStoryView,
} from '#report-logic'
import { hasDiffMarkers } from '#vrt-components/comparison-model'
import type { DetailComparisonMode } from '#vrt-components/report-detail'
import { ReportDetail } from '#vrt-components/report-detail'
import {
  ReportHeader,
  type ReportViewMode,
} from '#vrt-components/report-header'
import { ReportList } from '#vrt-components/report-list'
import { ReportSidebar } from '#vrt-components/report-sidebar'

export type ReportAppProps = {
  stories: ReportStoryView[]
  initialDetailId?: string | undefined
  initialFilter?: ReportFilter | undefined
  initialViewMode?: ReportViewMode | undefined
  initialDetailMode?: DetailComparisonMode | undefined
  initialMarkersVisible?: boolean | undefined
}

const currentHistoryState = (): Record<string, unknown> => {
  const current: unknown = window.history.state
  return current !== null &&
    typeof current === 'object' &&
    !Array.isArray(current)
    ? { ...current }
    : {}
}

const updateDetailUrl = (id: string, method: 'push' | 'replace') => {
  const url = new URL(window.location.href)
  url.searchParams.set('id', id)
  const historyState = currentHistoryState()
  historyState['vrtReportDetailEntry'] = true
  historyState['vrtReportDetailId'] = id
  if (method === 'push') window.history.pushState(historyState, '', url)
  else window.history.replaceState(historyState, '', url)
}

const clearDetailUrl = () => {
  const url = new URL(window.location.href)
  url.searchParams.delete('id')
  const historyState = currentHistoryState()
  delete historyState['vrtReportDetailEntry']
  delete historyState['vrtReportDetailId']
  window.history.replaceState(historyState, '', url)
}

const isEditingTarget = (
  target: EventTarget | null,
  includeToggles: boolean,
) => {
  if (!(target instanceof Element)) return false
  const selector = includeToggles
    ? 'input, textarea, select, [contenteditable="true"]'
    : 'input:not([type="range"]):not([type="checkbox"]), textarea, select, [contenteditable="true"]'
  return target.closest(selector) !== null
}

export function ReportApp({
  stories,
  initialDetailId,
  initialFilter = 'changes',
  initialViewMode = 'pair',
  initialDetailMode = 'slide',
  initialMarkersVisible = false,
}: ReportAppProps) {
  const detailEntries = useMemo(
    () => createDetailEntryIndex(stories),
    [stories],
  )
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<ReportFilter>(initialFilter)
  const [viewMode, setViewMode] = useState<ReportViewMode>(initialViewMode)
  const [selection, setSelection] = useState<ReportSelection>(null)
  const [expandedStoryIds, setExpandedStoryIds] = useState<string[]>([])
  const [detailMode, setDetailMode] =
    useState<DetailComparisonMode>(initialDetailMode)
  const [markersVisible, setMarkersVisible] = useState(initialMarkersVisible)
  const [activeDetailId, setActiveDetailId] = useState<string | null>(() => {
    if (initialDetailId !== undefined) return initialDetailId
    return new URL(window.location.href).searchParams.get('id')
  })
  const initializedFromLocation = useRef(initialDetailId === undefined)
  const openingElement = useRef<HTMLElement | null>(null)

  const matchingStories = useMemo(
    () =>
      getVisibleStories(stories, {
        query: normalizeSearchQuery(query),
        filter,
        selection: null,
      }),
    [filter, query, stories],
  )
  const visibleStories = useMemo(
    () =>
      getVisibleStories(stories, {
        query: normalizeSearchQuery(query),
        filter,
        selection,
      }),
    [filter, query, selection, stories],
  )
  const visibleDetailEntries = useMemo(
    () => getVisibleDetailEntries(visibleStories, new Set(expandedStoryIds)),
    [expandedStoryIds, visibleStories],
  )
  const detailPosition = useMemo(
    () => getDetailPosition(visibleDetailEntries, activeDetailId),
    [activeDetailId, visibleDetailEntries],
  )
  const detailEntry =
    activeDetailId === null ? undefined : detailEntries.get(activeDetailId)
  const selectedDetailId =
    detailEntry === undefined
      ? null
      : createDetailId(detailEntry.story, detailEntry.variant)
  const positionLabel =
    detailPosition.index < 0
      ? `0 / ${String(detailPosition.entries.length)}`
      : `${String(detailPosition.index + 1)} / ${String(detailPosition.entries.length)}`

  useEffect(() => {
    if (detailEntry !== undefined) return
    const element = openingElement.current
    if (element === null) return
    openingElement.current = null
    const frame = window.requestAnimationFrame(() => {
      if (element.isConnected) element.focus()
    })
    return () => {
      window.cancelAnimationFrame(frame)
    }
  }, [detailEntry])

  useEffect(() => {
    if (!initializedFromLocation.current) return
    initializedFromLocation.current = false

    const id = new URL(window.location.href).searchParams.get('id')
    if (id === null) return
    if (!detailEntries.has(id)) {
      clearDetailUrl()
      setActiveDetailId(null)
      return
    }

    const state = currentHistoryState()
    if (
      state['vrtReportDetailEntry'] !== true ||
      state['vrtReportDetailId'] !== id
    ) {
      clearDetailUrl()
      updateDetailUrl(id, 'push')
    }
  }, [detailEntries])

  useEffect(() => {
    const syncDetailFromLocation = () => {
      const id = new URL(window.location.href).searchParams.get('id')
      if (id === null) {
        setActiveDetailId(null)
        return
      }
      if (!detailEntries.has(id)) {
        clearDetailUrl()
        setActiveDetailId(null)
        return
      }
      setActiveDetailId(id)
    }

    window.addEventListener('popstate', syncDetailFromLocation)
    return () => {
      window.removeEventListener('popstate', syncDetailFromLocation)
    }
  }, [detailEntries])

  const closeDetail = () => {
    if (activeDetailId === null) return
    const state = currentHistoryState()
    const urlId = new URL(window.location.href).searchParams.get('id')
    if (
      state['vrtReportDetailEntry'] === true &&
      state['vrtReportDetailId'] === activeDetailId &&
      urlId === activeDetailId
    ) {
      window.history.back()
      return
    }
    clearDetailUrl()
    setActiveDetailId(null)
  }

  const navigateDetail = (direction: -1 | 1) => {
    const next = getAdjacentDetailEntry(detailPosition, direction)
    if (next === undefined) return
    const id = createDetailId(next.story, next.variant)
    updateDetailUrl(id, 'replace')
    setActiveDetailId(id)
  }

  useEffect(() => {
    if (detailEntry === undefined || selectedDetailId === null) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        event.defaultPrevented ||
        event.isComposing ||
        event.shiftKey ||
        event.altKey ||
        event.ctrlKey ||
        event.metaKey
      )
        return

      const key = event.key.toLowerCase()
      if (
        key === 'm' &&
        detailEntry.variant.status === 'changed' &&
        hasDiffMarkers(detailEntry.variant) &&
        !isEditingTarget(event.target, false) &&
        !isEditingTarget(document.activeElement, false)
      ) {
        event.preventDefault()
        setMarkersVisible((current) => !current)
        return
      }

      if (
        isEditingTarget(event.target, true) ||
        isEditingTarget(document.activeElement, true)
      )
        return

      if (key === 'arrowleft' || key === 'h') {
        event.preventDefault()
        navigateDetail(-1)
      } else if (key === 'arrowright' || key === 'l') {
        event.preventDefault()
        navigateDetail(1)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [activeDetailId, detailEntry, detailPosition, selectedDetailId])

  return (
    <div className="min-h-screen bg-background text-foreground">
      <ReportHeader
        filter={filter}
        stories={stories}
        viewMode={viewMode}
        onFilterChange={setFilter}
        onViewModeChange={setViewMode}
      />
      <div className="mx-auto w-full max-w-[1600px] md:flex">
        <ReportSidebar
          query={query}
          stories={matchingStories}
          selection={selection}
          onQueryChange={setQuery}
          onSelectionChange={setSelection}
        />
        <ReportList
          stories={visibleStories}
          viewMode={viewMode}
          expandedStoryIds={expandedStoryIds}
          onExpandedStoryChange={(storyId, expanded) => {
            setExpandedStoryIds((current) =>
              expanded
                ? current.includes(storyId)
                  ? current
                  : [...current, storyId]
                : current.filter((id) => id !== storyId),
            )
          }}
          onOpenDetail={(story, variant) => {
            const id = createDetailId(story, variant)
            if (id === activeDetailId) return
            openingElement.current =
              document.activeElement instanceof HTMLElement
                ? document.activeElement
                : null
            updateDetailUrl(id, 'push')
            setActiveDetailId(id)
          }}
        />
      </div>
      {detailEntry !== undefined && (
        <ReportDetail
          story={detailEntry.story}
          variant={detailEntry.variant}
          mode={detailMode}
          markersVisible={markersVisible}
          position={positionLabel}
          navigable={detailPosition.navigable}
          onModeChange={setDetailMode}
          onMarkersToggle={() => {
            setMarkersVisible((current) => !current)
          }}
          onPrevious={() => {
            navigateDetail(-1)
          }}
          onNext={() => {
            navigateDetail(1)
          }}
          onClose={closeDetail}
        />
      )}
    </div>
  )
}
