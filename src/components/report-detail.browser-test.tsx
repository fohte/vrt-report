import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it } from 'vitest'
import { page, userEvent } from 'vitest/browser'

import {
  type DetailComparisonMode,
  ReportDetail,
  type ReportDetailProps,
} from '#vrt-components/report-detail'
import { changedStory, changedVariant } from '#vrt-components/report-fixtures'

Object.defineProperty(globalThis, 'IS_REACT_ACT_ENVIRONMENT', { value: true })

const mounted: Array<{ container: HTMLDivElement; root: Root }> = []

function mount(extraProps: Partial<ReportDetailProps> = {}) {
  const container = document.createElement('div')
  document.body.append(container)
  const root = createRoot(container)
  mounted.push({ container, root })
  const props: ReportDetailProps = {
    story: changedStory,
    variant: changedVariant,
    mode: 'slide',
    markersVisible: false,
    position: '1 / 2',
    navigable: true,
    onModeChange: () => undefined,
    onMarkersToggle: () => undefined,
    onPrevious: () => undefined,
    onNext: () => undefined,
    onClose: () => undefined,
    ...extraProps,
  }

  act(() => {
    root.render(<ReportDetail {...props} />)
  })
}

afterEach(() => {
  act(() => {
    for (const { root } of mounted) root.unmount()
  })
  for (const { container } of mounted) container.remove()
  mounted.length = 0
})

describe('report detail controls', () => {
  it('reports selected comparison modes and marker toggles', async () => {
    const modeChanges: DetailComparisonMode[] = []
    const actions: string[] = []

    mount({
      onModeChange: (mode) => {
        modeChanges.push(mode)
      },
      onMarkersToggle: () => {
        actions.push('markers')
      },
    })

    await act(async () => {
      await userEvent.click(page.getByRole('button', { name: 'Blend' }))
      await userEvent.click(
        page.getByRole('button', { name: 'Difference markers' }),
      )
    })

    expect({ modeChanges, actions }).toEqual({
      modeChanges: ['blend'],
      actions: ['markers'],
    })
  })

  it('reports previous, next, and close actions', async () => {
    const actions: string[] = []

    mount({
      onPrevious: () => {
        actions.push('previous')
      },
      onNext: () => {
        actions.push('next')
      },
      onClose: () => {
        actions.push('close')
      },
    })

    await act(async () => {
      await userEvent.click(
        page.getByRole('button', { name: 'Previous image' }),
      )
      await userEvent.click(page.getByRole('button', { name: 'Next image' }))
      await userEvent.click(page.getByRole('button', { name: 'Close detail' }))
    })

    expect(actions).toEqual(['previous', 'next', 'close'])
  })
})
