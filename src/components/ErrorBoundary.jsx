import React from 'react'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'

/**
 * Error Boundary Component
 * Catches JavaScript errors in child components and displays fallback UI
 * This prevents the entire app from crashing
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { 
      hasError: false, 
      error: null,
      errorInfo: null
    }
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true }
  }

  componentDidCatch(error, errorInfo) {
    // Log error details for debugging
    console.error('ErrorBoundary caught an error:', error, errorInfo)
    
    this.setState({
      error: error,
      errorInfo: errorInfo
    })

    // You can also log the error to an error reporting service
    // Example: logErrorToService(error, errorInfo)
  }

  handleReset = () => {
    this.setState({ 
      hasError: false, 
      error: null,
      errorInfo: null 
    })
  }

  handleGoHome = () => {
    window.location.href = '/'
  }

  render() {
    if (this.state.hasError) {
      // Fallback UI
      return (
        <div className="min-h-screen flex items-center justify-center bg-night-900 px-4">
          <div className="max-w-md w-full">
            <div className="glass-card p-8 rounded-2xl text-center">
              <div className="flex justify-center mb-6">
                <div className="p-4 bg-red-500/10 rounded-full">
                  <AlertTriangle className="text-red-400" size={48} />
                </div>
              </div>

              <h1 className="text-2xl font-bold text-white mb-3">
                Oops! Something went wrong
              </h1>
              
              <p className="text-zinc-400 mb-6">
                We encountered an unexpected error. Don't worry, your data is safe.
              </p>

              {/* Show error details in development only */}
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <details className="mb-6 text-left">
                  <summary className="cursor-pointer text-sm text-zinc-500 hover:text-zinc-400 mb-2">
                    Error Details (Dev Only)
                  </summary>
                  <div className="bg-red-500/5 border border-red-500/20 rounded-lg p-4 overflow-auto max-h-40">
                    <p className="text-xs text-red-400 font-mono mb-2">
                      {this.state.error.toString()}
                    </p>
                    <pre className="text-xs text-zinc-500 font-mono whitespace-pre-wrap">
                      {this.state.errorInfo?.componentStack}
                    </pre>
                  </div>
                </details>
              )}

              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={this.handleReset}
                  className="flex-1 btn-primary flex items-center justify-center gap-2"
                >
                  <RefreshCw size={16} />
                  Try Again
                </button>
                
                <button
                  onClick={this.handleGoHome}
                  className="flex-1 px-4 py-2 border border-white/10 rounded-lg hover:bg-white/5 transition flex items-center justify-center gap-2"
                >
                  <Home size={16} />
                  Go Home
                </button>
              </div>

              <p className="text-xs text-zinc-500 mt-6">
                If this problem persists, please contact support
              </p>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary
