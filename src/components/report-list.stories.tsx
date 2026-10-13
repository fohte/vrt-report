import type { Meta, StoryObj } from '@storybook/react-vite'

import {
  changedStory,
  deletedStory,
  newStory,
  passedStory,
  reportStories,
} from '#vrt-components/report-fixtures'
import { ReportList } from '#vrt-components/report-list'

const meta = {
  component: ReportList,
  args: {
    stories: reportStories,
    viewMode: 'pair',
    expandedStoryIds: [],
    onExpandedStoryChange: () => undefined,
    onOpenDetail: () => undefined,
  },
} satisfies Meta<typeof ReportList>

export default meta
type Story = StoryObj<typeof meta>

export const ChangedStoriesShowUnchangedVariantsCollapsed: Story = {
  name: 'a changed story starts with unchanged variants collapsed.',
  args: { stories: [changedStory] },
}

export const UnchangedVariantsAreExpanded: Story = {
  name: 'an expanded story shows both changed and unchanged variants.',
  args: {
    stories: [changedStory],
    expandedStoryIds: [changedStory.id],
  },
}

export const NewStoriesShowTheCurrentImage: Story = {
  name: 'a new story shows its current image.',
  args: { stories: [newStory] },
}

export const DeletedStoriesShowTheBaselineImage: Story = {
  name: 'a deleted story shows its baseline image.',
  args: { stories: [deletedStory] },
}

export const PassedStoriesShowTheirUnchangedVariant: Story = {
  name: 'a passed story shows its unchanged variant.',
  args: { stories: [passedStory] },
}

export const NoStoriesMatchTheCurrentFilter: Story = {
  name: 'the empty state explains that no stories match the filter.',
  args: { stories: [] },
}
