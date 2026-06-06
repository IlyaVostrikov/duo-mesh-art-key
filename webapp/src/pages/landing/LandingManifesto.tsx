import { useEffect, useRef } from 'react'

const DEFINITIONS = [
  {
    index: '01',
    title: 'Отпечаток',
    desc: 'Каждая работа превращается в один криптографический отпечаток SHA-256. Изменить его незаметно невозможно.',
  },
  {
    index: '02',
    title: 'Цепочка',
    desc: 'Каждая передача владения фиксируется и математически связывается с предыдущей. История не переписывается.',
  },
  {
    index: '03',
    title: 'Контроль',
    desc: 'Художник выпускает ArtKey сам. Ни одна третья сторона не может вмешаться в историю произведения.',
  },
]

export function LandingManifesto() {
  const sectionRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const reveals = sectionRef.current?.querySelectorAll('.ak-reveal') ?? []
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    const onScroll = () => {
      const vh = window.innerHeight
      reveals.forEach((el) => {
        const htmlEl = el as HTMLElement
        const rc = htmlEl.getBoundingClientRect()
        const off = (parseFloat(htmlEl.style.getPropertyValue('--d')) || 0) * 0.16
        let k = Math.max(0, Math.min(1, (vh * 0.92 - rc.top - off) / (vh * 0.22)))
        if (reduced) k = 1
        else k = 1 - Math.pow(1 - k, 3)
        // latch
        const peak = parseFloat(htmlEl.dataset.peak || '0')
        if (k < peak) k = peak
        else htmlEl.dataset.peak = String(k)
        htmlEl.style.opacity = String(k)
        htmlEl.style.transform = k >= 1 ? 'none' : `translateY(${(1 - k) * 26}px)`
        if (htmlEl.classList.contains('ak-blur')) {
          htmlEl.style.filter = k >= 1 ? 'none' : `blur(${(1 - k) * 8}px)`
        }
      })
    }

    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <section ref={sectionRef} className="ak-manifesto">
      <div className="ak-manifesto-grid">
        <h2 className="ak-manifesto-head ak-reveal">
          Подлинность нельзя имитировать.{' '}
          <em>Её можно доказать — математикой, а не доверием.</em>
        </h2>
        <div className="ak-def-row">
          {DEFINITIONS.map((def, i) => (
            <div
              key={def.index}
              className="ak-def ak-reveal"
              style={{ ['--d' as string]: `${i * 120}ms` }}
            >
              <h4>{def.index} — {def.title}</h4>
              <p>{def.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
