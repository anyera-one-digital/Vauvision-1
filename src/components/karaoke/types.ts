export interface LyricLine {
  text: string
  startTime: number | null
  endTime: number | null
}

export type KaraokeStep = 'onboarding' | 'upload' | 'info' | 'sync' | 'export'
