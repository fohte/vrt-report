import type { Meta, StoryObj } from '@storybook/react-vite'

import {
  ComparisonModes,
  type ComparisonModesProps,
} from '#vrt-components/comparison-modes'

const previewImage = (accent: string, x: number) => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360"><rect width="640" height="360" fill="#262626"/><rect x="${String(x)}" y="86" width="180" height="124" fill="${accent}"/></svg>`
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}
const beforeImage = previewImage('#525252', 90)
const afterImage = previewImage('#dc2626', 136)
const variant: ComparisonModesProps['variant'] = {
  name: 'default',
  status: 'changed',
  before: beforeImage,
  after: afterImage,
  diff: previewImage('#ef4444', 136),
  diffRegions: {
    width: 640,
    height: 360,
    rectangles: [{ x: 110, y: 80, width: 220, height: 140 }],
  },
}

const meta = {
  component: ComparisonModes,
  args: {
    variant,
    storyLabel: 'Sample suite / Example screen',
    mode: 'slide',
    detail: true,
  },
} satisfies Meta<typeof ComparisonModes>

export default meta
type Story = StoryObj<typeof meta>

export const Slider: Story = {
  name: 'the list slider reveals the after image by dragging.',
  args: { mode: 'slider', detail: false },
}

export const Slide: Story = {
  name: 'the detail slider includes difference markers.',
  args: { mode: 'slide', detail: true, markersVisible: true },
}

export const Blend: Story = {
  name: 'the blend control adjusts the after image opacity.',
  args: { mode: 'blend', detail: true, markersVisible: true },
}

export const ToggleBefore: Story = {
  name: 'the toggle control starts on the baseline image.',
  args: {
    mode: 'toggle',
    detail: true,
    markersVisible: true,
    toggleAfter: false,
  },
}

export const ToggleAfter: Story = {
  name: 'the toggle control can start on the current image.',
  args: {
    mode: 'toggle',
    detail: true,
    markersVisible: true,
    toggleAfter: true,
  },
}
