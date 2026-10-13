import type { Meta, StoryObj } from '@storybook/react-vite'

import { reportStories } from '#vrt-components/report-fixtures'
import { ReportHeader } from '#vrt-components/report-header'

const meta = {
  component: ReportHeader,
  args: {
    filter: 'changes',
    stories: reportStories,
    viewMode: 'pair',
    onFilterChange: () => undefined,
    onViewModeChange: () => undefined,
  },
} satisfies Meta<typeof ReportHeader>

export default meta
type Story = StoryObj<typeof meta>

export const ChangesAreSelected: Story = {
  name: 'the report shows stories with changes by default.',
}

export const AllStoriesAreSelected: Story = {
  name: 'the all filter includes changed and passed stories.',
  args: { filter: 'all' },
}

export const ChangedStoriesAreSelected: Story = {
  name: 'the changed filter shows stories with updated images.',
  args: { filter: 'changed' },
}

export const NewStoriesAreSelected: Story = {
  name: 'the new filter shows stories with newly added images.',
  args: { filter: 'new' },
}

export const DeletedStoriesAreSelected: Story = {
  name: 'the deleted filter shows stories with removed images.',
  args: { filter: 'deleted' },
}

export const PassedStoriesAreSelected: Story = {
  name: 'the passed filter shows stories with unchanged images.',
  args: { filter: 'passed' },
}

export const DifferenceModeIsSelected: Story = {
  name: 'the difference mode shows the generated diff image.',
  args: { viewMode: 'diff' },
}

export const SliderModeIsSelected: Story = {
  name: 'the slider mode compares images with an overlay.',
  args: { viewMode: 'slider' },
}
