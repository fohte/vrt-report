import type { ReportStory } from '#report-logic'

type StoryTreeComponent = {
  component: string
  sourcePath: string
  stories: ReportStory[]
}

export type StoryTreeNode = {
  children: Map<string, StoryTreeDirectory>
  components: Map<string, StoryTreeComponent>
}

export type StoryTreeDirectory = StoryTreeNode & { path: string }

export const buildStoryTree = (stories: ReportStory[]): StoryTreeNode => {
  const root: StoryTreeNode = { children: new Map(), components: new Map() }
  for (const story of stories) {
    let node = root
    const path: string[] = []
    for (const directory of story.directories) {
      path.push(directory)
      let child = node.children.get(directory)
      if (child === undefined) {
        child = {
          children: new Map(),
          components: new Map(),
          path: path.join('/'),
        }
        node.children.set(directory, child)
      }
      node = child
    }
    let component = node.components.get(story.sourcePath)
    if (component === undefined) {
      component = {
        component: story.component,
        sourcePath: story.sourcePath,
        stories: [],
      }
      node.components.set(story.sourcePath, component)
    }
    component.stories.push(story)
  }
  return root
}

export const countStoriesInTree = (node: StoryTreeNode): number => {
  let total = [...node.components.values()].reduce(
    (sum, component) => sum + component.stories.length,
    0,
  )
  for (const child of node.children.values()) total += countStoriesInTree(child)
  return total
}
