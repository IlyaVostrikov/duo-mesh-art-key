import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

interface BilingualFieldProps {
  lang: 'ru' | 'en'
  onLangChange: (lang: 'ru' | 'en') => void
  label: string
  required?: boolean
  ruValue: string
  enValue: string
  onRuChange: (value: string) => void
  onEnChange: (value: string) => void
  placeholderRu?: string
  placeholderEn?: string
  multiline?: boolean
  rows?: number
  hintBefore?: string
  hintAfter?: React.ReactNode
}

export function BilingualField({
  lang,
  onLangChange,
  label,
  required,
  ruValue,
  enValue,
  onRuChange,
  onEnChange,
  placeholderRu,
  placeholderEn,
  multiline = false,
  rows = 4,
  hintBefore,
  hintAfter,
}: BilingualFieldProps) {
  return (
    <div>
      <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text)' }}>
        {label}
        {required && <span style={{ color: 'var(--accent)' }}> *</span>}
      </label>

      {hintBefore && (
        <p className="text-xs mb-2" style={{ color: 'var(--text-muted)' }}>{hintBefore}</p>
      )}

      <Tabs value={lang} onValueChange={(v) => onLangChange(v as 'ru' | 'en')} className="mb-3">
        <TabsList className="h-8">
          <TabsTrigger value="ru" className="text-xs px-3">RU</TabsTrigger>
          <TabsTrigger value="en" className="text-xs px-3">EN</TabsTrigger>
        </TabsList>
        <TabsContent value="ru" forceMount hidden={lang !== 'ru'}>
          {multiline ? (
            <Textarea
              value={ruValue}
              onChange={(e) => onRuChange(e.target.value)}
              placeholder={placeholderRu}
              rows={rows}
            />
          ) : (
            <Input
              value={ruValue}
              onChange={(e) => onRuChange(e.target.value)}
              placeholder={placeholderRu}
            />
          )}
        </TabsContent>
        <TabsContent value="en" forceMount hidden={lang !== 'en'}>
          {multiline ? (
            <Textarea
              value={enValue}
              onChange={(e) => onEnChange(e.target.value)}
              placeholder={placeholderEn}
              rows={rows}
            />
          ) : (
            <Input
              value={enValue}
              onChange={(e) => onEnChange(e.target.value)}
              placeholder={placeholderEn}
            />
          )}
        </TabsContent>
      </Tabs>

      {hintAfter}
    </div>
  )
}
