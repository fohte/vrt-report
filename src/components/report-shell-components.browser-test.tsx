import { act, createElement, type ReactNode, useState } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it } from 'vitest'
import { page, userEvent } from 'vitest/browser'

import {
  changedStory,
  changedStoryId,
  reportStories,
} from '#vrt-components/report-fixtures'
import {
  ReportHeader,
  type ReportViewMode,
} from '#vrt-components/report-header'
import { ReportList } from '#vrt-components/report-list'
import { ReportSidebar } from '#vrt-components/report-sidebar'

Object.defineProperty(globalThis, 'IS_REACT_ACT_ENVIRONMENT', { value: true })

const mounted: Array<{ container: HTMLDivElement; root: Root }> = []

function mount(node: ReactNode) {
  const container = document.createElement('div')
  document.body.append(container)
  const root = createRoot(container)
  mounted.push({ container, root })
  act(() => {
    root.render(node)
  })
  return container
}

afterEach(() => {
  act(() => {
    for (const { root } of mounted) root.unmount()
  })
  for (const { container } of mounted) container.remove()
  mounted.length = 0
})

describe('report header controls', () => {
  it('reports a selected filter to its owner', async () => {
    const filters: string[] = []

    mount(
      createElement(ReportHeader, {
        filter: 'changes',
        stories: reportStories,
        viewMode: 'pair',
        onFilterChange: (value) => {
          filters.push(value)
        },
        onViewModeChange: () => undefined,
      }),
    )

    await act(async () => {
      await userEvent.click(page.getByRole('button', { name: 'New, 1 story' }))
    })

    expect(filters).toEqual(['new'])
  })

  it('reports a selected comparison mode to its owner', async () => {
    const modes: ReportViewMode[] = []

    mount(
      createElement(ReportHeader, {
        filter: 'changes',
        stories: reportStories,
        viewMode: 'pair',
        onFilterChange: () => undefined,
        onViewModeChange: (value) => {
          modes.push(value)
        },
      }),
    )

    await act(async () => {
      await userEvent.click(page.getByRole('button', { name: 'Slider' }))
    })

    expect(modes).toEqual(['slider'])
  })
})

describe('report sidebar controls', () => {
  it('reports search text to its owner', async () => {
    const queries: string[] = []

    mount(
      createElement(ReportSidebar, {
        query: '',
        stories: reportStories,
        selection: null,
        onQueryChange: (value) => {
          queries.push(value)
        },
        onSelectionChange: () => undefined,
      }),
    )

    await act(async () => {
      await userEvent.fill(
        page.getByRole('searchbox', { name: 'Filter stories' }),
        'Example panel',
      )
    })

    expect(queries).toEqual(['Example panel'])
  })

  it('reports a selected component to its owner', async () => {
    const selections: Array<{
      kind: 'component' | 'directory'
      path: string
    } | null> = []

    mount(
      createElement(ReportSidebar, {
        query: '',
        stories: reportStories,
        selection: null,
        onQueryChange: () => undefined,
        onSelectionChange: (value) => {
          selections.push(value)
        },
      }),
    )

    await act(async () => {
      await userEvent.click(page.getByRole('button', { name: /ExamplePanel/ }))
    })

    expect(selections).toEqual([
      {
        kind: 'component',
        path: 'src/controls/example-panel.stories.tsx',
      },
    ])
  })
})

describe('report story list controls', () => {
  it('shows and hides unchanged variants when requested', async () => {
    const changes: Array<{
      kind: 'expanded'
      storyId: string
      expanded: boolean
    }> = []

    function ControlledList() {
      const [expandedStoryIds, setExpandedStoryIds] = useState<string[]>([])

      return createElement(ReportList, {
        stories: [changedStory],
        viewMode: 'pair',
        expandedStoryIds,
        onExpandedStoryChange: (storyId, expanded) => {
          changes.push({ kind: 'expanded', storyId, expanded })
          setExpandedStoryIds((current) =>
            expanded
              ? [...current, storyId]
              : current.filter((id) => id !== storyId),
          )
        },
      })
    }

    const container = mount(createElement(ControlledList))

    await act(async () => {
      await userEvent.click(
        page.getByRole('button', { name: 'Show 1 unchanged variant' }),
      )
      await userEvent.click(
        page.getByRole('button', { name: 'Hide 1 unchanged variant' }),
      )
    })

    expect({
      changes,
      renderedVariants: [...container.querySelectorAll('h3')].map(
        (heading) => heading.textContent,
      ),
      expandedControl: container
        .querySelector('[aria-expanded="false"]')
        ?.textContent.trim(),
    }).toEqual({
      changes: [
        { kind: 'expanded', storyId: changedStoryId, expanded: true },
        { kind: 'expanded', storyId: changedStoryId, expanded: false },
      ],
      renderedVariants: ['wide'],
      expandedControl: 'Show 1 unchanged variant',
    })
  })

  it('reports the selected image detail to its owner', async () => {
    const details: Array<{ storyId: string; variantName: string }> = []

    mount(
      createElement(ReportList, {
        stories: [changedStory],
        viewMode: 'pair',
        expandedStoryIds: [],
        onExpandedStoryChange: () => undefined,
        onOpenDetail: (story, variant) => {
          details.push({ storyId: story.id, variantName: variant.name })
        },
      }),
    )

    await act(async () => {
      await userEvent.click(
        page.getByRole('button', {
          name: 'Open Before image for ExamplePanel / Example panel opens (wide)',
        }),
      )
    })

    expect(details).toEqual([{ storyId: changedStoryId, variantName: 'wide' }])
  })
})
