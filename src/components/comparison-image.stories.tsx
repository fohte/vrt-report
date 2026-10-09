import type { Meta, StoryObj } from '@storybook/react-vite'

import {
  ComparisonImage,
  type ComparisonImageProps,
} from '#vrt-components/comparison-image'

const svg =
  '<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360"><rect width="640" height="360" fill="#262626"/><rect x="220" y="90" width="180" height="120" fill="#dc2626"/></svg>'
const image = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
const variant: ComparisonImageProps['variant'] = {
  name: 'default',
  status: 'changed',
  before: image,
  after: image,
  diff: image,
  diffRegions: {
    width: 640,
    height: 360,
    rectangles: [{ x: 200, y: 80, width: 220, height: 140 }],
  },
}

const meta = {
  component: ComparisonImage,
  args: {
    label: 'After',
    source: image,
    storyLabel: 'Sample suite / Example screen',
    loading: 'eager',
    detail: false,
    markersVisible: false,
    variant,
  },
} satisfies Meta<typeof ComparisonImage>

export default meta
type Story = StoryObj<typeof meta>

export const Loaded: Story = {
  name: 'a loaded image fills the comparison area.',
}

export const Markers: Story = {
  name: 'difference markers outline the changed image region.',
  args: { detail: true, markersVisible: true },
}

export const Unavailable: Story = {
  name: 'an unreadable image shows a fallback message.',
  args: { source: 'data:image/png;base64,broken' },
}

export const MissingDifference: Story = {
  name: 'a missing difference image shows its fallback message.',
  args: { label: 'Diff', source: null },
}
