/**
 * Exponential backoff retry wrapper for Supabase operations.
 * Retries on network failures (TypeError: Failed to fetch) up to maxRetries times.
 */

export interface RetryOptions {
    maxRetries?: number     // default: 3
    baseDelayMs?: number    // default: 800ms
    maxDelayMs?: number     // default: 8000ms
    onRetry?: (attempt: number, error: unknown) => void
}

const isNetworkError = (error: unknown): boolean => {
    if (!error) return false
    const msg = (error as any)?.message || ''
    return (
        msg.includes('Failed to fetch') ||
        msg.includes('NetworkError') ||
        msg.includes('fetch failed') ||
        msg.includes('ERR_NETWORK') ||
        msg.includes('net::ERR')
    )
}

export async function withRetry<T>(
    fn: () => Promise<{ data: T | null; error: any }>,
    options: RetryOptions = {}
): Promise<{ data: T | null; error: any }> {
    const { maxRetries = 3, baseDelayMs = 800, maxDelayMs = 8000, onRetry } = options

    let lastError: any = null

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            const result = await fn()

            // If it's a network-level error (not a DB error), retry
            if (result.error && isNetworkError(result.error)) {
                lastError = result.error
                if (attempt < maxRetries) {
                    const delay = Math.min(baseDelayMs * Math.pow(2, attempt), maxDelayMs)
                    onRetry?.(attempt + 1, result.error)
                    await sleep(delay)
                    continue
                }
                return result
            }

            return result
        } catch (err: unknown) {
            lastError = err
            if (isNetworkError(err) && attempt < maxRetries) {
                const delay = Math.min(baseDelayMs * Math.pow(2, attempt), maxDelayMs)
                onRetry?.(attempt + 1, err)
                await sleep(delay)
                continue
            }
            return { data: null, error: err }
        }
    }

    return { data: null, error: lastError }
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

/**
 * Simplified one-liner wrapper — use this instead of .from().insert() etc.
 *
 * Usage:
 *   const { data, error } = await retryQuery(() =>
 *     supabase.from('clients').insert(payload).select().single()
 *   )
 */
export const retryQuery = <T>(fn: () => PromiseLike<{ data: T | null; error: any }>) =>
    withRetry(() => Promise.resolve(fn()), {
        maxRetries: 3,
        baseDelayMs: 1000,
        onRetry: (attempt, err) => {
            console.warn(`[Supabase] Network error, retrying (${attempt}/3)...`, err)
        }
    })
