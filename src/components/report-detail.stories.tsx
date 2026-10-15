import type { Meta, StoryObj } from '@storybook/react-vite'

import { ReportDetail } from '#vrt-components/report-detail'
import {
  changedStory,
  changedVariant,
  newStory,
  newVariant,
} from '#vrt-components/report-fixtures'

const meta = {
  component: ReportDetail,
  args: {
    story: changedStory,
    variant: changedVariant,
    mode: 'slide',
    markersVisible: true,
    position: '1 / 2',
    navigable: true,
    onModeChange: () => undefined,
    onMarkersToggle: () => undefined,
    onPrevious: () => undefined,
    onNext: () => undefined,
    onClose: () => undefined,
  },
} satisfies Meta<typeof ReportDetail>

export default meta
type Story = StoryObj<typeof meta>

export const SlideWithMarkers: Story = {
  name: 'The detail overlay shows the changed image with markers.',
}

export const TwoUp: Story = {
  name: 'The detail overlay shows both images side by side.',
  args: { mode: '2up', markersVisible: false },
}

export const NewVariant: Story = {
  name: 'The detail overlay shows a new image without comparison controls.',
  args: {
    story: newStory,
    variant: newVariant,
    mode: 'diff',
    markersVisible: false,
    position: '1 / 1',
    navigable: false,
  },
}
