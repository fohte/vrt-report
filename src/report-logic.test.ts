import { describe, expect, it } from 'vitest'

import {
  countPassedStories,
  countStoriesWithChanges,
  countStoriesWithStatus,
  createDetailEntryIndex,
  detailId,
  getAdjacentDetailEntry,
  getComponentStatuses,
  getDetailPosition,
  getStoryVariantGroups,
  getVisibleDetailEntries,
  getVisibleStories,
  matchesSearch,
  normalizeSearchQuery,
  type ReportFilter,
  type ReportStory,
  storyStatuses,
} from '#report-logic'

const createStory = (
  id: string,
  options: Partial<Omit<ReportStory, 'id'>> = {},
): ReportStory => ({
  id,
  storyId: options.storyId ?? id,
  ...(options.displayName === undefined
    ? {}
    : { displayName: options.displayName }),
  component: options.component ?? 'ExampleWidget',
  sourcePath: options.sourcePath ?? 'src/ExampleWidget.stories.tsx',
  directories: options.directories ?? ['src'],
  variants: options.variants ?? [
    { name: 'default', status: 'changed', key: id },
  ],
})

const entryIds = (
  stories: ReportStory[],
  expandedStoryIds = new Set<string>(),
) =>
  getVisibleDetailEntries(stories, expandedStoryIds).map(({ story, variant }) =>
    detailId(story, variant),
  )

const storyStatusCounts = (firstStory: ReportStory, stories: ReportStory[]) => [
  storyStatuses(firstStory),
  countStoriesWithStatus(stories, 'changed'),
  countStoriesWithStatus(stories, 'new'),
  countStoriesWithStatus(stories, 'deleted'),
  countStoriesWithChanges(stories),
  countPassedStories(stories),
  getComponentStatuses(stories),
]

const selectedStoryIds = (stories: ReportStory[]) => [
  getVisibleStories(stories, {
    query: '',
    filter: 'all',
    selection: { kind: 'directory', path: 'src/admin' },
  }).map((story) => story.id),
  getVisibleStories(stories, {
    query: '',
    filter: 'all',
    selection: {
      kind: 'component',
      path: 'src/administrator/panel.stories.tsx',
    },
  }).map((story) => story.id),
]

const visibleDetailOrderings = (stories: ReportStory[]) => [
  entryIds(stories),
  entryIds(stories, new Set(['first'])),
]

const detailNavigationState = (
  position: ReturnType<typeof getDetailPosition>,
  hiddenPosition: ReturnType<typeof getDetailPosition>,
) => [
  position.index,
  position.navigable,
  getAdjacentDetailEntry(position, -1)?.story.id,
  getAdjacentDetailEntry(position, 1)?.story.id,
  hiddenPosition.index,
  hiddenPosition.navigable,
  getAdjacentDetailEntry(hiddenPosition, 1),
]

describe('report story logic', () => {
  it('counts stories by their distinct non-unchanged statuses', () => {
    const firstStory = createStory('one', {
      variants: [
        { name: 'wide', status: 'changed', key: 'one-wide' },
        { name: 'compact', status: 'changed', key: 'one-compact' },
        { name: 'baseline', status: 'unchanged', key: 'one-baseline' },
      ],
    })
    const stories = [
      firstStory,
      createStory('two', {
        variants: [{ name: 'default', status: 'new', key: 'two-default' }],
      }),
      createStory('three', {
        variants: [
          { name: 'default', status: 'deleted', key: 'three-default' },
        ],
      }),
      createStory('four', {
        variants: [
          { name: 'default', status: 'unchanged', key: 'four-default' },
        ],
      }),
    ]

    expect(storyStatusCounts(firstStory, stories)).toEqual([
      ['changed'],
      1,
      1,
      1,
      3,
      1,
      ['changed', 'new', 'deleted'],
    ])
  })

  it('searches story identifiers, labels, component paths, and variant names', () => {
    const story = createStory('storybook/open-panel', {
      storyId: 'story-identifier-needle',
      displayName: 'display-label-needle',
      component: 'component-name-needle',
      sourcePath: 'src/source-path-needle/Story.stories.tsx',
      variants: [
        { name: 'variant-name-needle', status: 'changed', key: 'wide' },
        { name: 'compact', status: 'unchanged', key: 'compact' },
      ],
    })

    expect(
      [
        'identifier-needle',
        'label-needle',
        'component-name-needle',
        'source-path-needle',
        'variant-name-needle',
        'missing-needle',
      ].map((query) => matchesSearch(story, query)),
    ).toEqual([true, true, true, true, true, false])
  })

  it('groups changed and unchanged variants for the initial list', () => {
    const story = createStory('mixed', {
      variants: [
        { name: 'wide', status: 'changed', key: 'mixed-wide' },
        { name: 'compact', status: 'unchanged', key: 'mixed-compact' },
      ],
    })

    expect(getStoryVariantGroups(story)).toEqual({
      changed: [{ name: 'wide', status: 'changed', key: 'mixed-wide' }],
      unchanged: [
        { name: 'compact', status: 'unchanged', key: 'mixed-compact' },
      ],
      initial: [{ name: 'wide', status: 'changed', key: 'mixed-wide' }],
    })
  })

  it('trims and lowercases search input', () => {
    expect(normalizeSearchQuery('  Feature PANEL  ')).toBe('feature panel')
  })

  it('filters stories by all, change, passed, and individual statuses', () => {
    const stories = [
      createStory('changed', {
        variants: [{ name: 'main', status: 'changed', key: 'changed' }],
      }),
      createStory('new', {
        variants: [{ name: 'main', status: 'new', key: 'new' }],
      }),
      createStory('deleted', {
        variants: [{ name: 'main', status: 'deleted', key: 'deleted' }],
      }),
      createStory('passed', {
        variants: [{ name: 'main', status: 'unchanged', key: 'passed' }],
      }),
    ]
    const filters: ReportFilter[] = [
      'all',
      'changes',
      'passed',
      'changed',
      'new',
      'deleted',
    ]

    expect(
      filters.map((filter) => ({
        filter,
        stories: getVisibleStories(stories, {
          query: '',
          filter,
          selection: null,
        }).map((story) => story.id),
      })),
    ).toEqual([
      { filter: 'all', stories: ['changed', 'new', 'deleted', 'passed'] },
      { filter: 'changes', stories: ['changed', 'new', 'deleted'] },
      { filter: 'passed', stories: ['passed'] },
      { filter: 'changed', stories: ['changed'] },
      { filter: 'new', stories: ['new'] },
      { filter: 'deleted', stories: ['deleted'] },
    ])
  })

  it('matches directory descendants and exact component paths', () => {
    const stories = [
      createStory('root', {
        sourcePath: 'src/app.stories.tsx',
        directories: ['src'],
      }),
      createStory('nested', {
        sourcePath: 'src/admin/panel.stories.tsx',
        directories: ['src', 'admin'],
      }),
      createStory('sibling', {
        sourcePath: 'src/administrator/panel.stories.tsx',
        directories: ['src', 'administrator'],
      }),
    ]

    expect(selectedStoryIds(stories)).toEqual([['nested'], ['sibling']])
  })

  it('combines search, status filter, and selection while preserving story order', () => {
    const stories = [
      createStory('first-menu', {
        storyId: 'displays-menu',
        sourcePath: 'src/admin/Menu.stories.tsx',
        directories: ['src', 'admin'],
        variants: [{ name: 'wide', status: 'changed', key: 'first' }],
      }),
      createStory('outside', {
        storyId: 'displays-menu',
        sourcePath: 'src/other/Menu.stories.tsx',
        directories: ['src', 'other'],
        variants: [{ name: 'wide', status: 'changed', key: 'outside' }],
      }),
      createStory('passed-menu', {
        storyId: 'displays-menu',
        sourcePath: 'src/admin/Menu.stories.tsx',
        directories: ['src', 'admin'],
        variants: [{ name: 'wide', status: 'unchanged', key: 'passed' }],
      }),
      createStory('other-story', {
        storyId: 'displays-help',
        sourcePath: 'src/admin/Help.stories.tsx',
        directories: ['src', 'admin'],
        variants: [{ name: 'wide', status: 'changed', key: 'help' }],
      }),
    ]

    expect(
      getVisibleStories(stories, {
        query: 'menu',
        filter: 'changes',
        selection: { kind: 'directory', path: 'src/admin' },
      }).map((story) => story.id),
    ).toEqual(['first-menu'])
  })
})

describe('report detail navigation logic', () => {
  it('indexes every story variant by its detail identifier', () => {
    const stories = [
      createStory('first', {
        variants: [
          { name: 'wide', status: 'changed', key: 'first-wide' },
          { name: 'compact', status: 'unchanged', key: 'first-compact' },
        ],
      }),
      createStory('second', {
        variants: [{ name: 'default', status: 'new', key: 'second-default' }],
      }),
    ]
    const entries = [...createDetailEntryIndex(stories)]

    expect(
      entries.map(([id, entry]) => [id, entry.story.id, entry.variant.name]),
    ).toEqual([
      ['first/wide', 'first', 'wide'],
      ['first/compact', 'first', 'compact'],
      ['second/default', 'second', 'default'],
    ])
  })

  it('uses changed variants first and adds unchanged variants only when expanded', () => {
    const stories = [
      createStory('first', {
        variants: [
          { name: 'wide', status: 'changed', key: 'first-wide' },
          { name: 'compact', status: 'unchanged', key: 'first-compact' },
          { name: 'tablet', status: 'new', key: 'first-tablet' },
        ],
      }),
      createStory('passed', {
        variants: [{ name: 'default', status: 'unchanged', key: 'passed' }],
      }),
    ]

    expect(visibleDetailOrderings(stories)).toEqual([
      ['first/wide', 'first/tablet', 'passed/default'],
      ['first/wide', 'first/tablet', 'first/compact', 'passed/default'],
    ])
  })

  it('wraps navigation and disables it when the selected detail is not visible', () => {
    const stories = [
      createStory('first', {
        variants: [
          { name: 'wide', status: 'changed', key: 'first-wide' },
          { name: 'compact', status: 'unchanged', key: 'first-compact' },
        ],
      }),
      createStory('second'),
    ]
    const entries = getVisibleDetailEntries(stories, new Set())
    const position = getDetailPosition(entries, 'first/wide')
    const hiddenPosition = getDetailPosition(entries, 'first/compact')

    expect(detailNavigationState(position, hiddenPosition)).toEqual([
      0,
      true,
      'second',
      'second',
      -1,
      false,
      undefined,
    ])
  })
})
