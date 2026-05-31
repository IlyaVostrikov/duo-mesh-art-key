import { RevealOnScroll } from '@/components/motion/RevealOnScroll'
import { DashboardLayout } from './DashboardLayout'

export function DashboardSales() {
  return (
    <DashboardLayout>
      <RevealOnScroll direction="up">
        <h1 className="text-display-sm mb-4">
          Продажи / Sales
        </h1>
      </RevealOnScroll>
      <RevealOnScroll direction="up" delay={80}>
        <div
          style={{
            maxWidth: '500px',
            padding: '32px',
            borderRadius: 'var(--radius)',
            backgroundColor: 'var(--surface)',
            border: '1px solid var(--border)',
          }}
        >
          <p style={{ color: 'var(--text-secondary)', marginBottom: '12px', lineHeight: 1.6 }}>
            История продаж и выплат будет доступна после подключения платёжной системы.
          </p>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', lineHeight: 1.5 }}>
            Sales history and payouts will appear here once the payment system is connected.
          </p>
        </div>
      </RevealOnScroll>
    </DashboardLayout>
  )
}
