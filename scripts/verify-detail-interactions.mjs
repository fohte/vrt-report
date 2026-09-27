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
  if (await dialog.isVisible()) await page.locator('#detail-close').click()
}

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
