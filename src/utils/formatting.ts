export const formatMs = (value: number) => `${value.toFixed(value < 10 ? 2 : 0)} ms`

export const formatPayload = (bytes: number) => {
  if (bytes < 1024) {
    return `${bytes} B`
  }

  const kb = bytes / 1024
  if (kb < 1024) {
    return `${kb.toFixed(1)} KB`
  }

  return `${(kb / 1024).toFixed(2)} MB`
}

export const formatPercent = (value: number) => `${value.toFixed(1)}%`

export const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))
