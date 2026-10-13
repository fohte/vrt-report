import { Chip } from '@fohte/ui/chip'
import { Input } from '@fohte/ui/input'
import { List, ListItem } from '@fohte/ui/list'

import {
  getComponentStatuses,
  type ReportSelection,
  type ReportStatus,
  type ReportStoryView,
} from '#report-logic'
import {
  buildStoryTree,
  countStoriesInTree,
  type StoryTreeComponent,
  type StoryTreeDirectory,
  type StoryTreeNode,
} from '#report-tree'

export type ReportSidebarProps = {
  query: string
  stories: ReportStoryView[]
  selection: ReportSelection
  collapsedDirectories?: string[]
  onQueryChange: (query: string) => void
  onSelectionChange: (selection: ReportSelection) => void
}

const statusColor: Record<ReportStatus, string> = {
  changed: 'bg-tint-orange-foreground',
  new: 'bg-tint-green-foreground',
  deleted: 'bg-destructive',
  unchanged: 'bg-muted-foreground-faint',
}

export function ReportSidebar({
  query,
  stories,
  selection,
  collapsedDirectories = [],
  onQueryChange,
  onSelectionChange,
}: ReportSidebarProps) {
  const tree = buildStoryTree(stories)

  const renderComponent = (component: StoryTreeComponent) => {
    const selected =
      selection?.kind === 'component' && selection.path === component.sourcePath
    const componentStatuses = getComponentStatuses(component.stories)
    const visibleStatuses: ReportStatus[] =
      componentStatuses.length > 0 ? componentStatuses : ['unchanged']

    return (
      <ListItem
        key={component.sourcePath}
        selected={selected}
        highlighted={selected}
        indent={0.5}
        onSelect={() => {
          onSelectionChange({ kind: 'component', path: component.sourcePath })
        }}
      >
        <span className="flex min-w-0 flex-1 items-center gap-2">
          <span
            aria-hidden="true"
            className="inline-flex shrink-0 items-center gap-0.5"
          >
            {visibleStatuses.map((status) => (
              <span
                key={status}
                className={`size-1.5 rounded-full ${statusColor[status]}`}
              />
            ))}
          </span>
          <span className="truncate">{component.component}</span>
        </span>
        <Chip>{component.stories.length}</Chip>
      </ListItem>
    )
  }

  const renderDirectory = (node: StoryTreeDirectory, name: string) => {
    const selected =
      selection?.kind === 'directory' && selection.path === node.path

    return (
      <details
        key={node.path}
        role="listitem"
        open={!collapsedDirectories.includes(node.path)}
        className="group/tree-folder"
      >
        <summary
          aria-current={selected ? 'page' : undefined}
          onClick={() => {
            onSelectionChange({ kind: 'directory', path: node.path })
          }}
          className="flex min-h-9 cursor-pointer list-none items-center gap-2 rounded-md px-3 text-sm text-muted-foreground outline-none hover:bg-accent/50 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring aria-current:page:bg-accent aria-current:page:text-foreground"
        >
          <span className="size-3 shrink-0 transition-transform group-open/tree-folder:rotate-90">
            ›
          </span>
          <span className="min-w-0 flex-1 truncate">{name}</span>
          <Chip>{countStoriesInTree(node)}</Chip>
        </summary>
        <div className="ml-3 border-l border-border pl-1">
          <List>
            {[...node.children].map(([childName, child]) =>
              renderDirectory(child, childName),
            )}
            {[...node.components.values()].map(renderComponent)}
          </List>
        </div>
      </details>
    )
  }

  const rootTree: StoryTreeNode = tree

  return (
    <aside
      aria-label="Story navigation"
      className="flex min-w-0 flex-col gap-3 border-b border-border bg-sidebar px-3 py-4 md:sticky md:top-16 md:h-[calc(100vh-4rem)] md:w-64 md:flex-none md:self-start md:overflow-auto md:border-b-0 md:border-r"
    >
      <label className="sr-only" htmlFor="report-story-search">
        Filter stories
      </label>
      <Input
        id="report-story-search"
        type="search"
        value={query}
        placeholder="Filter stories"
        autoComplete="off"
        onChange={(event) => {
          onQueryChange(event.currentTarget.value)
        }}
      />

      <List>
        <ListItem
          selected={selection === null}
          highlighted={selection === null}
          onSelect={() => {
            onSelectionChange(null)
          }}
        >
          <span className="min-w-0 flex-1 truncate font-medium">
            All stories
          </span>
          <Chip>{stories.length}</Chip>
        </ListItem>
        {[...rootTree.children].map(([name, node]) =>
          renderDirectory(node, name),
        )}
        {[...rootTree.components.values()].map(renderComponent)}
      </List>

      {stories.length === 0 && (
        <p className="px-3 py-2 text-sm text-muted-foreground">
          No stories match this filter.
        </p>
      )}
    </aside>
  )
}
