import type { Meta, StoryObj } from '@storybook/react-vite'

import { Comparison, type ComparisonVariant } from '#vrt-components/comparison'

const previewImage = (background: string, accent: string, shifted: boolean) => {
  const offset = shifted ? 46 : 0
  const shapeOffset = String(92 + offset)
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360" viewBox="0 0 640 360"><rect width="640" height="360" fill="${background}"/><rect x="34" y="32" width="572" height="296" fill="none" stroke="#737373" stroke-width="2"/><rect x="${shapeOffset}" y="88" width="166" height="92" fill="${accent}"/><rect x="302" y="88" width="210" height="14" fill="#d4d4d4"/><rect x="302" y="116" width="146" height="14" fill="#a3a3a3"/><rect x="92" y="222" width="420" height="58" fill="#404040"/></svg>`
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}

const beforeImage = previewImage('#262626', '#525252', false)
const afterImage = previewImage('#262626', '#dc2626', true)

const changedVariant: ComparisonVariant = {
  name: 'default',
  status: 'changed',
  before: beforeImage,
  after: afterImage,
  diff: previewImage('#262626', '#ef4444', true),
  diffRegions: {
    width: 640,
    height: 360,
    rectangles: [{ x: 110, y: 82, width: 220, height: 112 }],
  },
}

const meta = {
  component: Comparison,
  args: {
    variant: changedVariant,
    storyLabel: 'Sample suite / Example screen',
  },
} satisfies Meta<typeof Comparison>

export default meta
type Story = StoryObj<typeof meta>

export const ChangedPair: Story = {
  name: 'a changed variant shows before and after images side by side.',
}

export const Diff: Story = {
  name: 'the detail view shows the generated difference image.',
  args: { mode: 'diff', detail: true, markersVisible: true },
}

export const Slider: Story = {
  name: 'the slider overlays the after image on the right side.',
  args: { mode: 'slider' },
}

export const Slide: Story = {
  name: 'the detail slider displays the difference markers.',
  args: { mode: 'slide', detail: true, markersVisible: true },
}

export const TwoUp: Story = {
  name: 'the detail two-up view shows both images side by side.',
  args: { mode: '2up', detail: true, markersVisible: true },
}

export const Blend: Story = {
  name: 'the blend view layers both images at equal opacity.',
  args: { mode: 'blend', detail: true, markersVisible: true },
}

export const ToggleBefore: Story = {
  name: 'the toggle view starts with the baseline image visible.',
  args: { mode: 'toggle', detail: true, markersVisible: true },
}

export const ToggleAfter: Story = {
  name: 'the toggle view can start with the current image visible.',
  args: {
    mode: 'toggle',
    detail: true,
    markersVisible: true,
    toggleAfter: true,
  },
}

export const NewAfterOnly: Story = {
  name: 'a new variant shows only its current image.',
  args: {
    variant: {
      ...changedVariant,
      status: 'new',
      before: null,
      diff: null,
    },
  },
}

export const DeletedBeforeOnly: Story = {
  name: 'a deleted variant shows only its baseline image.',
  args: {
    variant: {
      ...changedVariant,
      status: 'deleted',
      after: null,
      diff: null,
    },
  },
}

export const UnchangedCurrentOnly: Story = {
  name: 'an unchanged variant shows only its current image.',
  args: {
    variant: {
      ...changedVariant,
      status: 'unchanged',
      before: null,
      after: afterImage,
      diff: null,
      diffRegions: null,
    },
  },
}

export const ImageUnavailable: Story = {
  name: 'unreadable before and after images show a fallback message.',
  args: {
    variant: {
      ...changedVariant,
      before: 'data:image/png;base64,broken',
      after: 'data:image/png;base64,broken',
    },
  },
}

export const DiffUnavailable: Story = {
  name: 'a missing difference image shows its fallback message.',
  args: {
    variant: { ...changedVariant, diff: null },
    mode: 'diff',
    detail: true,
  },
}
