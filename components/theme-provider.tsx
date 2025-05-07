"use client"
import { useEffect, useState } from "react"
import { ThemeProvider as NextThemesProvider } from "next-themes"
import type { ThemeProviderProps } from "next-themes"

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  const [mounted, setMounted] = useState(false)

  // Fix for theme initial value
  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return <div className="hidden">{children}</div>
  }

  return <NextThemesProvider {...props}>{children}</NextThemesProvider>
}
