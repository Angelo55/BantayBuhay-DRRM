"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import type { AuthState } from "@/types"

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
  })

  useEffect(() => {
    // Check for stored auth on mount
    const storedUser = localStorage.getItem("bantaybuhay_user")
    if (storedUser) {
      try {
        const user = JSON.parse(storedUser)
        setAuthState({
          user,
          isAuthenticated: true,
          isLoading: false,
        })
      } catch {
        setAuthState({ user: null, isAuthenticated: false, isLoading: false })
      }
    } else {
      setAuthState({ user: null, isAuthenticated: false, isLoading: false })
    }
  }, [])

  const login = async (email: string, password: string) => {
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    })

    if (!response.ok) {
      throw new Error("Invalid credentials")
    }

    const data = await response.json()
    const user = data.user

    localStorage.setItem("bantaybuhay_user", JSON.stringify(user))
    setAuthState({
      user,
      isAuthenticated: true,
      isLoading: false,
    })
  }

  const logout = () => {
    localStorage.removeItem("bantaybuhay_user")
    setAuthState({
      user: null,
      isAuthenticated: false,
      isLoading: false,
    })
  }

  return <AuthContext.Provider value={{ ...authState, login, logout }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
