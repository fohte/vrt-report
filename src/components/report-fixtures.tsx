import type { ReportStoryView } from '#report-logic'

const image = (background: string, accent: string) => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360" viewBox="0 0 640 360"><rect width="640" height="360" fill="${background}"/><rect x="40" y="36" width="560" height="288" fill="none" stroke="#737373" stroke-width="2"/><rect x="96" y="88" width="180" height="88" fill="${accent}"/><rect x="310" y="90" width="220" height="16" fill="#d4d4d4"/><rect x="310" y="122" width="156" height="14" fill="#a3a3a3"/><rect x="96" y="216" width="434" height="54" fill="#404040"/></svg>`
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}

const before = image('#262626', '#525252')
const after = image('#262626', '#dc2626')
const current = image('#202a35', '#3b82f6')

export const changedStoryId =
  'src/controls/example-panel.stories.tsx/opens-panel.png'

export const changedStory: ReportStoryView = {
  id: changedStoryId,
  storyId: 'opens-panel',
  displayName: 'Example panel opens',
  component: 'ExamplePanel',
  sourcePath: 'src/controls/example-panel.stories.tsx',
  directories: ['src', 'controls'],
  variants: [
    {
      name: 'wide',
      status: 'changed',
      before,
      after,
      diff: image('#262626', '#ef4444'),
      diffRegions: {
        width: 640,
        height: 360,
        rectangles: [{ x: 90, y: 82, width: 206, height: 100 }],
      },
    },
    {
      name: 'compact',
      status: 'unchanged',
      before: null,
      after: current,
      diff: null,
      diffRegions: null,
    },
  ],
}

export const newStory: ReportStoryView = {
  id: 'src/layout/example-banner.stories.tsx/shows-banner.png',
  storyId: 'shows-banner',
  displayName: 'Example banner appears',
  component: 'ExampleBanner',
  sourcePath: 'src/layout/example-banner.stories.tsx',
  directories: ['src', 'layout'],
  variants: [
    {
      name: 'desktop',
      status: 'new',
      before: null,
      after: current,
      diff: null,
      diffRegions: null,
    },
  ],
}

export const deletedStory: ReportStoryView = {
  id: 'src/dialogs/example-dialog.stories.tsx/shows-dialog.png',
  storyId: 'shows-dialog',
  displayName: 'Example dialog appears',
  component: 'ExampleDialog',
  sourcePath: 'src/dialogs/example-dialog.stories.tsx',
  directories: ['src', 'dialogs'],
  variants: [
    {
      name: 'desktop',
      status: 'deleted',
      before,
      after: null,
      diff: null,
      diffRegions: null,
    },
  ],
}

export const passedStory: ReportStoryView = {
  id: 'src/controls/example-avatar.stories.tsx/shows-avatar.png',
  storyId: 'shows-avatar',
  displayName: 'Example avatar is visible',
  component: 'ExampleAvatar',
  sourcePath: 'src/controls/example-avatar.stories.tsx',
  directories: ['src', 'controls'],
  variants: [
    {
      name: 'default',
      status: 'unchanged',
      before: null,
      after: current,
      diff: null,
      diffRegions: null,
    },
  ],
}

export const reportStories = [changedStory, newStory, deletedStory, passedStory]
