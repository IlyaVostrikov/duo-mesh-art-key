export interface CeremonyData {
  keyCode: string
  integrityHash: string
  verified: boolean
  artworkTitle: string
  artworkPosterUrl: string | null
  transfer: {
    recordHash: string
    sequence: number
    signature: string | null
    signerPublicKey: string | null
  }
}

export type CeremonyPhase = 'APPEAR' | 'DISSOLVE' | 'REVEAL' | 'SEAL' | 'SETTLE' | 'COMPLETE'
