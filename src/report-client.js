;(() => {
  const report = JSON.parse(document.getElementById('report-data').textContent)
  const state = { query: '', filter: 'all', view: 'pair', selection: null }
  const tree = document.getElementById('story-tree')
  const storyList = document.getElementById('story-list')
  const count = document.getElementById('list-count')
  const search = document.getElementById('story-search')
  const dialog = document.getElementById('detail-dialog')
  const dialogTitle = document.getElementById('detail-title')
  const dialogVariant = document.getElementById('detail-variant')
  const dialogContent = document.getElementById('detail-content')

  const titleCase = (status) => status.charAt(0).toUpperCase() + status.slice(1)
  const storyStatuses = (story) => [
    ...new Set(
      story.variants
        .map((variant) => variant.status)
        .filter((status) => status !== 'unchanged'),
    ),
  ]
  const countStoriesWithStatus = (status) =>
    report.stories.filter((story) => storyStatuses(story).includes(status))
      .length
  const matchesSearch = (story) => {
    if (!state.query) return true
    const text = [
      story.storyId,
      story.component,
      story.sourcePath,
      ...story.variants.map((variant) => variant.name),
    ]
      .join(' ')
      .toLowerCase()
    return text.includes(state.query)
  }
  const matchesFilter = (story) =>
    state.filter === 'all' || storyStatuses(story).includes(state.filter)
  const matchesSelection = (story) => {
    if (!state.selection) return true
    if (state.selection.kind === 'component')
      return story.sourcePath === state.selection.path
    const directoryPath = story.directories.join('/')
    return (
      directoryPath === state.selection.path ||
      directoryPath.startsWith(state.selection.path + '/')
    )
  }
  const visibleStories = () =>
    report.stories.filter(
      (story) =>
        matchesSearch(story) && matchesFilter(story) && matchesSelection(story),
    )

  function appendBadge(parent, status) {
    const badge = document.createElement('span')
    badge.className = 'status ' + status
    badge.textContent = titleCase(status)
    parent.append(badge)
  }

  function buildTree(stories) {
    const root = { children: new Map(), components: new Map() }
    for (const story of stories) {
      let node = root
      const path = []
      for (const directory of story.directories) {
        path.push(directory)
        if (!node.children.has(directory))
          node.children.set(directory, {
            children: new Map(),
            components: new Map(),
            path: path.join('/'),
          })
        node = node.children.get(directory)
      }
      if (!node.components.has(story.sourcePath))
        node.components.set(story.sourcePath, {
          component: story.component,
          sourcePath: story.sourcePath,
          stories: [],
        })
      node.components.get(story.sourcePath).stories.push(story)
    }
    return root
  }

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
    badge.textContent = String(countStories(node))
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

  function countStories(node) {
    let total = [...node.components.values()].reduce(
      (sum, component) => sum + component.stories.length,
      0,
    )
    for (const child of node.children.values()) total += countStories(child)
    return total
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
    const statuses = [...new Set(component.stories.flatMap(storyStatuses))]
    const dot = document.createElement('span')
    dot.className = 'tree-dot ' + (statuses.length === 1 ? statuses[0] : '')
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
    const stories = report.stories.filter(
      (story) => matchesSearch(story) && matchesFilter(story),
    )
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
    const root = buildTree(stories)
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
      if (item instanceof HTMLSummaryElement)
        item.setAttribute('aria-current', String(selected))
      else item.setAttribute('aria-pressed', String(selected))
    }
  }

  function createPane(label, source, story, variant, detail) {
    const pane = document.createElement('div')
    pane.className = 'pane'
    const paneLabel = document.createElement('div')
    paneLabel.className = 'pane-label'
    paneLabel.textContent = label
    pane.append(paneLabel)
    if (!source) {
      const placeholder = document.createElement('div')
      placeholder.className = 'image-placeholder'
      placeholder.textContent =
        label === 'Before'
          ? 'No baseline image'
          : label === 'After'
            ? 'No current image'
            : 'Diff unavailable'
      pane.append(placeholder)
      return pane
    }
    const button = document.createElement('button')
    button.type = 'button'
    button.className = 'image-button'
    button.setAttribute(
      'aria-label',
      'Open ' +
        label +
        ' image for ' +
        story.storyId +
        ' (' +
        variant.name +
        ')',
    )
    const image = document.createElement('img')
    image.src = source
    image.alt = label + ': ' + story.storyId
    image.loading = detail ? 'eager' : 'lazy'
    const placeholder = document.createElement('span')
    placeholder.className = 'image-placeholder'
    placeholder.hidden = true
    placeholder.textContent =
      label === 'Diff' ? 'Diff unavailable' : 'Image unavailable'
    image.addEventListener('error', () => {
      image.hidden = true
      placeholder.hidden = false
    })
    button.append(image, placeholder)
    button.addEventListener('click', () => openDetail(story, variant))
    pane.append(button)
    return pane
  }

  function createSlider(variant, story, detail) {
    const slider = document.createElement('div')
    slider.className = 'slider'
    const before = document.createElement('img')
    before.src = variant.before
    before.alt = 'Before: ' + story.storyId
    before.loading = detail ? 'eager' : 'lazy'
    const after = document.createElement('img')
    after.className = 'slider-after'
    after.src = variant.after
    after.alt = 'After: ' + story.storyId
    after.loading = detail ? 'eager' : 'lazy'
    const input = document.createElement('input')
    input.className = 'slider-control'
    input.type = 'range'
    input.min = '0'
    input.max = '100'
    input.value = '50'
    input.setAttribute('aria-label', 'Compare before and after images')
    input.addEventListener('input', () => {
      after.style.clipPath = 'inset(0 0 0 ' + Number(input.value) + '%)'
    })
    const beforeLabel = document.createElement('span')
    beforeLabel.className = 'slider-label before'
    beforeLabel.textContent = 'Before'
    const afterLabel = document.createElement('span')
    afterLabel.className = 'slider-label after'
    afterLabel.textContent = 'After'
    slider.append(before, after, beforeLabel, afterLabel, input)
    return slider
  }

  function createComparison(variant, story, detail) {
    if (variant.status === 'unchanged') {
      const comparison = document.createElement('div')
      comparison.className = 'comparison'
      comparison.append(
        createPane('Current', variant.after, story, variant, detail),
      )
      return comparison
    }
    if (state.view === 'diff') {
      const comparison = document.createElement('div')
      comparison.className = 'comparison'
      comparison.append(
        createPane('Diff', variant.diff, story, variant, detail),
      )
      return comparison
    }
    if (state.view === 'slider' && variant.before && variant.after) {
      const comparison = document.createElement('div')
      comparison.className = 'comparison'
      const pane = document.createElement('div')
      pane.className = 'pane'
      pane.append(createSlider(variant, story, detail))
      comparison.append(pane)
      return comparison
    }
    const comparison = document.createElement('div')
    comparison.className = 'comparison'
    comparison.append(
      createPane('Before', variant.before, story, variant, detail),
    )
    comparison.append(
      createPane('After', variant.after, story, variant, detail),
    )
    return comparison
  }

  function createVariant(variant, story, detail) {
    const section = document.createElement('section')
    section.className = 'variant'
    const heading = document.createElement('h3')
    heading.className = 'variant-head'
    const name = document.createElement('span')
    name.textContent = variant.name
    heading.append(name)
    if (variant.status !== 'unchanged') {
      const status = document.createElement('span')
      status.className = 'variant-status ' + variant.status
      status.textContent = titleCase(variant.status)
      heading.append(status)
    }
    section.append(heading, createComparison(variant, story, detail))
    return section
  }

  function openDetail(story, variant) {
    dialogTitle.textContent = story.component + ' / ' + story.storyId
    dialogVariant.textContent = variant.name
    dialogContent.replaceChildren(createVariant(variant, story, true))
    dialog.showModal()
  }

  function createStory(story) {
    const article = document.createElement('article')
    article.className = 'story'
    const head = document.createElement('header')
    head.className = 'story-head'
    for (const status of storyStatuses(story)) appendBadge(head, status)
    const title = document.createElement('strong')
    title.className = 'story-title'
    title.textContent = story.storyId
    const component = document.createElement('span')
    component.className = 'story-component'
    component.textContent = story.component
    head.append(title, component)
    const variants = document.createElement('div')
    variants.className = 'variant-list'
    const changedVariants = story.variants.filter(
      (variant) => variant.status !== 'unchanged',
    )
    for (const variant of changedVariants)
      variants.append(createVariant(variant, story, false))
    article.append(head, variants)
    const unchanged = story.variants.filter(
      (variant) => variant.status === 'unchanged',
    )
    const initialVariants =
      changedVariants.length > 0 ? changedVariants : unchanged
    for (const variant of initialVariants)
      variants.append(createVariant(variant, story, false))
    if (changedVariants.length > 0 && unchanged.length > 0) {
      const toggle = document.createElement('button')
      toggle.type = 'button'
      toggle.className = 'show-unchanged'
      toggle.textContent = 'Show ' + unchanged.length + ' unchanged variants'
      toggle.setAttribute('aria-expanded', 'false')
      toggle.addEventListener('click', () => {
        const open = toggle.getAttribute('aria-expanded') === 'true'
        toggle.setAttribute('aria-expanded', String(!open))
        toggle.textContent =
          (open ? 'Show ' : 'Hide ') + unchanged.length + ' unchanged variants'
        if (open) {
          variants
            .querySelectorAll('[data-unchanged="true"]')
            .forEach((item) => item.remove())
        } else {
          for (const variant of unchanged) {
            const section = createVariant(variant, story, false)
            section.dataset.unchanged = 'true'
            variants.append(section)
          }
        }
      })
      article.append(toggle)
    }
    return article
  }

  function renderList() {
    const stories = visibleStories()
    count.textContent =
      stories.length + (stories.length === 1 ? ' story' : ' stories')
    storyList.replaceChildren()
    if (stories.length === 0) {
      const empty = document.createElement('div')
      empty.className = 'empty-state'
      empty.textContent = 'No stories match this filter.'
      storyList.append(empty)
      return
    }
    for (const story of stories) storyList.append(createStory(story))
  }

  function render() {
    renderTree()
    renderList()
  }

  const summary = document.getElementById('summary')
  for (const [status, label] of [
    ['changed', 'Changed'],
    ['new', 'New'],
    ['deleted', 'Deleted'],
    ['passed', 'Passed'],
  ]) {
    const item = document.createElement('span')
    item.className = 'summary-item ' + status
    item.textContent = label
    const value = document.createElement('strong')
    value.textContent = String(report.counts[status])
    item.append(value)
    summary.append(item)
  }

  const filters = document.getElementById('filters')
  for (const [filter, label, value] of [
    ['all', 'All', report.stories.length],
    ['changed', 'Changed', countStoriesWithStatus('changed')],
    ['new', 'New', countStoriesWithStatus('new')],
    ['deleted', 'Deleted', countStoriesWithStatus('deleted')],
  ]) {
    const button = document.createElement('button')
    button.type = 'button'
    button.className = 'filter'
    button.setAttribute('aria-pressed', String(filter === state.filter))
    button.textContent = label + ' ' + value
    button.addEventListener('click', () => {
      state.filter = filter
      for (const item of filters.querySelectorAll('.filter'))
        item.setAttribute('aria-pressed', String(item === button))
      render()
    })
    filters.append(button)
  }

  const modes = document.getElementById('view-modes')
  for (const [view, label] of [
    ['pair', 'Before + After'],
    ['diff', 'Diff'],
    ['slider', 'Slider'],
  ]) {
    const button = document.createElement('button')
    button.type = 'button'
    button.className = 'mode'
    button.setAttribute('aria-pressed', String(view === state.view))
    button.textContent = label
    button.addEventListener('click', () => {
      state.view = view
      for (const item of modes.querySelectorAll('.mode'))
        item.setAttribute('aria-pressed', String(item === button))
      renderList()
    })
    modes.append(button)
  }

  search.addEventListener('input', () => {
    state.query = search.value.trim().toLowerCase()
    render()
  })
  document
    .getElementById('detail-close')
    .addEventListener('click', () => dialog.close())
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) dialog.close()
  })
  render()
})()
