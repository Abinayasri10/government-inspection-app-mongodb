"use client"

import { createContext, useContext, useState, useEffect } from "react"
import AsyncStorage from "@react-native-async-storage/async-storage"
import api from "../services/api"

const AuthContext = createContext()

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [userProfile, setUserProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadUser()
  }, [])

  const loadUser = async () => {
    try {
      const token = await AsyncStorage.getItem("token")
      const storedUserProfile = await AsyncStorage.getItem("userProfile")

      if (token && storedUserProfile) {
        setUser({ token })
        setUserProfile(JSON.parse(storedUserProfile))
      }
    } catch (e) {
      console.error("Failed to load user", e)
    } finally {
      setLoading(false)
    }
  }

  const login = async (email, password) => {
    try {
      const res = await api.post("/auth/login", { email, password })
      const { token, user } = res.data

      await AsyncStorage.setItem("token", token)
      await AsyncStorage.setItem("userProfile", JSON.stringify(user))

      setUser({ token })
      setUserProfile(user)
      return { success: true, user }
    } catch (error) {
      console.error("Login error", error.response?.data || error.message)
      return {
        success: false,
        error: error.response?.data?.msg || "Login failed"
      }
    }
  }

  const register = async (userData) => {
    try {
      const res = await api.post("/auth/register", userData)
      const { token, user } = res.data

      await AsyncStorage.setItem("token", token)
      await AsyncStorage.setItem("userProfile", JSON.stringify(user))

      setUser({ token })
      setUserProfile(user)
      return { success: true, user }
    } catch (error) {
      console.error("Register error", error.response?.data || error.message)
      return {
        success: false,
        error: error.response?.data?.msg || "Registration failed"
      }
    }
  }

  const logout = async () => {
    await AsyncStorage.removeItem("token")
    await AsyncStorage.removeItem("userProfile")
    setUser(null)
    setUserProfile(null)
  }

  const value = {
    user,
    userProfile,
    loading,
    login,
    register,
    logout,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
