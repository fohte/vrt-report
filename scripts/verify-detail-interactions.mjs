import { err, ok } from 'neverthrow'

export const verifySliderInteractions = async (page) => {
  await page.getByRole('button', { name: 'Slider' }).click()
  const changedVariant = page
    .locator('.variant:has(.variant-status.changed)')
    .first()
  const slider = changedVariant.locator('.slider')
  const range = slider.locator('.slider-control')
  const initialValue = Number(await range.inputValue())
  await range.focus()
  await range.press('ArrowRight')
  const keyboardValue = Number(await range.inputValue())
  if (keyboardValue === initialValue)
    return err(new Error('The list comparison slider did not respond to keys.'))

  const bounds = await slider.boundingBox()
  if (bounds === null)
    return err(new Error('The list comparison slider is not visible.'))
  const y = bounds.y + bounds.height / 2
  await page.mouse.move(bounds.x + bounds.width * 0.25, y)
  await page.mouse.down()
  await page.mouse.move(bounds.x + bounds.width * 0.75, y, { steps: 5 })
  await page.mouse.up()
  const draggedValue = Number(await range.inputValue())
  if (draggedValue < 60)
    return err(new Error('Dragging the list comparison image did not move it.'))

  await slider.click({
    position: { x: bounds.width * 0.95, y: bounds.height / 2 },
  })
  const dialog = page.locator('#detail-dialog')
  if (!(await dialog.isVisible()))
    return err(new Error('The list comparison image did not open its detail.'))
  const slideMode = page.locator('#detail-modes [data-mode="slide"]')
  if ((await slideMode.getAttribute('aria-pressed')) !== 'true')
    return err(new Error('The detail comparison did not default to Slide.'))

  const detailRange = dialog.locator('.slider-control')
  const detailInitialValue = Number(await detailRange.inputValue())
  await detailRange.focus()
  await detailRange.press('ArrowRight')
  if (Number(await detailRange.inputValue()) === detailInitialValue)
    return err(
      new Error('The detail comparison slider did not respond to keys.'),
    )

  await page.locator('#detail-modes [data-mode="toggle"]').click()
  await page.locator('#detail-close').click()
  await slider.click({
    position: { x: bounds.width * 0.95, y: bounds.height / 2 },
  })
  if (
    (await page
      .locator('#detail-modes [data-mode="toggle"]')
      .getAttribute('aria-pressed')) !== 'true'
  )
    return err(new Error('The detail comparison mode was not remembered.'))
  await slideMode.click()
  return ok(undefined)
}
