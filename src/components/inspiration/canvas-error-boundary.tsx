'use client'

import React, { Component, ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { AlertCircle, RefreshCcw } from 'lucide-react'

interface Props {
    children: ReactNode
}

interface State {
    hasError: boolean
    error: Error | null
    errorInfo: React.ErrorInfo | null
}

export class CanvasErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null,
        errorInfo: null,
    }

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error, errorInfo: null }
    }

    public componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        console.error('Canvas Error caught by boundary:', error, errorInfo)
        this.setState({
            error,
            errorInfo,
        })
    }

    public render() {
        if (this.state.hasError) {
            return (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#111] text-red-400 p-8 z-50">
                    <AlertCircle className="w-16 h-16 mb-4 text-red-500" />
                    <h2 className="text-2xl font-bold text-white mb-2">Canvas Crash Detected</h2>
                    <p className="text-gray-400 mb-6 text-center max-w-xl">
                        The canvas component threw a critical error. Please take a screenshot of this error and send it exactly as shown.
                    </p>

                    <div className="bg-black/50 p-6 rounded-lg border border-red-900/50 w-full max-w-3xl overflow-auto mb-6">
                        <h3 className="text-red-300 font-mono text-sm uppercase tracking-wider mb-2">Error Message:</h3>
                        <div className="font-mono text-white whitespace-pre-wrap mb-6 break-words">
                            {this.state.error?.message || this.state.error?.toString() || 'Unknown Error'}
                        </div>

                        <h3 className="text-gray-500 font-mono text-sm uppercase tracking-wider mb-2">Component Stack:</h3>
                        <div className="font-mono text-gray-400 whitespace-pre-wrap text-sm border-l-2 border-red-900/30 pl-4 py-2 break-words">
                            {this.state.errorInfo?.componentStack || 'No stack trace available'}
                        </div>
                    </div>

                    <Button
                        onClick={() => window.location.reload()}
                        variant="outline"
                        className="border-red-900/50 hover:bg-red-900/20 text-red-300"
                    >
                        <RefreshCcw className="w-4 h-4 mr-2" />
                        Reload Application
                    </Button>
                </div>
            )
        }

        return this.props.children
    }
}
