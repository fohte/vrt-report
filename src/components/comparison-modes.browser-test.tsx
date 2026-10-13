import { act, type ReactNode, useState } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it } from 'vitest'
import { page, userEvent } from 'vitest/browser'

import type { ComparisonVariant } from '#vrt-components/comparison-model'
import {
  ComparisonModes,
  type ComparisonModesProps,
} from '#vrt-components/comparison-modes'

const variant: ComparisonVariant = {
  name: 'sample',
  status: 'changed',
  before:
    'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1"%3E%3C/svg%3E',
  after:
    'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1"%3E%3C/svg%3E',
  diff: null,
}

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

function renderMode(
  mode: ComparisonModesProps['mode'],
  extraProps: Partial<ComparisonModesProps> = {},
) {
  return mount(
    <ComparisonModes
      variant={variant}
      storyLabel="Sample screen"
      mode={mode}
      {...extraProps}
    />,
  )
}

afterEach(() => {
  act(() => {
    for (const { root } of mounted) root.unmount()
  })
  for (const { container } of mounted) container.remove()
  mounted.length = 0
})

describe('comparison range controls', () => {
  it('moves the after-image clip when the slider changes', async () => {
    const container = renderMode('slider')
    const slider = page.getByRole('slider', {
      name: 'Compare before and after images',
    })
    const input =
      container.querySelector<HTMLInputElement>('input[type="range"]') ??
      document.createElement('input')

    await act(async () => {
      await slider.click()
      await userEvent.keyboard(`{Home}${'{ArrowRight}'.repeat(25)}`)
    })

    expect(readSliderState(container, input)).toEqual({
      value: '25',
      afterClipPath: 'inset(0px 0px 0px 25%)',
    })
  })

  it('changes the after-image opacity when the blend control changes', async () => {
    const container = renderMode('blend')
    const slider = page.getByRole('slider', { name: 'After image opacity' })
    const input =
      container.querySelector<HTMLInputElement>('input[type="range"]') ??
      document.createElement('input')

    await act(async () => {
      await slider.click()
      await userEvent.keyboard(`{Home}${'{ArrowRight}'.repeat(25)}`)
    })

    expect(readBlendState(container, input)).toEqual({
      value: '25',
      afterOpacity: '0.25',
    })
  })
})

describe('comparison toggle control', () => {
  it('shows after and calls the controlled callback when toggled', async () => {
    const changes: boolean[] = []

    function ControlledToggle() {
      const [showAfter, setShowAfter] = useState(false)
      return (
        <ComparisonModes
          variant={variant}
          storyLabel="Sample screen"
          mode="toggle"
          toggleAfter={showAfter}
          onToggleAfterChange={(value) => {
            changes.push(value)
            setShowAfter(value)
          }}
        />
      )
    }

    const container = mount(<ControlledToggle />)
    const checkbox = page.getByRole('checkbox', { name: 'Show after image' })
    const input =
      container.querySelector<HTMLInputElement>('input[type="checkbox"]') ??
      document.createElement('input')

    await act(async () => {
      await checkbox.click()
    })

    expect(readToggleState(container, input, changes)).toEqual({
      checked: true,
      beforeHidden: true,
      afterHidden: false,
      changes: [true],
    })
  })
})

function readSliderState(container: HTMLElement, slider: HTMLInputElement) {
  return {
    value: slider.value,
    afterClipPath: [...container.querySelectorAll<HTMLElement>('[style]')].find(
      (element) => element.style.clipPath !== '',
    )?.style.clipPath,
  }
}

function readBlendState(container: HTMLElement, slider: HTMLInputElement) {
  return {
    value: slider.value,
    afterOpacity: [...container.querySelectorAll<HTMLElement>('[style]')].find(
      (element) => element.style.opacity !== '',
    )?.style.opacity,
  }
}

function readToggleState(
  container: HTMLElement,
  checkbox: HTMLInputElement,
  changes: boolean[],
) {
  return {
    checked: checkbox.checked,
    beforeHidden: container
      .querySelector<HTMLImageElement>('img[alt^="Before"]')
      ?.parentElement?.parentElement?.hasAttribute('hidden'),
    afterHidden: container
      .querySelector<HTMLImageElement>('img[alt^="After"]')
      ?.parentElement?.parentElement?.hasAttribute('hidden'),
    changes,
  }
}
