import React, { Component, type ReactNode } from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  constructor(props: { children: ReactNode }) {
    super(props)
    this.state = { error: null }
  }
  static getDerivedStateFromError(error: Error) {
    return { error }
  }
  render() {
    if (this.state.error) {
      return (
        <div style={{
          minHeight: '100vh',
          background: '#17212b',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          fontFamily: 'monospace',
        }}>
          <div style={{
            background: '#1c2733',
            border: '1px solid #2d3e50',
            borderRadius: '16px',
            padding: '24px',
            maxWidth: '560px',
            width: '100%',
          }}>
            <p style={{ color: '#e17076', fontWeight: 600, marginBottom: '8px' }}>App Error</p>
            <p style={{ color: '#7d90a0', fontSize: '13px', marginBottom: '12px' }}>
              {this.state.error.message}
            </p>
            <pre style={{
              color: '#4a6278',
              fontSize: '11px',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-all',
              background: '#0e1621',
              padding: '12px',
              borderRadius: '8px',
              maxHeight: '200px',
              overflow: 'auto',
            }}>
              {this.state.error.stack}
            </pre>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
)
