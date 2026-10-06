import type { ReportModel } from '#report-model'

export type ReportStory = ReportModel['stories'][number]
export type ReportVariant = ReportStory['variants'][number]
export type ReportStatus = ReportVariant['status']
export type ReportFilter =
  'all' | 'changes' | 'passed' | 'changed' | 'new' | 'deleted'
export type ReportSelection =
  | { kind: 'directory'; path: string }
  | { kind: 'component'; path: string }
  | null

export type DetailEntry = {
  story: ReportStory
  variant: ReportVariant
}

export type StoryVariantGroups = {
  changed: ReportVariant[]
  unchanged: ReportVariant[]
  initial: ReportVariant[]
}

export type DetailPosition = {
  entries: DetailEntry[]
  index: number
  navigable: boolean
}

export const detailId = (story: ReportStory, variant: ReportVariant): string =>
  story.id + '/' + variant.name

export const storyStatuses = (story: ReportStory): ReportStatus[] => [
  ...new Set(
    story.variants
      .map((variant) => variant.status)
      .filter((status) => status !== 'unchanged'),
  ),
]

const hasChanges = (statuses: ReportStatus[]): boolean => statuses.length > 0

export const countStoriesWithStatus = (
  stories: ReportStory[],
  status: ReportStatus,
): number =>
  stories.filter((story) => storyStatuses(story).includes(status)).length

export const countStoriesWithChanges = (stories: ReportStory[]): number =>
  stories.filter((story) => hasChanges(storyStatuses(story))).length

export const countPassedStories = (stories: ReportStory[]): number =>
  stories.filter((story) => !hasChanges(storyStatuses(story))).length

export const getComponentStatuses = (stories: ReportStory[]): ReportStatus[] =>
  (['changed', 'new', 'deleted'] as const).filter((status) =>
    stories.some((story) => storyStatuses(story).includes(status)),
  )

export const matchesSearch = (story: ReportStory, query: string): boolean => {
  if (!query) return true
  const text = [
    story.storyId,
    story.displayName,
    story.component,
    story.sourcePath,
    ...story.variants.map((variant) => variant.name),
  ]
    .join(' ')
    .toLowerCase()
  return text.includes(query)
}

export const normalizeSearchQuery = (query: string): string =>
  query.trim().toLowerCase()

const matchesFilter = (story: ReportStory, filter: ReportFilter): boolean => {
  const statuses = storyStatuses(story)
  switch (filter) {
    case 'all':
      return true
    case 'changes':
      return hasChanges(statuses)
    case 'passed':
      return !hasChanges(statuses)
    default:
      return statuses.includes(filter)
  }
}

const matchesSelection = (
  story: ReportStory,
  selection: ReportSelection,
): boolean => {
  if (!selection) return true
  if (selection.kind === 'component') return story.sourcePath === selection.path
  const directoryPath = story.directories.join('/')
  return (
    directoryPath === selection.path ||
    directoryPath.startsWith(selection.path + '/')
  )
}

export const getVisibleStories = (
  stories: ReportStory[],
  criteria: {
    query: string
    filter: ReportFilter
    selection: ReportSelection
  },
): ReportStory[] =>
  stories.filter(
    (story) =>
      matchesSearch(story, criteria.query) &&
      matchesFilter(story, criteria.filter) &&
      matchesSelection(story, criteria.selection),
  )

export const getStoryVariantGroups = (
  story: ReportStory,
): StoryVariantGroups => {
  const changed = story.variants.filter(
    (variant) => variant.status !== 'unchanged',
  )
  const unchanged = story.variants.filter(
    (variant) => variant.status === 'unchanged',
  )
  return {
    changed,
    unchanged,
    initial: changed.length > 0 ? changed : unchanged,
  }
}

export const createDetailEntryIndex = (
  stories: ReportStory[],
): Map<string, DetailEntry> =>
  new Map(
    stories.flatMap((story) =>
      story.variants.map(
        (variant) => [detailId(story, variant), { story, variant }] as const,
      ),
    ),
  )

export const getVisibleDetailEntries = (
  stories: ReportStory[],
  expandedStoryIds: ReadonlySet<string>,
): DetailEntry[] =>
  stories.flatMap((story) => {
    const { changed, unchanged, initial } = getStoryVariantGroups(story)
    const visibleVariants =
      changed.length === 0
        ? initial
        : expandedStoryIds.has(story.id)
          ? [...changed, ...unchanged]
          : initial
    return visibleVariants.map((variant) => ({ story, variant }))
  })

export const getDetailPosition = (
  entries: DetailEntry[],
  selectedId: string | null,
): DetailPosition => {
  const index =
    selectedId === null
      ? -1
      : entries.findIndex(
          (entry) => detailId(entry.story, entry.variant) === selectedId,
        )
  return { entries, index, navigable: entries.length >= 2 && index >= 0 }
}

export const getAdjacentDetailEntry = (
  position: DetailPosition,
  direction: -1 | 1,
): DetailEntry | undefined => {
  if (!position.navigable) return undefined
  const nextIndex =
    (position.index + direction + position.entries.length) %
    position.entries.length
  return position.entries[nextIndex]
}
