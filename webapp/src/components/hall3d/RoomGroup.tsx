import { useMemo, memo } from 'react'
import * as THREE from 'three'
import { GalleryWall } from './GalleryWall'
import { GalleryFloor } from './GalleryFloor'
import { GalleryCeiling } from './GalleryCeiling'
import { FramedArtwork } from './FramedArtwork'
import { PedestalSculpture } from './PedestalSculpture'
import { GlassDoor } from './GlassDoor'
import { ArtworkLighting, PedestalSpot } from './Lighting'
import { AccentLighting } from './AccentLighting'
import type { SlotLayout } from './layoutTemplates'
import type { Hall3DArtwork } from './Hall3DScene'
import type { HallData } from './hallOrdering'
import { ROOM_SHAPE_SCALES, DEFAULT_CUSTOMIZATION } from './customization'
import type { HallCustomization } from './customization'

export const WALL_HEIGHT = 4.2
export const FLOOR_DEPTH = 8
export const EYE = 1.55

interface RoomGroupProps {
  hall: HallData
  layout: SlotLayout
  wallWidth: number
  hasPrevRoom: boolean
  hasNextRoom: boolean
  prevLabel: string
  nextLabel: string
  isCurrentRoom: boolean
  isAdjacentRoom: boolean
  textureCache: Map<string, THREE.Texture | null>
  hoveredId: string | null
  onHover: (id: string | null) => void
  onArtworkClick: (id: string) => void
  onDoorClick: (direction: 'prev' | 'next') => void
  doorHovered: { prev: boolean; next: boolean }
  onDoorHover: (direction: 'prev' | 'next' | null) => void
}

/** One complete gallery room — walls, floor, ceiling, artworks, lighting, doors. */
export const RoomGroup = memo(function RoomGroup({
  hall, layout, wallWidth, hasPrevRoom, hasNextRoom, prevLabel, nextLabel,
  isCurrentRoom, isAdjacentRoom, textureCache,
  hoveredId, onHover, onArtworkClick, onDoorClick, doorHovered, onDoorHover,
}: RoomGroupProps) {
  const c = { ...DEFAULT_CUSTOMIZATION, ...(hall.customization ?? {}) } as Required<Omit<HallCustomization, 'wallColor'>> & { wallColor?: string }
  const shape = ROOM_SHAPE_SCALES[c.roomShape] ?? ROOM_SHAPE_SCALES.rectangle
  const scaledWidth = wallWidth * shape.widthScale
  const scaledDepth = FLOOR_DEPTH * shape.depthScale
  const halfW = scaledWidth / 2

  const slottedArtworks = useMemo(() => {
    const result: Array<{ artwork: Hall3DArtwork; slot: SlotLayout['slots'][number] }> = []
    hall.artworks.forEach((aw, i) => {
      if (i < layout.slots.length) result.push({ artwork: aw, slot: layout.slots[i] })
    })
    return result
  }, [hall.artworks, layout])

  const showArtworks = isCurrentRoom || isAdjacentRoom

  return (
    <group>


      {/* ─── Room enclosure ─── */}
      <GalleryWall
        width={scaledWidth} height={WALL_HEIGHT}
        theme={c.wallTheme} customColor={c.wallTheme === 'custom' ? c.wallColor ?? null : null}
      />
      <GalleryFloor width={scaledWidth} depth={scaledDepth} floorType={c.floorType} />
      <GalleryCeiling width={scaledWidth} depth={scaledDepth} wallHeight={WALL_HEIGHT} ceilingStyle={c.ceilingStyle} />
      <RoomWalls halfW={halfW} />

      {/* ─── Accent lights (current room only) ─── */}
      {isCurrentRoom && <AccentLighting width={scaledWidth} depth={scaledDepth} wallHeight={WALL_HEIGHT} accentLight={c.accentLight} />}

      {/* ─── Artwork lighting + artworks (current + adjacent rooms only) ─── */}
      {showArtworks && slottedArtworks.map(({ artwork, slot }) => {
        const is3D = artwork.mediaType === 'MODEL_3D'
        return (
          <group key={artwork.id}>
            {is3D ? (
              <PedestalSpot x={slot.x} z={slot.z} castShadow={isCurrentRoom} />
            ) : (
              <ArtworkLighting slotX={slot.x} slotZ={slot.z} castShadow={isCurrentRoom} />
            )}

            {is3D ? (
              <PedestalSculpture
                artwork={artwork}
                position={[slot.x, slot.y, slot.z]}
                hovered={hoveredId === artwork.id}
                onHover={(h) => onHover(h ? artwork.id : null)}
                onClick={() => onArtworkClick(artwork.id)}
                pedestalStyle={c.pedestalStyle}
              />
            ) : (
              <FramedArtwork
                artwork={artwork}
                position={[slot.x, slot.y, slot.z]}
                width={slot.width ?? 0.9}
                height={slot.height ?? 1.1}
                texture={artwork.posterUrl ? (textureCache.get(artwork.posterUrl) ?? null) : null}
                hovered={hoveredId === artwork.id}
                onHover={(h) => onHover(h ? artwork.id : null)}
                onClick={() => onArtworkClick(artwork.id)}
                frameStyle={c.frameStyle}
              />
            )}
          </group>
        )
      })}

      {/* ─── Glass doors on side walls, near the front ─── */}
      {hasPrevRoom && (
        <GlassDoor
          position={[-halfW, EYE, 1.0]}
          rotationY={Math.PI / 2}
          direction="prev"
          label={prevLabel}
          hovered={doorHovered.prev}
          onHover={(h) => onDoorHover(h ? 'prev' : null)}
          onClick={() => onDoorClick('prev')}
        />
      )}
      {hasNextRoom && (
        <GlassDoor
          position={[halfW, EYE, 1.0]}
          rotationY={-Math.PI / 2}
          direction="next"
          label={nextLabel}
          hovered={doorHovered.next}
          onHover={(h) => onDoorHover(h ? 'next' : null)}
          onClick={() => onDoorClick('next')}
        />
      )}
    </group>
  )
})

// ─── Sub-components ───

interface RoomWallsProps {
  halfW: number
}

/** Side + back enclosure walls. Doors render slightly in front of side walls. */
export function RoomWalls({ halfW }: RoomWallsProps) {
  const halfH = WALL_HEIGHT / 2
  const halfD = FLOOR_DEPTH / 2

  return (
    <group>
      {/* Left side wall — always rendered; door sits slightly in front */}
      <mesh position={[-halfW, halfH, halfD]} rotation={[0, Math.PI / 2, 0]} receiveShadow>
        <planeGeometry args={[FLOOR_DEPTH, WALL_HEIGHT]} />
        <meshStandardMaterial color="#f5f2eb" roughness={0.93} metalness={0} side={THREE.DoubleSide} />
      </mesh>
      {/* Right side wall */}
      <mesh position={[halfW, halfH, halfD]} rotation={[0, -Math.PI / 2, 0]} receiveShadow>
        <planeGeometry args={[FLOOR_DEPTH, WALL_HEIGHT]} />
        <meshStandardMaterial color="#f5f2eb" roughness={0.93} metalness={0} side={THREE.DoubleSide} />
      </mesh>
      {/* Back wall — always present */}
      <mesh position={[0, halfH, FLOOR_DEPTH]} receiveShadow>
        <planeGeometry args={[halfW * 2, WALL_HEIGHT]} />
        <meshStandardMaterial color="#f5f2eb" roughness={0.93} metalness={0} />
      </mesh>
    </group>
  )
}
