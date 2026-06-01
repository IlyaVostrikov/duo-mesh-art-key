import { Typography } from '@/components/ui/typography'

interface FooterBarProps {
  copyright: string
  tagline: string
}

export function FooterBar({ copyright, tagline }: FooterBarProps) {
  return (
    <div className="flex items-center justify-between py-6">
      <Typography variant="caption" tone="muted" font="sans">
        {copyright}
      </Typography>
      <Typography variant="caption" tone="muted" font="sans">
        {tagline}
      </Typography>
    </div>
  )
}
