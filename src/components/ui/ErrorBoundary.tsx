import { Component, type ReactNode } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'

type Props = { children: ReactNode; name?: string }
type State = { hasError: boolean; error: Error | null }

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: any) {
    console.error(`[ErrorBoundary${this.props.name ? `:${this.props.name}` : ''}]`, error, info)
  }

  handleReload = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      const label = this.props.name || 'this page'
      return (
        <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 p-8 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-100 text-rose-600">
            <AlertTriangle className="h-8 w-8" />
          </div>
          <h2 className="text-xl font-bold text-slate-800">Something went wrong in {label}</h2>
          <p className="max-w-md text-sm text-slate-500">
            An unexpected error occurred. Other sections of the app are unaffected. You can try reloading this section.
          </p>
          {this.state.error && (
            <pre className="max-w-lg overflow-x-auto rounded-lg bg-slate-100 p-3 text-left text-xs text-slate-600">
              {this.state.error.message}
            </pre>
          )}
          <button
            onClick={this.handleReload}
            className="mt-2 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-indigo-200 hover:bg-indigo-700 active:scale-95 transition-all"
          >
            <RefreshCw className="h-4 w-4" /> Reload Section
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
