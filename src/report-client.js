;(() => {
  const report = JSON.parse(document.getElementById('report-data').textContent)
  const state = {
    query: '',
    filter: 'changes',
    view: 'pair',
    detailView: 'slide',
    selection: null,
  }
  const tree = document.getElementById('story-tree')
  const storyList = document.getElementById('story-list')
  const count = document.getElementById('list-count')
  const search = document.getElementById('story-search')
  const dialog = document.getElementById('detail-dialog')
  const dialogTitle = document.getElementById('detail-title')
  const dialogVariant = document.getElementById('detail-variant')
  const dialogContent = document.getElementById('detail-content')
  const detailModes = document.getElementById('detail-modes')

  const titleCase = (status) => status.charAt(0).toUpperCase() + status.slice(1)
  const storyLabel = (story) => story.displayName ?? story.storyId
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
  const hasChanges = (statuses) => statuses.length > 0
  const countStoriesWithChanges = () =>
    report.stories.filter((story) => hasChanges(storyStatuses(story))).length
  const countPassedStories = () =>
    report.stories.filter((story) => !hasChanges(storyStatuses(story))).length
  const matchesSearch = (story) => {
    if (!state.query) return true
    const text = [
      story.storyId,
      story.displayName,
      story.component,
      story.sourcePath,
      ...story.variants.map((variant) => variant.name),
    ]
      .join(' ')
      .toLowerCase()
    return text.includes(state.query)
  }
  const matchesFilter = (story) => {
    const statuses = storyStatuses(story)
    return (
      state.filter === 'all' ||
      (state.filter === 'changes' && hasChanges(statuses)) ||
      (state.filter === 'passed' && !hasChanges(statuses)) ||
      statuses.includes(state.filter)
    )
  }
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

  const { renderTree, updateTreeSelection } = createReportTree({
    report,
    state,
    tree,
    matchesSearch,
    matchesFilter,
    renderList,
    storyStatuses,
  })

  const { createVariant } = createReportComparison({
    state,
    storyLabel,
    titleCase,
    openDetail,
  })

  let detailSelection = null
  for (const [view, label] of [
    ['diff', 'Diff'],
    ['slide', 'Slide'],
    ['2up', '2up'],
    ['blend', 'Blend'],
    ['toggle', 'Toggle'],
  ]) {
    const button = document.createElement('button')
    button.type = 'button'
    button.className = 'detail-mode'
    button.dataset.mode = view
    button.setAttribute('aria-pressed', String(view === state.detailView))
    button.textContent = label
    button.addEventListener('click', () => {
      state.detailView = view
      renderDetail()
    })
    detailModes.append(button)
  }

  function renderDetail() {
    if (detailSelection === null) return
    for (const button of detailModes.querySelectorAll('.detail-mode'))
      button.setAttribute(
        'aria-pressed',
        String(button.dataset.mode === state.detailView),
      )
    dialogContent.replaceChildren(
      createVariant(detailSelection.variant, detailSelection.story, true),
    )
  }

  function openDetail(story, variant) {
    detailSelection = { story, variant }
    dialogTitle.textContent = story.component + ' / ' + storyLabel(story)
    dialogVariant.textContent = variant.name
    detailModes.hidden = variant.status !== 'changed'
    renderDetail()
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
    title.textContent = storyLabel(story)
    const component = document.createElement('span')
    component.className = 'story-component'
    component.textContent = story.component
    head.append(title, component)
    const variants = document.createElement('div')
    variants.className = 'variant-list'
    const changedVariants = story.variants.filter(
      (variant) => variant.status !== 'unchanged',
    )
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

  const filters = document.getElementById('filters')
  for (const [filter, label, value] of [
    ['changes', 'Changes', countStoriesWithChanges()],
    ['all', 'All', report.stories.length],
    ['changed', 'Changed', countStoriesWithStatus('changed')],
    ['new', 'New', countStoriesWithStatus('new')],
    ['deleted', 'Deleted', countStoriesWithStatus('deleted')],
    ['passed', 'Passed', countPassedStories()],
  ]) {
    const button = document.createElement('button')
    button.type = 'button'
    button.className = 'filter ' + filter
    button.setAttribute('aria-pressed', String(filter === state.filter))
    const filterLabel = document.createElement('span')
    filterLabel.textContent = label
    const filterCount = document.createElement('strong')
    filterCount.className = 'filter-count'
    filterCount.textContent = String(value)
    button.append(filterLabel, filterCount)
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
