const createReportComparison = ({
  state,
  storyLabel,
  titleCase,
  openDetail,
}) => {
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
        storyLabel(story) +
        ' (' +
        variant.name +
        ')',
    )
    const image = document.createElement('img')
    image.src = source
    image.alt = label + ': ' + storyLabel(story)
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
    before.alt = 'Before: ' + storyLabel(story)
    before.loading = detail ? 'eager' : 'lazy'
    const after = document.createElement('img')
    after.className = 'slider-after'
    after.src = variant.after
    after.alt = 'After: ' + storyLabel(story)
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

  return { createVariant }
}
