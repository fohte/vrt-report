import { err, ok, ResultAsync } from 'neverthrow'

const toError = (cause) =>
  cause instanceof Error ? cause : new Error(String(cause))

const runCheck = async (name, action) => {
  const result = await ResultAsync.fromPromise(action(), toError).andThen(
    (checkResult) => checkResult,
  )
  return result.mapErr((error) => new Error(`${name}: ${error.message}`))
}

const closeDetail = async (page) => {
  const dialog = page.locator('#detail-dialog')
  if (await dialog.isVisible()) {
    await page.locator('#detail-close').click()
    await dialog.waitFor({ state: 'hidden' })
    await page.waitForFunction(
      () => !new URL(window.location.href).searchParams.has('id'),
    )
  }
}

const visibleDetailIds = (page) =>
  page
    .locator('#story-list .variant[data-detail-id]')
    .evaluateAll((sections) =>
      sections.map((section) => section.dataset.detailId),
    )

const currentDetailId = (page) => new URL(page.url()).searchParams.get('id')

const outputMatches = (name, actual, expected) =>
  JSON.stringify(actual) === JSON.stringify(expected)
    ? ok(undefined)
    : err(
        new Error(`${name} mismatch: ${JSON.stringify({ expected, actual })}`),
      )

const openSliderDetail = async (page, mode) => {
  await closeDetail(page)
  await page.getByRole('button', { name: 'Slider' }).click()
  const changedVariant = page
    .locator('.variant:has(.variant-status.changed)')
    .first()
  const slider = changedVariant.locator('.slider')
  const bounds = await slider.boundingBox()
  if (bounds === null)
    return err(new Error('The list comparison slider is not visible.'))

  await slider.click({
    position: { x: bounds.width * 0.95, y: bounds.height / 2 },
  })
  const dialog = page.locator('#detail-dialog')
  if (!(await dialog.isVisible()))
    return err(new Error('The list comparison image did not open its detail.'))
  if (mode !== undefined)
    await page.locator(`#detail-modes [data-mode="${mode}"]`).click()
  return ok(dialog)
}

const verifyListSliderKeyboard = (page) =>
  runCheck('list slider keyboard', async () => {
    await closeDetail(page)
    await page.getByRole('button', { name: 'Slider' }).click()
    const range = page
      .locator('.variant:has(.variant-status.changed)')
      .first()
      .locator('.slider-control')
    const initialValue = Number(await range.inputValue())
    await range.focus()
    await range.press('ArrowRight')
    if (Number(await range.inputValue()) === initialValue)
      return err(new Error('The list slider did not respond to keys.'))
    return ok(undefined)
  })

const verifyListSliderDrag = (page) =>
  runCheck('list slider drag', async () => {
    await closeDetail(page)
    await page.getByRole('button', { name: 'Slider' }).click()
    const variant = page
      .locator('.variant:has(.variant-status.changed)')
      .first()
    const slider = variant.locator('.slider')
    const range = slider.locator('.slider-control')
    const bounds = await slider.boundingBox()
    if (bounds === null)
      return err(new Error('The list comparison slider is not visible.'))

    const y = bounds.y + bounds.height / 2
    await page.mouse.move(bounds.x + bounds.width * 0.25, y)
    await page.mouse.down()
    await page.mouse.move(bounds.x + bounds.width * 0.75, y, { steps: 5 })
    await page.mouse.up()
    if (Number(await range.inputValue()) < 60)
      return err(new Error('Dragging the comparison image did not move it.'))
    return ok(undefined)
  })

const verifyDetailOpensOnClick = (page) =>
  runCheck('detail opens from slider image', async () => {
    const result = await openSliderDetail(page)
    if (result.isErr()) return result
    await closeDetail(page)
    return ok(undefined)
  })

const verifyDetailDefaultsToSlide = (page) =>
  runCheck('detail defaults to Slide', async () => {
    const result = await openSliderDetail(page)
    if (result.isErr()) return result
    const isSelected =
      (await page
        .locator('#detail-modes [data-mode="slide"]')
        .getAttribute('aria-pressed')) === 'true'
    await closeDetail(page)
    if (!isSelected) return err(new Error('The detail mode is not Slide.'))
    return ok(undefined)
  })

const verifyDetailNavigationFollowsVisibleOrder = (page) =>
  runCheck('detail navigation order and keyboard shortcuts', async () => {
    const result = await openSliderDetail(page, 'slide')
    if (result.isErr()) return result
    const ids = await visibleDetailIds(page)
    const initialId = currentDetailId(page)
    const initialIndex = ids.indexOf(initialId)
    if (initialIndex < 0 || ids.length < 2)
      return err(
        new Error('The opened image is missing from the visible list.'),
      )

    const nextId = ids[(initialIndex + 1) % ids.length]
    const previousId = ids[(initialIndex - 1 + ids.length) % ids.length]
    await page.getByRole('button', { name: 'Next image' }).click()
    const afterNextButton = currentDetailId(page)
    await page.getByRole('button', { name: 'Previous image' }).click()
    const afterPreviousButton = currentDetailId(page)
    await page.keyboard.press('ArrowRight')
    const afterArrowRight = currentDetailId(page)
    await page.keyboard.press('ArrowLeft')
    const afterArrowLeft = currentDetailId(page)
    await page.keyboard.press('h')
    const afterPreviousShortcut = currentDetailId(page)
    await page.keyboard.press('l')
    const afterNextShortcut = currentDetailId(page)
    const actual = {
      afterNextButton,
      afterPreviousButton,
      afterArrowRight,
      afterArrowLeft,
      afterPreviousShortcut,
      afterNextShortcut,
    }
    const expected = {
      afterNextButton: nextId,
      afterPreviousButton: initialId,
      afterArrowRight: nextId,
      afterArrowLeft: initialId,
      afterPreviousShortcut: previousId,
      afterNextShortcut: initialId,
    }
    await closeDetail(page)
    return outputMatches('detail navigation', actual, expected)
  })

const verifyDetailUrlHistoryAndDirectLink = (page) =>
  runCheck('detail URL, browser history, and direct link', async () => {
    const result = await openSliderDetail(page, 'slide')
    if (result.isErr()) return result
    const ids = await visibleDetailIds(page)
    const initialId = currentDetailId(page)
    const initialIndex = ids.indexOf(initialId)
    if (initialIndex < 0 || ids.length < 2)
      return err(
        new Error('The opened image is missing from the visible list.'),
      )

    const nextId = ids[(initialIndex + 1) % ids.length]
    await page.getByRole('button', { name: 'Next image' }).click()
    const afterNext = currentDetailId(page)
    await page.goBack()
    await page.waitForFunction(
      () => !new URL(window.location.href).searchParams.has('id'),
    )
    const afterBack = {
      id: currentDetailId(page),
      open: await page.locator('#detail-dialog').isVisible(),
    }
    await page.goForward()
    await page.waitForFunction(
      (id) => new URL(window.location.href).searchParams.get('id') === id,
      nextId,
    )
    const afterForward = {
      id: currentDetailId(page),
      open: await page.locator('#detail-dialog').isVisible(),
    }
    await page.goBack()
    await page.waitForFunction(
      () => !new URL(window.location.href).searchParams.has('id'),
    )

    const directUrl = new URL(page.url())
    directUrl.searchParams.set('id', nextId)
    const directPage = await page.context().newPage()
    await directPage.goto(directUrl.href, { waitUntil: 'networkidle' })
    await directPage.waitForFunction(
      () => document.querySelector('#detail-dialog')?.open === true,
    )
    const directLink = {
      id: currentDetailId(directPage),
      open: await directPage.locator('#detail-dialog').isVisible(),
    }
    await closeDetail(directPage)
    const afterClose = {
      id: currentDetailId(directPage),
      open: await directPage.locator('#detail-dialog').isVisible(),
    }
    await directPage.close()

    const unknownUrl = new URL(directUrl)
    unknownUrl.searchParams.set('id', 'missing-image')
    const unknownIdPage = await page.context().newPage()
    await unknownIdPage.goto(unknownUrl.href, { waitUntil: 'networkidle' })
    await unknownIdPage.waitForFunction(
      () => !new URL(window.location.href).searchParams.has('id'),
    )
    const unknownId = {
      id: currentDetailId(unknownIdPage),
      open: await unknownIdPage.locator('#detail-dialog').isVisible(),
    }
    await unknownIdPage.close()

    return outputMatches(
      'detail URL and history',
      {
        initialId,
        afterNext,
        afterBack,
        afterForward,
        directLink,
        afterClose,
        unknownId,
      },
      {
        initialId,
        afterNext: nextId,
        afterBack: { id: null, open: false },
        afterForward: { id: nextId, open: true },
        directLink: { id: nextId, open: true },
        afterClose: { id: null, open: false },
        unknownId: { id: null, open: false },
      },
    )
  })

const verifySearchKeysDoNotNavigate = (page) =>
  runCheck('search field keyboard guard', async () => {
    const result = await openSliderDetail(page, 'slide')
    if (result.isErr()) return result
    const initialId = currentDetailId(page)
    await page.evaluate(() => {
      const search = document.getElementById('story-search')
      for (const key of ['ArrowLeft', 'ArrowRight', 'h', 'l'])
        search.dispatchEvent(
          new KeyboardEvent('keydown', {
            key,
            bubbles: true,
            cancelable: true,
          }),
        )
    })
    const actual = { initialId, afterSearchKeys: currentDetailId(page) }
    await closeDetail(page)
    return outputMatches('search field keyboard guard', actual, {
      initialId,
      afterSearchKeys: initialId,
    })
  })

const inspectFirstVisibleNavigation = async (page) => {
  const ids = await visibleDetailIds(page)
  if (ids.length === 0)
    return err(new Error('The filtered list does not contain an image.'))
  await page
    .locator('#story-list .variant[data-detail-id] .image-button')
    .first()
    .click()
  const dialog = page.locator('#detail-dialog')
  await dialog.waitFor({ state: 'visible' })
  const firstId = currentDetailId(page)
  const firstPosition = await page.locator('#detail-position').textContent()
  const nextDisabled = await page
    .getByRole('button', { name: 'Next image' })
    .isDisabled()
  if (!nextDisabled)
    await page.getByRole('button', { name: 'Next image' }).click()
  const nextId = currentDetailId(page)
  await closeDetail(page)
  return ok({
    actual: { firstId, firstPosition, nextDisabled, nextId },
    expected: {
      firstId: ids[0],
      firstPosition: '1 / ' + ids.length,
      nextDisabled: ids.length < 2,
      nextId: ids[1] ?? ids[0],
    },
  })
}

const verifyDetailNavigationUsesCurrentList = (page) =>
  runCheck(
    'detail navigation follows filter, search, and tree selection',
    async () => {
      await closeDetail(page)
      await page.locator('#story-tree .tree-root').click()
      await page.locator('#filters .filter.changes').click()
      await page.getByRole('button', { name: 'Before + After' }).click()
      const allIds = await visibleDetailIds(page)

      await page.locator('#filters .filter.new').click()
      const filteredIds = await visibleDetailIds(page)
      const filtered = await inspectFirstVisibleNavigation(page)
      if (filtered.isErr()) return filtered

      await page.locator('#filters .filter.changes').click()
      const component = await page
        .locator('#story-list .story-component')
        .first()
        .textContent()
      if (component === null)
        return err(new Error('The visible list does not contain a component.'))
      await page.locator('#story-search').fill(component)
      const searchedIds = await visibleDetailIds(page)
      const searched = await inspectFirstVisibleNavigation(page)
      if (searched.isErr()) return searched

      await page.locator('#story-search').fill('')
      await page.locator('#story-tree .tree-root').click()
      const treeComponent = page.locator('#story-tree .tree-component').first()
      await treeComponent.click()
      const treeLabel = await treeComponent.locator('span').nth(1).textContent()
      if (treeLabel === null)
        return err(new Error('The selected tree component has no label.'))
      const treeSelected = await treeComponent.getAttribute('aria-pressed')
      const tree = await inspectFirstVisibleNavigation(page)
      if (tree.isErr()) return tree
      const renderedComponents = await page
        .locator('#story-list .story-component')
        .evaluateAll((items) => items.map((item) => item.textContent))

      const actual = {
        filterReducedList: allIds.length > filteredIds.length,
        filteredNavigation: filtered.value.actual,
        searchReducedList: allIds.length > searchedIds.length,
        searchNavigation: searched.value.actual,
        treeNavigation: tree.value.actual,
        treeSelected,
        renderedComponents,
      }
      const expected = {
        filterReducedList: true,
        filteredNavigation: filtered.value.expected,
        searchReducedList: true,
        searchNavigation: searched.value.expected,
        treeNavigation: tree.value.expected,
        treeSelected: 'true',
        renderedComponents: [treeLabel],
      }
      await page.locator('#story-tree .tree-root').click()
      await page.locator('#filters .filter.changes').click()
      return outputMatches('visible list navigation', actual, expected)
    },
  )

const verifyDetailSliderKeyboard = (page) =>
  runCheck('detail slider keyboard', async () => {
    const result = await openSliderDetail(page, 'slide')
    if (result.isErr()) return result
    const range = result.value.locator('.slider-control')
    const initialValue = Number(await range.inputValue())
    await range.focus()
    await range.press('ArrowRight')
    if (Number(await range.inputValue()) === initialValue)
      return err(new Error('The detail slider did not respond to keys.'))
    return ok(undefined)
  })

const verifyDetailModeIsRemembered = (page) =>
  runCheck('detail mode persistence', async () => {
    const firstOpen = await openSliderDetail(page, 'slide')
    if (firstOpen.isErr()) return firstOpen
    await page.locator('#detail-modes [data-mode="toggle"]').click()
    await closeDetail(page)

    const reopened = await openSliderDetail(page)
    if (reopened.isErr()) return reopened
    const isSelected =
      (await page
        .locator('#detail-modes [data-mode="toggle"]')
        .getAttribute('aria-pressed')) === 'true'
    await closeDetail(page)
    if (!isSelected)
      return err(new Error('The detail mode was not remembered.'))
    return ok(undefined)
  })

const verifyBlendOpacity = (page) =>
  runCheck('Blend opacity control', async () => {
    const result = await openSliderDetail(page, 'blend')
    if (result.isErr()) return result
    const range = result.value.locator('.blend-control')
    const after = result.value.locator('.blend-after')
    const initialValue = Number(await range.inputValue())
    const initialOpacity = Number(
      await after.evaluate((image) => image.style.opacity),
    )
    await range.focus()
    await range.press('ArrowRight')
    const value = Number(await range.inputValue())
    const opacity = Number(await after.evaluate((image) => image.style.opacity))
    if (value === initialValue || opacity !== value / 100)
      return err(
        new Error('The Blend opacity control did not update the image.'),
      )
    if (initialOpacity !== 0.5)
      return err(new Error('The initial Blend opacity is not 50%.'))
    return ok(undefined)
  })

const verifyToggleControl = (page) =>
  runCheck('Toggle control', async () => {
    const result = await openSliderDetail(page, 'toggle')
    if (result.isErr()) return result
    const checkbox = result.value.getByRole('checkbox', {
      name: 'Show after image',
    })
    const images = result.value.locator('.toggle img')
    if (
      (await checkbox.isChecked()) ||
      !(await images.nth(0).isVisible()) ||
      (await images.nth(1).isVisible())
    )
      return err(new Error('Toggle did not start with the Before image.'))

    await checkbox.check()
    if (
      !(await checkbox.isChecked()) ||
      (await images.nth(0).isVisible()) ||
      !(await images.nth(1).isVisible())
    )
      return err(new Error('Toggle did not switch to the After image.'))
    return ok(undefined)
  })

const verifyDetailImageDoesNotReopenDialog = (page) =>
  runCheck('detail image click guard', async () => {
    const result = await openSliderDetail(page, 'diff')
    if (result.isErr()) return result
    const pageErrors = []
    const collectPageError = (error) => pageErrors.push(error)
    page.on('pageerror', collectPageError)
    await result.value.locator('.image-button').click()
    await page.evaluate(
      () => new Promise((resolveFrame) => requestAnimationFrame(resolveFrame)),
    )
    page.off('pageerror', collectPageError)
    if (!(await result.value.isVisible()))
      return err(new Error('Clicking the detail image closed the dialog.'))
    if (pageErrors.length > 0)
      return err(new Error('Clicking the detail image raised a page error.'))
    return ok(undefined)
  })

const restoreSlideForCapture = (page) =>
  runCheck('restore detail Slide for screenshot', async () => {
    const result = await openSliderDetail(page, 'slide')
    if (result.isErr()) return result
    return ok(undefined)
  })

export const verifyDetailInteractions = async (page) => {
  const checks = [
    verifyDetailDefaultsToSlide,
    verifyDetailNavigationFollowsVisibleOrder,
    verifyDetailUrlHistoryAndDirectLink,
    verifySearchKeysDoNotNavigate,
    verifyDetailNavigationUsesCurrentList,
    verifyListSliderKeyboard,
    verifyListSliderDrag,
    verifyDetailOpensOnClick,
    verifyDetailSliderKeyboard,
    verifyDetailModeIsRemembered,
    verifyBlendOpacity,
    verifyToggleControl,
    verifyDetailImageDoesNotReopenDialog,
    restoreSlideForCapture,
  ]
  const failures = []
  for (const check of checks) {
    const result = await check(page)
    if (result.isErr()) failures.push(result.error.message)
  }
  if (failures.length > 0) return err(new Error(failures.join('\n')))
  return ok(undefined)
}
