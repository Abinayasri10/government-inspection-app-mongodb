"use client"

import { useState, useEffect } from "react"
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  ActivityIndicator,
} from "react-native"
import { Picker } from "@react-native-picker/picker"
import * as LocalAuthentication from "expo-local-authentication"
import { COLORS } from "../constants/colors"
import { DEPARTMENTS } from "../constants/departments"
import { useAuth } from "../context/AuthContext"

const LoginScreen = ({ navigation, route }) => {
  const { departmentId, departmentName, departmentRoles } = route.params
  const [aadhaar, setAadhaar] = useState("")
  const [selectedRole, setSelectedRole] = useState("")
  const [otp, setOtp] = useState("")
  const [loading, setLoading] = useState(false)
  const [biometricAvailable, setBiometricAvailable] = useState(false)
  const [fingerprintAvailable, setFingerprintAvailable] = useState(false)

  const { login } = useAuth()

  useEffect(() => {
    checkBiometricAvailability()
  }, [])

  const checkBiometricAvailability = async () => {
    const compatible = await LocalAuthentication.hasHardwareAsync()
    const enrolled = await LocalAuthentication.isEnrolledAsync()
    const types = await LocalAuthentication.supportedAuthenticationTypesAsync()

    // Types: 1 = Fingerprint, 2 = Facial Recognition
    setFingerprintAvailable(types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT))

    setBiometricAvailable(compatible && enrolled)
  }

  const validateAadhaar = (text) => {
    const cleaned = text.replace(/\D/g, "")
    if (cleaned.length <= 12) {
      setAadhaar(cleaned)
    }
  }

  const validateOTP = (text) => {
    const cleaned = text.replace(/\D/g, "")
    if (cleaned.length <= 6) {
      setOtp(cleaned)
    }
  }

  const handleBiometricAuth = async (method = "Biometric") => {
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: `Authenticate with ${method}`,
        fallbackLabel: "Use OTP instead",
      })

      if (result.success) {
        handleLogin(true)
      }
    } catch (error) {
      Alert.alert("Error", `${method} authentication failed`)
    }
  }

  const validateInputs = (biometricAuth) => {
    if (!aadhaar || aadhaar.length !== 12) {
      Alert.alert("Error", "Please enter a valid 12-digit Aadhaar number")
      return false
    }

    if (!selectedRole) {
      Alert.alert("Error", "Please select your role")
      return false
    }

    if (!biometricAuth && (!otp || otp.length !== 6)) {
      Alert.alert("Error", "Please enter a valid 6-digit OTP")
      return false
    }

    if (!biometricAuth && otp !== "123456") {
      Alert.alert("Error", "Invalid OTP. Please try again.")
      return false
    }
    return true
  }

  const handleLogin = async (biometricAuth = false) => {
    if (!validateInputs(biometricAuth)) return

    setLoading(true)

    try {
      const email = `${aadhaar}@gov.in`
      const password = `${aadhaar}${selectedRole}`

      const result = await login(email, password)

      if (result.success) {
        const userData = result.user

        // Optional: Check if department matches
        // But for new users, we might want to allow login regardless and just use the profile data
        // However, the screen context is specific to a department.
        if (userData.department !== departmentId) {
          Alert.alert("Department Mismatch", `This user belongs to ${userData.department.toUpperCase()} department.`)
          setLoading(false)
          return
        }

        navigation.replace("Dashboard", {
          department: departmentId, // or userData.department
          role: selectedRole, // or userData.role
          userData: userData,
        })
      } else {
        Alert.alert("Login Failed", result.error)
      }
    } catch (error) {
      console.error("Login error:", error)
      Alert.alert("Error", "Login failed. Please check your credentials.")
    } finally {
      setLoading(false)
    }
  }



  const department = DEPARTMENTS[departmentId]

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.departmentIcon}>{department.icon}</Text>
          <Text style={styles.departmentName}>{departmentName}</Text>
          <Text style={styles.subtitle}>Enter your credentials to continue</Text>
        </View>

        <View style={styles.form}>
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Aadhaar Number</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter 12-digit Aadhaar number"
              value={aadhaar}
              onChangeText={validateAadhaar}
              keyboardType="numeric"
              maxLength={12}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Select Role</Text>
            <View style={styles.pickerContainer}>
              <Picker selectedValue={selectedRole} onValueChange={setSelectedRole} style={styles.picker}>
                <Picker.Item label="Select your role..." value="" />
                {departmentRoles.map((role) => (
                  <Picker.Item key={role.id} label={role.name} value={role.id} />
                ))}
              </Picker>
            </View>
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>OTP</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter 6-digit OTP (123456)"
              value={otp}
              onChangeText={validateOTP}
              keyboardType="numeric"
              maxLength={6}
              secureTextEntry
            />
          </View>

          <TouchableOpacity
            style={[styles.loginButton, loading && styles.disabledButton]}
            onPress={() => handleLogin(false)}
            disabled={loading}
          >
            {loading ? <ActivityIndicator color={COLORS.white} /> : <Text style={styles.buttonText}>Login</Text>}
          </TouchableOpacity>



          {biometricAvailable && (
            <>
              {fingerprintAvailable && (
                <TouchableOpacity
                  style={styles.biometricButton}
                  onPress={() => handleBiometricAuth("Fingerprint")}
                  disabled={loading}
                >
                  <Text style={styles.biometricText}>👆 Use Fingerprint Authentication</Text>
                </TouchableOpacity>
              )}
            </>
          )}
        </View>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  header: {
    alignItems: "center",
    marginBottom: 40,
  },
  departmentIcon: {
    fontSize: 60,
    marginBottom: 10,
  },
  departmentName: {
    fontSize: 24,
    fontWeight: "bold",
    color: COLORS.primary,
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.gray,
    textAlign: "center",
  },
  form: {
    flex: 1,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: "bold",
    color: COLORS.primary,
    marginBottom: 8,
  },
  input: {
    backgroundColor: COLORS.white,
    borderRadius: 8,
    padding: 15,
    fontSize: 16,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
  },
  pickerContainer: {
    backgroundColor: COLORS.white,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
  },
  picker: {
    height: 50,
  },
  loginButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    padding: 15,
    marginTop: 20,
    shadowColor: '#030303ff',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  testButton: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.secondary,
    borderRadius: 8,
    padding: 15,
    marginTop: 10,
  },
  testButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
  disabledButton: {
    opacity: 0.6,
  },
  buttonText: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  biometricButton: {
    backgroundColor: COLORS.accent,
    borderRadius: 8,
    padding: 15,
    alignItems: "center",
    marginTop: 15,
  },
  biometricText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: "bold",
  },
})

export default LoginScreen
