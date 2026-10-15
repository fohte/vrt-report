import type { Meta, StoryObj } from '@storybook/react-vite'

import { ReportApp } from '#vrt-components/report-app'
import {
  changedStory,
  changedStoryId,
  reportStories,
} from '#vrt-components/report-fixtures'

const meta = {
  component: ReportApp,
  args: {
    stories: reportStories,
  },
} satisfies Meta<typeof ReportApp>

export default meta
type Story = StoryObj<typeof meta>

export const ChangesAreShownByDefault: Story = {
  name: 'the report opens with stories that have changes.',
}

export const ADetailIsOpenInBlendMode: Story = {
  name: 'the detail view compares the selected images with blend mode.',
  args: {
    stories: [changedStory],
    initialDetailId: `${changedStoryId}/wide`,
    initialDetailMode: 'blend',
    initialMarkersVisible: true,
  },
}
