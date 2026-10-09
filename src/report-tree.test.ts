import { describe, expect, it } from 'vitest'

import type { ReportStory } from '#report-logic'
import {
  buildStoryTree,
  countStoriesInTree,
  type StoryTreeDirectory,
  type StoryTreeNode,
} from '#report-tree'

const createStory = (
  id: string,
  component: string,
  sourcePath: string,
  directories: string[],
): ReportStory => ({
  id,
  storyId: id,
  component,
  sourcePath,
  directories,
  variants: [{ name: 'default', status: 'changed', key: id }],
})

type TreeSummary = {
  children: Array<[string, { path: string } & TreeSummary]>
  components: Array<
    [string, { component: string; sourcePath: string; stories: string[] }]
  >
}

const summarizeNode = (
  node: StoryTreeNode | StoryTreeDirectory,
): TreeSummary => ({
  children: [...node.children].map(
    ([name, child]): TreeSummary['children'][number] => [
      name,
      {
        path: child.path,
        ...summarizeNode(child),
      },
    ],
  ),
  components: [...node.components].map(
    ([sourcePath, component]): TreeSummary['components'][number] => [
      sourcePath,
      {
        component: component.component,
        sourcePath: component.sourcePath,
        stories: component.stories.map((story) => story.id),
      },
    ],
  ),
})

const countOrZero = (node: StoryTreeNode | StoryTreeDirectory | undefined) =>
  node === undefined ? 0 : countStoriesInTree(node)

const summarizeTreeWithCounts = (tree: StoryTreeNode) => [
  summarizeNode(tree),
  [
    countStoriesInTree(tree),
    countOrZero(tree.children.get('src')),
    countOrZero(tree.children.get('src')?.children.get('controls')),
  ],
]

describe('story tree', () => {
  it('groups stories by directory and component while preserving insertion order', () => {
    const stories = [
      createStory('primary', 'AlphaWidget', 'src/controls/alpha.stories.tsx', [
        'src',
        'controls',
      ]),
      createStory(
        'secondary',
        'AlphaWidget',
        'src/controls/alpha.stories.tsx',
        ['src', 'controls'],
      ),
      createStory('banner', 'BetaBanner', 'src/layouts/beta.stories.tsx', [
        'src',
        'layouts',
      ]),
      createStory('standalone', 'Standalone', 'standalone', []),
    ]
    const tree = buildStoryTree(stories)

    expect(summarizeTreeWithCounts(tree)).toEqual([
      {
        children: [
          [
            'src',
            {
              path: 'src',
              children: [
                [
                  'controls',
                  {
                    path: 'src/controls',
                    children: [],
                    components: [
                      [
                        'src/controls/alpha.stories.tsx',
                        {
                          component: 'AlphaWidget',
                          sourcePath: 'src/controls/alpha.stories.tsx',
                          stories: ['primary', 'secondary'],
                        },
                      ],
                    ],
                  },
                ],
                [
                  'layouts',
                  {
                    path: 'src/layouts',
                    children: [],
                    components: [
                      [
                        'src/layouts/beta.stories.tsx',
                        {
                          component: 'BetaBanner',
                          sourcePath: 'src/layouts/beta.stories.tsx',
                          stories: ['banner'],
                        },
                      ],
                    ],
                  },
                ],
              ],
              components: [],
            },
          ],
        ],
        components: [
          [
            'standalone',
            {
              component: 'Standalone',
              sourcePath: 'standalone',
              stories: ['standalone'],
            },
          ],
        ],
      },
      [4, 3, 2],
    ])
  })
})
