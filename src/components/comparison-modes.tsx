import { Panel } from '@fohte/ui/panel'
import type {
  MouseEvent as ReactMouseEvent,
  PointerEvent as ReactPointerEvent,
} from 'react'
import { useRef, useState } from 'react'

import { ComparisonImage } from '#vrt-components/comparison-image'
import type { ComparisonVariant } from '#vrt-components/comparison-model'

export type ComparisonInteractiveMode = 'slider' | 'slide' | 'blend' | 'toggle'

export type ComparisonModesProps = {
  variant: ComparisonVariant
  storyLabel: string
  mode: ComparisonInteractiveMode
  detail?: boolean | undefined
  markersVisible?: boolean | undefined
  toggleAfter?: boolean | undefined
  onToggleAfterChange?: ((showAfter: boolean) => void) | undefined
  onOpenDetail?: (() => void) | undefined
}

function Slider({
  variant,
  storyLabel,
  detail = false,
  markersVisible = false,
  onOpenDetail,
}: Omit<ComparisonModesProps, 'mode' | 'toggleAfter' | 'onToggleAfterChange'>) {
  const [position, setPosition] = useState(50)
  const pointer = useRef<{
    id: number | null
    startX: number
    startY: number
    dragged: boolean
    imageTarget: boolean
  } | null>(null)

  const updatePosition = (clientX: number, element: HTMLDivElement) => {
    const bounds = element.getBoundingClientRect()
    if (bounds.width === 0) return
    setPosition(
      Math.max(
        0,
        Math.min(100, ((clientX - bounds.left) / bounds.width) * 100),
      ),
    )
  }

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0 || event.target instanceof HTMLInputElement) return
    pointer.current = {
      id: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      dragged: false,
      imageTarget: event.target instanceof HTMLImageElement,
    }
    event.currentTarget.setPointerCapture(event.pointerId)
    updatePosition(event.clientX, event.currentTarget)
  }

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const activePointer = pointer.current
    if (activePointer === null || activePointer.id !== event.pointerId) return
    if (
      Math.hypot(
        event.clientX - activePointer.startX,
        event.clientY - activePointer.startY,
      ) > 3
    ) {
      activePointer.dragged = true
    }
    if (activePointer.dragged)
      updatePosition(event.clientX, event.currentTarget)
  }

  const handlePointerEnd = (event: ReactPointerEvent<HTMLDivElement>) => {
    const activePointer = pointer.current
    if (activePointer !== null && activePointer.id === event.pointerId)
      activePointer.id = null
  }

  const handleClick = (event: ReactMouseEvent<HTMLDivElement>) => {
    const activePointer = pointer.current
    pointer.current = null
    if (activePointer?.dragged === true) {
      event.preventDefault()
      return
    }
    if (
      !detail &&
      onOpenDetail !== undefined &&
      (event.target instanceof HTMLImageElement ||
        activePointer?.imageTarget === true)
    ) {
      onOpenDetail()
    }
  }

  return (
    <Panel padding="none" className="relative min-w-0 overflow-hidden bg-card">
      <div
        className="relative aspect-video touch-pan-y select-none"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerEnd}
        onPointerCancel={() => {
          pointer.current = null
        }}
        onClick={handleClick}
      >
        <ComparisonImage
          label="Before"
          source={variant.before}
          storyLabel={storyLabel}
          variant={variant}
          detail={detail}
          loading={detail ? 'eager' : 'lazy'}
          position="absolute"
          className="inset-0"
        />
        <div
          className="absolute inset-0"
          style={{ clipPath: `inset(0 0 0 ${String(position)}%)` }}
        >
          <ComparisonImage
            label="After"
            source={variant.after}
            storyLabel={storyLabel}
            variant={variant}
            loading={detail ? 'eager' : 'lazy'}
          />
        </div>
        {detail && markersVisible && (
          <ComparisonImage
            label="Before"
            source={null}
            storyLabel={storyLabel}
            variant={variant}
            detail
            markersVisible
            markerOnly
            position="absolute"
            className="inset-0"
          />
        )}
        <span className="absolute left-3 top-3 z-10 bg-background/90 px-2 py-1 font-mono text-xs text-foreground">
          Before
        </span>
        <span className="absolute right-3 top-3 z-10 bg-background/90 px-2 py-1 font-mono text-xs text-foreground">
          After
        </span>
        <input
          type="range"
          min="0"
          max="100"
          value={position}
          aria-label="Compare before and after images"
          onChange={(event) => {
            setPosition(Number(event.currentTarget.value))
          }}
          className="absolute inset-x-3 bottom-3 z-20 w-[calc(100%-1.5rem)] accent-primary"
        />
      </div>
    </Panel>
  )
}

function Blend({
  variant,
  storyLabel,
  detail = false,
  markersVisible = false,
}: Omit<
  ComparisonModesProps,
  'mode' | 'toggleAfter' | 'onToggleAfterChange' | 'onOpenDetail'
>) {
  const [opacity, setOpacity] = useState(50)

  return (
    <Panel padding="none" className="relative min-w-0 overflow-hidden bg-card">
      <div className="relative aspect-video overflow-hidden">
        <ComparisonImage
          label="Before"
          source={variant.before}
          storyLabel={storyLabel}
          variant={variant}
          loading="eager"
        />
        <div className="absolute inset-0" style={{ opacity: opacity / 100 }}>
          <ComparisonImage
            label="After"
            source={variant.after}
            storyLabel={storyLabel}
            variant={variant}
            loading="eager"
          />
        </div>
        {detail && markersVisible && (
          <ComparisonImage
            label="Before"
            source={null}
            storyLabel={storyLabel}
            variant={variant}
            detail
            markersVisible
            markerOnly
            position="absolute"
            className="inset-0"
          />
        )}
        <span className="absolute left-3 top-3 z-10 bg-background/90 px-2 py-1 font-mono text-xs text-foreground">
          Before
        </span>
        <span className="absolute right-3 top-3 z-10 bg-background/90 px-2 py-1 font-mono text-xs text-foreground">
          After
        </span>
        <input
          type="range"
          min="0"
          max="100"
          value={opacity}
          aria-label="After image opacity"
          onChange={(event) => {
            setOpacity(Number(event.currentTarget.value))
          }}
          className="absolute inset-x-3 bottom-3 z-20 w-[calc(100%-1.5rem)] accent-primary"
        />
      </div>
    </Panel>
  )
}

function Toggle({
  variant,
  storyLabel,
  detail = false,
  markersVisible = false,
  toggleAfter,
  onToggleAfterChange,
}: Omit<ComparisonModesProps, 'mode' | 'onOpenDetail'>) {
  const [internalShowAfter, setInternalShowAfter] = useState(false)
  const showAfter = toggleAfter ?? internalShowAfter

  const updateShowAfter = (value: boolean) => {
    if (toggleAfter === undefined) setInternalShowAfter(value)
    onToggleAfterChange?.(value)
  }

  return (
    <Panel padding="none" className="relative min-w-0 overflow-hidden bg-card">
      <div className="relative">
        <div hidden={showAfter}>
          <ComparisonImage
            label="Before"
            source={variant.before}
            storyLabel={storyLabel}
            variant={variant}
            loading="eager"
          />
        </div>
        <div hidden={!showAfter}>
          <ComparisonImage
            label="After"
            source={variant.after}
            storyLabel={storyLabel}
            variant={variant}
            loading="eager"
          />
        </div>
        {detail && markersVisible && (
          <ComparisonImage
            label="Before"
            source={null}
            storyLabel={storyLabel}
            variant={variant}
            detail
            markersVisible
            markerOnly
            position="absolute"
            className="inset-0"
          />
        )}
        <label className="absolute bottom-3 left-1/2 z-20 flex -translate-x-1/2 items-center gap-2 border border-border bg-background/90 px-3 py-2 font-mono text-xs text-foreground">
          <span>Before</span>
          <input
            type="checkbox"
            aria-label="Show after image"
            checked={showAfter}
            onChange={(event) => {
              updateShowAfter(event.currentTarget.checked)
            }}
            className="accent-primary"
          />
          <span>After</span>
        </label>
      </div>
    </Panel>
  )
}

export function ComparisonModes(props: ComparisonModesProps) {
  if (props.mode === 'blend') return <Blend {...props} />
  if (props.mode === 'toggle') return <Toggle {...props} />
  return <Slider {...props} />
}
