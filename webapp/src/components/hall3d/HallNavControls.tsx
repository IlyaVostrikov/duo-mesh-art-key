import { useCallback } from 'react'
import type { NavDir } from '@/hooks/useKeyboardCamera'

interface HallNavControlsProps {
  virtualDirRef: React.MutableRefObject<NavDir>
}

/**
 * On-screen D-pad + FOV zoom controls for the 3D hall.
 * Positioned on the left side of the viewport.
 * Supports mouse (hold-to-move) and touch.
 */
export function HallNavControls({ virtualDirRef }: HallNavControlsProps) {
  const startDir = useCallback(
    (dir: Partial<NavDir>) => {
      virtualDirRef.current = { v: dir.v ?? 0, h: dir.h ?? 0, zoom: dir.zoom ?? 0 }
    },
    [virtualDirRef],
  )

  const stopDir = useCallback(() => {
    virtualDirRef.current = { v: 0, h: 0, zoom: 0 }
  }, [virtualDirRef])

  // Safety: clear direction if pointer leaves the overlay entirely
  const onPointerLeave = useCallback(() => {
    stopDir()
  }, [stopDir])

  const buttonHandlers = useCallback(
    (dir: Partial<NavDir>) => ({
      onPointerDown: (e: React.PointerEvent) => {
        e.preventDefault()
        ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
        startDir(dir)
      },
      onPointerUp: () => stopDir(),
      onPointerCancel: () => stopDir(),
      onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
    }),
    [startDir, stopDir],
  )

  return (
    <div
      className="hall-nav-overlay"
      onPointerLeave={onPointerLeave}
    >
      <div className="hall-nav-dpad">
        {/* Zoom In */}
        <div className="hall-nav-row center">
          <button
            className="hall-nav-btn zoom-btn"
            aria-label="Zoom in"
            type="button"
            {...buttonHandlers({ zoom: 1 })}
          >
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <circle cx="10" cy="10" r="7" />
              <path d="M15 15l5 5" />
              <path d="M10 7v6M7 10h6" />
            </svg>
          </button>
        </div>

        {/* Up */}
        <div className="hall-nav-row center">
          <button
            className="hall-nav-btn"
            aria-label="Move forward"
            type="button"
            {...buttonHandlers({ v: 1 })}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 19V5M5 12l7-7 7 7" />
            </svg>
          </button>
        </div>

        {/* Left / Right */}
        <div className="hall-nav-row spaced">
          <button
            className="hall-nav-btn"
            aria-label="Move left"
            type="button"
            {...buttonHandlers({ h: -1 })}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 5l-7 7 7 7" />
            </svg>
          </button>

          <div className="hall-nav-center-dot" />

          <button
            className="hall-nav-btn"
            aria-label="Move right"
            type="button"
            {...buttonHandlers({ h: 1 })}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {/* Down */}
        <div className="hall-nav-row center">
          <button
            className="hall-nav-btn"
            aria-label="Move backward"
            type="button"
            {...buttonHandlers({ v: -1 })}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 5v14M19 12l-7 7-7-7" />
            </svg>
          </button>
        </div>

        {/* Zoom Out */}
        <div className="hall-nav-row center">
          <button
            className="hall-nav-btn zoom-btn"
            aria-label="Zoom out"
            type="button"
            {...buttonHandlers({ zoom: -1 })}
          >
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <circle cx="10" cy="10" r="7" />
              <path d="M15 15l5 5" />
              <path d="M7 10h6" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}
