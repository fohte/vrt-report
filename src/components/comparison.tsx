import { Button } from '@fohte/ui/button'
import { Chip } from '@fohte/ui/chip'
import { Panel } from '@fohte/ui/panel'
import type { ReactNode } from 'react'

import { ComparisonImage } from '#vrt-components/comparison-image'
import {
  type ComparisonMode,
  type ComparisonVariant,
  formatComparisonStatus,
  getComparisonPanes,
  type ImageLabel,
} from '#vrt-components/comparison-model'
import {
  type ComparisonInteractiveMode,
  ComparisonModes,
} from '#vrt-components/comparison-modes'

export type { ComparisonVariant } from '#vrt-components/comparison-model'
export {
  getComparisonPanes,
  hasDiffMarkers,
} from '#vrt-components/comparison-model'

type ComparisonProps = {
  variant: ComparisonVariant
  storyLabel: string
  mode?: ComparisonMode
  detail?: boolean
  markersVisible?: boolean
  toggleAfter?: boolean | undefined
  onToggleAfterChange?: ((showAfter: boolean) => void) | undefined
  onOpenDetail?: (() => void) | undefined
}

function ImagePane({
  label,
  source,
  variant,
  storyLabel,
  detail,
  markersVisible,
  onOpenDetail,
}: {
  label: ImageLabel
  source: string | null
  variant: ComparisonVariant
  storyLabel: string
  detail: boolean
  markersVisible: boolean
  onOpenDetail?: (() => void) | undefined
}) {
  const image = (
    <ComparisonImage
      label={label}
      source={source}
      storyLabel={storyLabel}
      variant={variant}
      loading={detail ? 'eager' : 'lazy'}
      detail={detail}
      markersVisible={markersVisible}
    />
  )

  return (
    <Panel padding="none" className="min-w-0 overflow-hidden bg-card">
      <div className="border-b border-border px-3 py-2">
        <span className="font-mono text-xs text-muted-foreground">{label}</span>
      </div>
      {onOpenDetail !== undefined && !detail ? (
        <Button
          variant="plain"
          aria-label={`Open ${label} image for ${storyLabel} (${variant.name})`}
          onClick={onOpenDetail}
          className="block w-full cursor-zoom-in text-left focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          {image}
        </Button>
      ) : (
        image
      )}
    </Panel>
  )
}

function PaneGrid({
  children,
  single,
}: {
  children: ReactNode
  single: boolean
}) {
  return (
    <div
      className={`grid min-w-0 grid-cols-1 gap-3 ${single ? '' : 'sm:grid-cols-2'}`}
    >
      {children}
    </div>
  )
}

export function Comparison({
  variant,
  storyLabel,
  mode = 'pair',
  detail = false,
  markersVisible = false,
  toggleAfter,
  onToggleAfterChange,
  onOpenDetail,
}: ComparisonProps) {
  let interactiveMode: ComparisonInteractiveMode | undefined
  if (variant.status === 'changed') {
    if (!detail && mode === 'slider') interactiveMode = 'slider'
    if (detail && (mode === 'slide' || mode === 'blend' || mode === 'toggle'))
      interactiveMode = mode
  }

  let content: ReactNode
  if (interactiveMode !== undefined) {
    content = (
      <ComparisonModes
        variant={variant}
        storyLabel={storyLabel}
        mode={interactiveMode}
        detail={detail}
        markersVisible={markersVisible}
        toggleAfter={toggleAfter}
        onToggleAfterChange={onToggleAfterChange}
        onOpenDetail={onOpenDetail}
      />
    )
  } else {
    const panes = getComparisonPanes(variant, mode)
    content = (
      <PaneGrid single={panes.length === 1}>
        {panes.map((pane) => (
          <ImagePane
            key={pane.label}
            label={pane.label}
            source={pane.source}
            variant={variant}
            storyLabel={storyLabel}
            detail={detail}
            markersVisible={markersVisible}
            onOpenDetail={onOpenDetail}
          />
        ))}
      </PaneGrid>
    )
  }

  return (
    <section className="space-y-2">
      <div className="flex items-center gap-2">
        <h3 className="font-mono text-sm font-medium text-foreground">
          {variant.name}
        </h3>
        {variant.status !== 'unchanged' && (
          <Chip tone={variant.status === 'changed' ? 'strong' : 'muted'}>
            {formatComparisonStatus(variant.status)}
          </Chip>
        )}
      </div>
      {content}
    </section>
  )
}
