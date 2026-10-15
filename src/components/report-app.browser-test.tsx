import { act, createElement, type ReactNode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it } from 'vitest'
import { page, userEvent } from 'vitest/browser'

import { ReportApp } from '#vrt-components/report-app'
import {
  changedStory,
  changedStoryId,
  deletedStory,
  newStory,
  passedStory,
} from '#vrt-components/report-fixtures'

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

const resetLocation = () => {
  const url = new URL(window.location.href)
  url.search = ''
  window.history.replaceState({}, '', url)
}

const currentDetailId = () =>
  new URL(window.location.href).searchParams.get('id')

const visibleStoryTitles = (container: HTMLElement) =>
  [...container.querySelectorAll('article h2')].map((heading) =>
    heading.textContent.trim(),
  )

const alternateChangedStory = {
  ...changedStory,
  id: 'src/controls/alternate-panel.stories.tsx/opens-panel.png',
  storyId: 'alternate-panel-opens',
  displayName: 'Alternate panel opens',
}

afterEach(() => {
  act(() => {
    for (const { root } of mounted) root.unmount()
  })
  for (const { container } of mounted) container.remove()
  mounted.length = 0
  resetLocation()
})

describe('report application', () => {
  it('connects the default filter, tree selection, and search to the story list', async () => {
    resetLocation()
    const container = mount(
      createElement(ReportApp, {
        stories: [changedStory, newStory, deletedStory, passedStory],
      }),
    )

    const initialTitles = visibleStoryTitles(container)
    await act(async () => {
      await userEvent.click(page.getByRole('button', { name: 'ExamplePanel1' }))
    })
    const selectedTitles = visibleStoryTitles(container)
    await act(async () => {
      await userEvent.fill(
        page.getByRole('searchbox', { name: 'Filter stories' }),
        'opens',
      )
    })

    expect({
      initialTitles,
      selectedTitles,
      searchedTitles: visibleStoryTitles(container),
      storyCount: container.querySelector('[role="status"]')?.textContent,
    }).toEqual({
      initialTitles: [
        'Example panel opens',
        'Example banner appears',
        'Example dialog appears',
      ],
      selectedTitles: ['Example panel opens'],
      searchedTitles: ['Example panel opens'],
      storyCount: '1 story',
    })
  })

  it('keeps the selected detail mode while moving to the next changed image', async () => {
    resetLocation()
    const secondStoryId = alternateChangedStory.id + '/wide'
    const container = mount(
      createElement(ReportApp, {
        stories: [changedStory, alternateChangedStory],
      }),
    )
    const selectedModes: string[] = []

    await act(async () => {
      await userEvent.click(
        page.getByRole('button', {
          name: 'Open Before image for ExamplePanel / Example panel opens (wide)',
        }),
      )
      for (const mode of ['Diff', 'Slide', '2-up', 'Blend', 'Toggle']) {
        await userEvent.click(
          page
            .getByRole('group', { name: 'Detail comparison mode' })
            .getByRole('button', { name: mode }),
        )
        selectedModes.push(
          container
            .querySelector(
              '[aria-label="Detail comparison mode"] [aria-pressed="true"]',
            )
            ?.textContent.trim() ?? '',
        )
      }
      await userEvent.click(page.getByRole('button', { name: 'Next image' }))
    })

    expect({
      detailId: currentDetailId(),
      selectedModes,
      selectedMode: container.querySelector(
        '[aria-label="Detail comparison mode"] [aria-pressed="true"]',
      )?.textContent,
      storyContext: container.querySelector('[role="dialog"] header p')
        ?.textContent,
    }).toEqual({
      detailId: secondStoryId,
      selectedModes: ['Diff', 'Slide', '2-up', 'Blend', 'Toggle'],
      selectedMode: 'Toggle',
      storyContext: 'ExamplePanel / Alternate panel opens',
    })
  })

  it('supports arrow and vim navigation while ignoring keys typed in search', async () => {
    resetLocation()
    const firstId = `${changedStoryId}/wide`
    const secondId = `${alternateChangedStory.id}/wide`
    const container = mount(
      createElement(ReportApp, {
        stories: [changedStory, alternateChangedStory],
      }),
    )

    await act(async () => {
      await userEvent.click(
        page.getByRole('button', {
          name: 'Open Before image for ExamplePanel / Example panel opens (wide)',
        }),
      )
    })
    const navigation = [currentDetailId()]
    await act(async () => {
      await userEvent.keyboard('{ArrowRight}')
    })
    navigation.push(currentDetailId())
    await act(async () => {
      await userEvent.keyboard('h')
    })
    navigation.push(currentDetailId())
    await act(async () => {
      await userEvent.keyboard('l')
    })
    navigation.push(currentDetailId())
    await act(async () => {
      await userEvent.keyboard('{ArrowLeft}')
    })
    navigation.push(currentDetailId())

    await act(async () => {
      await userEvent.keyboard('m')
    })
    const searchInput = container.querySelector<HTMLInputElement>(
      'input[type="search"]',
    )
    searchInput?.focus()
    await act(async () => {
      await userEvent.keyboard('ml')
    })

    expect({
      navigation,
      detailIdAfterTyping: currentDetailId(),
      searchQuery: searchInput?.value ?? '',
      markersPressed: [
        ...container.querySelectorAll<HTMLButtonElement>(
          '[role="dialog"] button',
        ),
      ]
        .find((button) => button.textContent.trim() === 'Difference markers')
        ?.getAttribute('aria-pressed'),
    }).toEqual({
      navigation: [firstId, secondId, firstId, secondId, firstId],
      detailIdAfterTyping: firstId,
      searchQuery: 'ml',
      markersPressed: 'true',
    })
  })

  it('opens a deep-linked detail and closes it when browser history goes back', async () => {
    const id = `${changedStoryId}/wide`
    const url = new URL(window.location.href)
    url.searchParams.set('id', id)
    window.history.replaceState({}, '', url)
    const container = mount(
      createElement(ReportApp, { stories: [changedStory] }),
    )
    const detailOpened = container.querySelector('[role="dialog"]') !== null
    const indexedDetail = currentDetailId()

    const returned = new Promise<void>((resolve) => {
      window.addEventListener(
        'popstate',
        () => {
          resolve()
        },
        { once: true },
      )
    })
    await act(async () => {
      window.history.back()
      await returned
    })

    expect({
      detailOpened,
      indexedDetail,
      detailAfterBack: container.querySelector('[role="dialog"]') !== null,
      idAfterBack: currentDetailId(),
    }).toEqual({
      detailOpened: true,
      indexedDetail: id,
      detailAfterBack: false,
      idAfterBack: null,
    })
  })
})
