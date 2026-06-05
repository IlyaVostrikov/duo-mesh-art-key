import { Component, type ReactNode, type ErrorInfo } from 'react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  error: Error | null
  hasError: boolean
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null, hasError: false }

  static getDerivedStateFromError(error: Error): State {
    return { error, hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack)
  }

  handleReset = () => {
    this.setState({ error: null, hasError: false })
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback

      return (
        <div
          role="alert"
          style={{
            maxWidth: '540px',
            margin: '0 auto',
            padding: '96px 20px',
            textAlign: 'center',
          }}
        >
          <h2
            style={{
              fontSize: '1.25rem',
              fontWeight: 600,
              marginBottom: '8px',
              color: 'var(--text)',
            }}
          >
            Что-то пошло не так / Something went wrong
          </h2>
          <p
            style={{
              fontSize: '0.875rem',
              color: 'var(--text-muted)',
              marginBottom: '24px',
              lineHeight: 1.6,
            }}
          >
            {this.state.error?.message || 'Неизвестная ошибка / Unknown error'}
          </p>
          <button
            onClick={this.handleReset}
            style={{
              padding: '10px 24px',
              fontSize: '0.875rem',
              fontWeight: 500,
              backgroundColor: 'var(--accent)',
              color: 'var(--accent-ink)',
              border: 'none',
              borderRadius: 'var(--radius)',
              cursor: 'pointer',
            }}
          >
            Попробовать снова / Try again
          </button>
        </div>
      )
    }

    return this.props.children
  }
}
