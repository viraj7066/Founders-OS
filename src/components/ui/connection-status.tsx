'use client'

import { useState, useEffect } from 'react'
import { Wifi, WifiOff, RefreshCw } from 'lucide-react'

export function ConnectionStatus() {
    const [isOnline, setIsOnline] = useState(true)
    const [wasOffline, setWasOffline] = useState(false)
    const [showReconnected, setShowReconnected] = useState(false)

    useEffect(() => {
        const handleOnline = () => {
            setIsOnline(true)
            if (wasOffline) {
                setShowReconnected(true)
                setTimeout(() => setShowReconnected(false), 3000)
            }
            setWasOffline(false)
        }

        const handleOffline = () => {
            setIsOnline(false)
            setWasOffline(true)
        }

        // Set initial state
        setIsOnline(navigator.onLine)

        window.addEventListener('online', handleOnline)
        window.addEventListener('offline', handleOffline)

        return () => {
            window.removeEventListener('online', handleOnline)
            window.removeEventListener('offline', handleOffline)
        }
    }, [wasOffline])

    if (isOnline && !showReconnected) return null

    return (
        <div className={`fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2.5 px-4 py-2.5 rounded-2xl border text-sm font-medium shadow-xl backdrop-blur-md transition-all duration-300 ${isOnline
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                : 'bg-red-500/10 border-red-500/30 text-red-400'
            }`}>
            {isOnline ? (
                <>
                    <Wifi className="w-4 h-4" />
                    Back online — data will sync
                </>
            ) : (
                <>
                    <WifiOff className="w-4 h-4" />
                    No internet — retrying in background
                    <RefreshCw className="w-3.5 h-3.5 animate-spin opacity-70" />
                </>
            )}
        </div>
    )
}
