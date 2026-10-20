/** Typed API client — consistent envelope handling + cookie auth. */

export class ApiClientError extends Error {
  status: number
  code: string
  details?: unknown
  constructor(status: number, message: string, code = 'ERROR', details?: unknown) {
    super(message)
    this.status = status
    this.code = code
    this.details = details
  }
}

interface Envelope<T> {
  success: boolean
  data?: T
  error?: { code: string; message: string; details?: unknown }
}

export async function api<T>(path: string, options: RequestInit & { json?: unknown } = {}): Promise<T> {
  const { json, ...rest } = options
  const res = await fetch(path, {
    ...rest,
    credentials: 'same-origin',
    headers: {
      ...(json !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...(rest.headers || {}),
    },
    body: json !== undefined ? JSON.stringify(json) : rest.body,
  })

  let payload: Envelope<T> | null = null
  try {
    payload = (await res.json()) as Envelope<T>
  } catch {
    // fallthrough — non-JSON response
  }

  if (!res.ok || !payload?.success) {
    throw new ApiClientError(
      res.status,
      payload?.error?.message || `Request failed (${res.status})`,
      payload?.error?.code || 'REQUEST_FAILED',
      payload?.error?.details,
    )
  }
  return payload.data as T
}

export const get = <T>(path: string) => api<T>(path)
export const post = <T>(path: string, json?: unknown) => api<T>(path, { method: 'POST', json })
export const patch = <T>(path: string, json?: unknown) => api<T>(path, { method: 'PATCH', json })
export const del = <T>(path: string) => api<T>(path, { method: 'DELETE' })
