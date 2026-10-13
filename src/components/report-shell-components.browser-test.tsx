import { act, createElement, type ReactNode, useState } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it } from 'vitest'
import { page, userEvent } from 'vitest/browser'

import {
  changedStory,
  changedStoryId,
  reportStories,
} from '#vrt-components/report-fixtures'
import { ReportHeader } from '#vrt-components/report-header'
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
  it('reports filter and comparison mode selections to its owner', async () => {
    const changes: Array<{ kind: string; value: string }> = []

    mount(
      createElement(ReportHeader, {
        filter: 'changes',
        stories: reportStories,
        viewMode: 'pair',
        onFilterChange: (value) => {
          changes.push({ kind: 'filter', value })
        },
        onViewModeChange: (value) => {
          changes.push({ kind: 'view', value })
        },
      }),
    )

    await act(async () => {
      await userEvent.click(page.getByRole('button', { name: 'New, 1 story' }))
      await userEvent.click(page.getByRole('button', { name: 'Slider' }))
    })

    expect(changes).toEqual([
      { kind: 'filter', value: 'new' },
      { kind: 'view', value: 'slider' },
    ])
  })
})

describe('report sidebar controls', () => {
  it('reports search text and selected components to its owner', async () => {
    const changes: Array<
      | { kind: 'query'; value: string }
      | { kind: 'selection'; value: { kind: 'component'; path: string } | null }
    > = []

    mount(
      createElement(ReportSidebar, {
        query: '',
        stories: reportStories,
        selection: null,
        onQueryChange: (value) => {
          changes.push({ kind: 'query', value })
        },
        onSelectionChange: (value) => {
          changes.push({
            kind: 'selection',
            value: value?.kind === 'component' ? value : null,
          })
        },
      }),
    )

    await act(async () => {
      await userEvent.fill(
        page.getByRole('searchbox', { name: 'Filter stories' }),
        'Example panel',
      )
      await userEvent.click(page.getByRole('button', { name: /ExamplePanel/ }))
    })

    expect(changes).toEqual([
      { kind: 'query', value: 'Example panel' },
      {
        kind: 'selection',
        value: {
          kind: 'component',
          path: 'src/controls/example-panel.stories.tsx',
        },
      },
    ])
  })
})

describe('report story list controls', () => {
  it('expands unchanged variants and opens a selected image detail', async () => {
    const changes: Array<Record<string, string | boolean>> = []

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
        onOpenDetail: (story, variant) => {
          changes.push({
            kind: 'detail',
            storyId: story.id,
            variantName: variant.name,
          })
        },
      })
    }

    const container = mount(createElement(ControlledList))

    await act(async () => {
      await userEvent.click(
        page.getByRole('button', { name: 'Show 1 unchanged variant' }),
      )
      await userEvent.click(
        page.getByRole('button', {
          name: 'Open Before image for ExamplePanel / Example panel opens (wide)',
        }),
      )
    })

    expect({
      changes,
      renderedVariants: [...container.querySelectorAll('h3')].map(
        (heading) => heading.textContent,
      ),
      expandedControl: container
        .querySelector('[aria-expanded="true"]')
        ?.textContent.trim(),
      storyId: changedStoryId,
    }).toEqual({
      changes: [
        { kind: 'expanded', storyId: changedStoryId, expanded: true },
        {
          kind: 'detail',
          storyId: changedStoryId,
          variantName: 'wide',
        },
      ],
      renderedVariants: ['wide', 'compact'],
      expandedControl: 'Hide 1 unchanged variant',
      storyId: changedStoryId,
    })
  })
})
