import type { Meta, StoryObj } from '@storybook/react-vite'

import { changedStory, reportStories } from '#vrt-components/report-fixtures'
import { ReportSidebar } from '#vrt-components/report-sidebar'

const meta = {
  component: ReportSidebar,
  args: {
    query: '',
    stories: reportStories,
    selection: null,
    onQueryChange: () => undefined,
    onSelectionChange: () => undefined,
  },
} satisfies Meta<typeof ReportSidebar>

export default meta
type Story = StoryObj<typeof meta>

export const AllStoriesAreSelected: Story = {
  name: 'the sidebar starts with all stories selected.',
}

export const ADirectoryIsSelected: Story = {
  name: 'a directory selection includes stories in its nested folders.',
  args: { selection: { kind: 'directory', path: 'src/controls' } },
}

export const AComponentIsSelected: Story = {
  name: 'a selected component has a highlighted tree row.',
  args: {
    selection: {
      kind: 'component',
      path: 'src/controls/example-panel.stories.tsx',
    },
  },
}

export const SearchNarrowsTheTree: Story = {
  name: 'a search query narrows the tree to matching stories.',
  args: { query: 'Example panel', stories: [changedStory] },
}

export const ADirectoryCanStartCollapsed: Story = {
  name: 'a directory can start with its child rows hidden.',
  args: { collapsedDirectories: ['src/controls'] },
}

export const NoStoriesMatchTheSearch: Story = {
  name: 'an empty search result explains that no stories match.',
  args: { query: 'unmatched', stories: [] },
}
