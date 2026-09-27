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
    if (!detail)
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
    before.draggable = false
    const after = document.createElement('img')
    after.className = 'slider-after'
    after.src = variant.after
    after.alt = 'After: ' + storyLabel(story)
    after.loading = detail ? 'eager' : 'lazy'
    after.draggable = false
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
    let pointerId = null
    let pointerStart = null
    let dragged = false
    let clickImage = false
    const updateValue = (clientX) => {
      const bounds = slider.getBoundingClientRect()
      if (bounds.width === 0) return
      input.value = String(((clientX - bounds.left) / bounds.width) * 100)
      input.dispatchEvent(new Event('input', { bubbles: true }))
    }
    slider.addEventListener('pointerdown', (event) => {
      if (event.button !== 0 || event.target === input) return
      pointerId = event.pointerId
      pointerStart = { x: event.clientX, y: event.clientY }
      dragged = false
      clickImage = event.target instanceof HTMLImageElement
      slider.setPointerCapture(event.pointerId)
      updateValue(event.clientX)
    })
    slider.addEventListener('pointermove', (event) => {
      if (event.pointerId !== pointerId || pointerStart === null) return
      const distance = Math.hypot(
        event.clientX - pointerStart.x,
        event.clientY - pointerStart.y,
      )
      if (!dragged && distance > 3) dragged = true
      if (dragged) updateValue(event.clientX)
    })
    slider.addEventListener('pointerup', (event) => {
      if (event.pointerId !== pointerId) return
      pointerId = null
      pointerStart = null
    })
    slider.addEventListener('pointercancel', () => {
      pointerId = null
      pointerStart = null
      dragged = false
      clickImage = false
    })
    slider.addEventListener('click', (event) => {
      if (detail || event.target === input) return
      if (dragged) {
        dragged = false
        clickImage = false
        event.preventDefault()
        return
      }
      if (!(event.target instanceof HTMLImageElement) && !clickImage) return
      clickImage = false
      openDetail(story, variant)
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

  function createBlend(variant, story) {
    const blend = document.createElement('div')
    blend.className = 'blend'
    const before = document.createElement('img')
    before.src = variant.before
    before.alt = 'Before: ' + storyLabel(story)
    before.loading = 'eager'
    const after = document.createElement('img')
    after.className = 'blend-after'
    after.src = variant.after
    after.alt = 'After: ' + storyLabel(story)
    after.loading = 'eager'
    after.style.opacity = '0.5'
    const input = document.createElement('input')
    input.className = 'blend-control'
    input.type = 'range'
    input.min = '0'
    input.max = '100'
    input.value = '50'
    input.setAttribute('aria-label', 'After image opacity')
    input.addEventListener('input', () => {
      after.style.opacity = String(Number(input.value) / 100)
    })
    const beforeLabel = document.createElement('span')
    beforeLabel.className = 'slider-label before'
    beforeLabel.textContent = 'Before'
    const afterLabel = document.createElement('span')
    afterLabel.className = 'slider-label after'
    afterLabel.textContent = 'After'
    blend.append(before, after, beforeLabel, afterLabel, input)
    return blend
  }

  function createToggle(variant, story) {
    const toggle = document.createElement('div')
    toggle.className = 'toggle'
    const before = document.createElement('img')
    before.src = variant.before
    before.alt = 'Before: ' + storyLabel(story)
    before.loading = 'eager'
    const after = document.createElement('img')
    after.src = variant.after
    after.alt = 'After: ' + storyLabel(story)
    after.loading = 'eager'
    after.hidden = true
    const control = document.createElement('label')
    control.className = 'toggle-control'
    const beforeLabel = document.createElement('span')
    beforeLabel.textContent = 'Before'
    const input = document.createElement('input')
    input.type = 'checkbox'
    input.setAttribute('aria-label', 'Show after image')
    input.addEventListener('change', () => {
      before.hidden = input.checked
      after.hidden = !input.checked
    })
    const afterLabel = document.createElement('span')
    afterLabel.textContent = 'After'
    control.append(beforeLabel, input, afterLabel)
    toggle.append(before, after, control)
    return toggle
  }

  function createComparison(variant, story, detail) {
    if (
      variant.status === 'unchanged' ||
      (detail && variant.status !== 'changed')
    ) {
      const comparison = document.createElement('div')
      comparison.className = 'comparison'
      const label =
        variant.status === 'deleted'
          ? 'Before'
          : variant.status === 'unchanged'
            ? 'Current'
            : 'After'
      const source =
        variant.status === 'deleted' ? variant.before : variant.after
      comparison.append(createPane(label, source, story, variant, detail))
      return comparison
    }
    if (detail && state.detailView === 'diff') {
      const comparison = document.createElement('div')
      comparison.className = 'comparison'
      comparison.append(
        createPane('Diff', variant.diff, story, variant, detail),
      )
      return comparison
    }
    if (detail && state.detailView === 'slide') {
      const comparison = document.createElement('div')
      comparison.className = 'comparison'
      const pane = document.createElement('div')
      pane.className = 'pane'
      pane.append(createSlider(variant, story, detail))
      comparison.append(pane)
      return comparison
    }
    if (detail && state.detailView === 'blend') {
      const comparison = document.createElement('div')
      comparison.className = 'comparison'
      const pane = document.createElement('div')
      pane.className = 'pane'
      pane.append(createBlend(variant, story))
      comparison.append(pane)
      return comparison
    }
    if (detail && state.detailView === 'toggle') {
      const comparison = document.createElement('div')
      comparison.className = 'comparison'
      const pane = document.createElement('div')
      pane.className = 'pane'
      pane.append(createToggle(variant, story))
      comparison.append(pane)
      return comparison
    }
    if (!detail && state.view === 'diff') {
      const comparison = document.createElement('div')
      comparison.className = 'comparison'
      comparison.append(
        createPane('Diff', variant.diff, story, variant, detail),
      )
      return comparison
    }
    if (!detail && state.view === 'slider' && variant.before && variant.after) {
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
