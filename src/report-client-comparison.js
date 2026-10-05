const createReportComparison = ({
  state,
  storyLabel,
  titleCase,
  openDetail,
}) => {
  function createImageFallback(image, message) {
    const placeholder = document.createElement('span')
    placeholder.className = 'image-placeholder'
    placeholder.hidden = true
    placeholder.textContent = message
    let visible = true
    let failed = false
    const update = () => {
      image.hidden = !visible || failed
      placeholder.hidden = !visible || !failed
    }
    image.addEventListener('error', () => {
      failed = true
      update()
    })
    return {
      placeholder,
      setVisible(value) {
        visible = value
        update()
      },
    }
  }

  function createDiffMarkers(variant, detail) {
    if (!detail || !state.markersVisible || !hasDiffMarkers(variant))
      return null

    const regions = variant.diffRegions
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    svg.classList.add('diff-markers')
    svg.setAttribute('viewBox', '0 0 ' + regions.width + ' ' + regions.height)
    svg.setAttribute('preserveAspectRatio', 'xMidYMid meet')
    svg.setAttribute('aria-hidden', 'true')
    for (const rectangle of regions.rectangles) {
      const marker = document.createElementNS(
        'http://www.w3.org/2000/svg',
        'rect',
      )
      marker.setAttribute('x', String(rectangle.x))
      marker.setAttribute('y', String(rectangle.y))
      marker.setAttribute('width', String(rectangle.width))
      marker.setAttribute('height', String(rectangle.height))
      svg.append(marker)
    }
    return svg
  }

  function hasDiffMarkers(variant) {
    const regions = variant.diffRegions
    return (
      variant.status === 'changed' &&
      regions !== null &&
      regions !== undefined &&
      regions.width > 0 &&
      regions.height > 0 &&
      regions.rectangles.length > 0
    )
  }

  function appendDiffMarkers(container, variant, detail) {
    const markers = createDiffMarkers(variant, detail)
    if (markers) container.append(markers)
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
        storyLabel(story) +
        ' (' +
        variant.name +
        ')',
    )
    const image = document.createElement('img')
    image.alt = label + ': ' + storyLabel(story)
    image.loading = detail ? 'eager' : 'lazy'
    const fallback = createImageFallback(
      image,
      label === 'Diff' ? 'Diff unavailable' : 'Image unavailable',
    )
    image.src = source
    button.append(image, fallback.placeholder)
    appendDiffMarkers(button, variant, detail)
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
    slider.append(before, after)
    appendDiffMarkers(slider, variant, detail)
    slider.append(beforeLabel, afterLabel, input)
    return slider
  }

  function createBlend(variant, story, detail) {
    const blend = document.createElement('div')
    blend.className = 'blend'
    const before = document.createElement('img')
    before.alt = 'Before: ' + storyLabel(story)
    before.loading = 'eager'
    const beforeFallback = createImageFallback(before, 'Image unavailable')
    before.src = variant.before
    const after = document.createElement('img')
    after.className = 'blend-after'
    after.alt = 'After: ' + storyLabel(story)
    after.loading = 'eager'
    const afterFallback = createImageFallback(after, 'Image unavailable')
    after.src = variant.after
    after.style.opacity = '0.5'
    afterFallback.placeholder.style.opacity = '0.5'
    const input = document.createElement('input')
    input.className = 'blend-control'
    input.type = 'range'
    input.min = '0'
    input.max = '100'
    input.value = '50'
    input.setAttribute('aria-label', 'After image opacity')
    input.addEventListener('input', () => {
      const opacity = String(Number(input.value) / 100)
      after.style.opacity = opacity
      afterFallback.placeholder.style.opacity = opacity
    })
    const beforeLabel = document.createElement('span')
    beforeLabel.className = 'slider-label before'
    beforeLabel.textContent = 'Before'
    const afterLabel = document.createElement('span')
    afterLabel.className = 'slider-label after'
    afterLabel.textContent = 'After'
    blend.append(
      before,
      beforeFallback.placeholder,
      after,
      afterFallback.placeholder,
    )
    appendDiffMarkers(blend, variant, detail)
    blend.append(beforeLabel, afterLabel, input)
    return blend
  }

  function createToggle(variant, story, detail) {
    const toggle = document.createElement('div')
    toggle.className = 'toggle'
    const before = document.createElement('img')
    before.alt = 'Before: ' + storyLabel(story)
    before.loading = 'eager'
    const beforeFallback = createImageFallback(before, 'Image unavailable')
    before.src = variant.before
    const after = document.createElement('img')
    after.alt = 'After: ' + storyLabel(story)
    after.loading = 'eager'
    const afterFallback = createImageFallback(after, 'Image unavailable')
    after.src = variant.after
    afterFallback.setVisible(false)
    const control = document.createElement('label')
    control.className = 'toggle-control'
    const beforeLabel = document.createElement('span')
    beforeLabel.textContent = 'Before'
    const input = document.createElement('input')
    input.type = 'checkbox'
    input.setAttribute('aria-label', 'Show after image')
    input.addEventListener('change', () => {
      beforeFallback.setVisible(!input.checked)
      afterFallback.setVisible(input.checked)
    })
    const afterLabel = document.createElement('span')
    afterLabel.textContent = 'After'
    control.append(beforeLabel, input, afterLabel)
    toggle.append(
      before,
      beforeFallback.placeholder,
      after,
      afterFallback.placeholder,
    )
    appendDiffMarkers(toggle, variant, detail)
    toggle.append(control)
    return toggle
  }

  function createComparison(variant, story, detail) {
    if (
      variant.status === 'unchanged' ||
      (detail && variant.status !== 'changed')
    ) {
      const label =
        variant.status === 'deleted'
          ? 'Before'
          : variant.status === 'unchanged'
            ? 'Current'
            : 'After'
      const source =
        variant.status === 'deleted' ? variant.before : variant.after
      return wrapComparison(createPane(label, source, story, variant, detail))
    }
    if (detail && state.detailView === 'diff') {
      return wrapComparison(
        createPane('Diff', variant.diff, story, variant, detail),
      )
    }
    if (detail && state.detailView === 'slide') {
      return wrapComparison(
        createContentPane(createSlider(variant, story, detail)),
      )
    }
    if (detail && state.detailView === 'blend') {
      return wrapComparison(
        createContentPane(createBlend(variant, story, detail)),
      )
    }
    if (detail && state.detailView === 'toggle') {
      return wrapComparison(
        createContentPane(createToggle(variant, story, detail)),
      )
    }
    if (!detail && state.view === 'diff') {
      return wrapComparison(
        createPane('Diff', variant.diff, story, variant, detail),
      )
    }
    if (!detail && state.view === 'slider' && variant.before && variant.after) {
      return wrapComparison(
        createContentPane(createSlider(variant, story, detail)),
      )
    }
    return wrapComparison(
      createPane('Before', variant.before, story, variant, detail),
      createPane('After', variant.after, story, variant, detail),
    )
  }

  function createContentPane(content) {
    const pane = document.createElement('div')
    pane.className = 'pane'
    pane.append(content)
    return pane
  }

  function wrapComparison(...children) {
    const comparison = document.createElement('div')
    comparison.className = 'comparison'
    comparison.append(...children)
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

  return { createVariant, hasDiffMarkers }
}
