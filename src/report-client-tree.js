import { getComponentStatuses, getVisibleStories } from '#report-client-logic'
import { buildStoryTree, countStoriesInTree } from '#report-tree'

export const createReportTree = ({ report, state, tree, renderList }) => {
  function createDirectory(node, name) {
    const details = document.createElement('details')
    details.className = 'tree-folder'
    details.open = true
    const summary = document.createElement('summary')
    summary.setAttribute(
      'aria-current',
      state.selection &&
        state.selection.kind === 'directory' &&
        state.selection.path === node.path
        ? 'true'
        : 'false',
    )
    const label = document.createElement('span')
    label.textContent = name
    const badge = document.createElement('span')
    badge.className = 'tree-count'
    badge.textContent = String(countStoriesInTree(node))
    summary.append(label, badge)
    summary.dataset.selectionKind = 'directory'
    summary.dataset.selectionPath = node.path
    summary.addEventListener('click', () => {
      state.selection = { kind: 'directory', path: node.path }
      updateTreeSelection()
      renderList()
    })
    details.append(summary)
    for (const [childName, child] of node.children)
      details.append(createDirectory(child, childName))
    for (const component of node.components.values())
      details.append(createComponent(component))
    return details
  }

  function createComponent(component) {
    const button = document.createElement('button')
    button.type = 'button'
    button.className = 'tree-component'
    button.setAttribute(
      'aria-pressed',
      state.selection &&
        state.selection.kind === 'component' &&
        state.selection.path === component.sourcePath
        ? 'true'
        : 'false',
    )
    button.dataset.selectionKind = 'component'
    button.dataset.selectionPath = component.sourcePath
    const statuses = getComponentStatuses(component.stories)
    const dot = document.createElement('span')
    dot.className = `tree-dot ${statuses.join(' ') || 'unchanged'}`
    const label = document.createElement('span')
    label.textContent = component.component
    const badge = document.createElement('span')
    badge.className = 'tree-count'
    badge.textContent = String(component.stories.length)
    button.append(dot, label, badge)
    button.addEventListener('click', () => {
      state.selection = { kind: 'component', path: component.sourcePath }
      updateTreeSelection()
      renderList()
    })
    return button
  }

  function renderTree() {
    tree.replaceChildren()
    const stories = getVisibleStories(report.stories, {
      query: state.query,
      filter: state.filter,
      selection: null,
    })
    const rootButton = document.createElement('button')
    rootButton.type = 'button'
    rootButton.className = 'tree-root'
    rootButton.setAttribute(
      'aria-pressed',
      state.selection === null ? 'true' : 'false',
    )
    rootButton.dataset.selectionKind = 'all'
    rootButton.dataset.selectionPath = ''
    rootButton.textContent = 'All stories'
    const rootCount = document.createElement('span')
    rootCount.className = 'tree-count'
    rootCount.textContent = String(stories.length)
    rootButton.append(rootCount)
    rootButton.addEventListener('click', () => {
      state.selection = null
      updateTreeSelection()
      renderList()
    })
    tree.append(rootButton)
    const root = buildStoryTree(stories)
    for (const [name, node] of root.children)
      tree.append(createDirectory(node, name))
    for (const component of root.components.values())
      tree.append(createComponent(component))
  }

  function updateTreeSelection() {
    for (const item of tree.querySelectorAll('[data-selection-kind]')) {
      const selected =
        state.selection === null
          ? item.dataset.selectionKind === 'all'
          : item.dataset.selectionKind === state.selection.kind &&
            item.dataset.selectionPath === state.selection.path
      if (item.tagName === 'SUMMARY')
        item.setAttribute('aria-current', String(selected))
      else item.setAttribute('aria-pressed', String(selected))
    }
  }

  return { renderTree, updateTreeSelection }
}
