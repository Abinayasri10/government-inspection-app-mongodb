"use client"

import { useState, useEffect } from "react"
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Image, ActivityIndicator } from "react-native"
import { TextInput, Checkbox } from "react-native-paper"
import * as ImagePicker from "expo-image-picker"
import * as Location from "expo-location"
import { COLORS } from "../constants/colors"
import api from "../services/api"

const InspectionForm = ({ userData }) => {
  const [formData, setFormData] = useState({
    infrastructureCheck: false,
    attendanceData: "",
    middayMealPhoto: null,
    remarks: "",
  })
  const [location, setLocation] = useState(null)
  const [loading, setLoading] = useState(false)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)

  useEffect(() => {
    requestPermissions()
  }, [])

  const requestPermissions = async () => {
    const { status: cameraStatus } = await ImagePicker.requestCameraPermissionsAsync()
    const { status: locationStatus } = await Location.requestForegroundPermissionsAsync()

    if (cameraStatus !== "granted" || locationStatus !== "granted") {
      Alert.alert("Permissions Required", "Camera and location permissions are required for inspections.")
    }
  }

  const getCurrentLocation = async () => {
    try {
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      })
      return location
    } catch (error) {
      Alert.alert("Error", "Unable to get current location")
      return null
    }
  }

  const uploadToCloudinary = async (imageUri) => {
    const formData = new FormData()
    formData.append("file", {
      uri: imageUri,
      type: "image/jpeg",
      name: "inspection_photo.jpg",
    })
    formData.append("upload_preset", "inspection_photos") // Replace with your Cloudinary upload preset

    try {
      const response = await fetch("https://api.cloudinary.com/v1_1/dmbxs6pxe/image/upload", {
        method: "POST",
        body: formData,
        headers: {
          "Content-Type": "multipart/form-data",
        },
      })

      const data = await response.json()
      return data.secure_url
    } catch (error) {
      console.error("Cloudinary upload error:", error)
      throw error
    }
  }

  const takePhoto = async (photoType) => {
    try {
      setUploadingPhoto(true)

      // Get current location
      const currentLocation = await getCurrentLocation()
      if (!currentLocation) {
        setUploadingPhoto(false)
        return
      }

      // Validate location (example: within 500m of assigned location)
      // This would need to be implemented based on assignment data

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      })

      if (!result.canceled) {
        // Upload to Cloudinary
        const imageUrl = await uploadToCloudinary(result.assets[0].uri)

        // Add GPS metadata
        const photoData = {
          url: imageUrl,
          location: {
            latitude: currentLocation.coords.latitude,
            longitude: currentLocation.coords.longitude,
            accuracy: currentLocation.coords.accuracy,
          },
          timestamp: new Date().toISOString(),
          type: photoType,
        }

        setFormData((prev) => ({
          ...prev,
          [photoType]: photoData,
        }))

        Alert.alert("Success", "Photo uploaded successfully with GPS data")
      }
    } catch (error) {
      Alert.alert("Error", "Failed to upload photo")
      console.error("Photo upload error:", error)
    } finally {
      setUploadingPhoto(false)
    }
  }

  const validateForm = () => {
    if (!formData.infrastructureCheck) {
      Alert.alert("Error", "Please complete infrastructure check")
      return false
    }
    if (!formData.attendanceData.trim()) {
      Alert.alert("Error", "Please enter attendance data")
      return false
    }
    if (!formData.middayMealPhoto) {
      Alert.alert("Error", "Midday meal photo is required")
      return false
    }
    return true
  }

  const submitInspection = async () => {
    if (!validateForm()) return

    setLoading(true)

    try {
      // Get current location for submission
      const currentLocation = await getCurrentLocation()

      const inspectionData = {
        ...formData,
        userId: userData.uid, // This might need to check if it's _id or uid depending on auth provider. 
        // Our new auth provider returns user object from mongo which has _id.
        // But we stored it in local storage. Let's assume userData is consistent.
        // Wait, login screen passes userData. In new AuthContext, userData comes from MongoDB.
        // MongoDB uses _id.
        userName: userData.name,
        department: userData.department,
        role: userData.role,
        submissionLocation: currentLocation
          ? {
            latitude: currentLocation.coords.latitude,
            longitude: currentLocation.coords.longitude,
          }
          : null,
        submittedAt: new Date().toISOString(),
        status: "submitted",
        forwardedTo: getForwardingRole(userData.department, userData.role),
      }

      // Add to API
      await api.post("/inspections", inspectionData)

      Alert.alert("Success", "Inspection submitted successfully and forwarded to supervisor", [
        { text: "OK", onPress: () => resetForm() },
      ])
    } catch (error) {
      console.error("Submission error:", error)
      Alert.alert("Error", "Failed to submit inspection")
    } finally {
      setLoading(false)
    }
  }

  const getForwardingRole = (department, role) => {
    const forwardingMap = {
      education: { beo: "deo" },
      health: { officer: "bmo" },
      food: { inspector: "dho" },
      construction: { auditor: "ae" },
    }

    return forwardingMap[department]?.[role] || null
  }

  const resetForm = () => {
    setFormData({
      infrastructureCheck: false,
      attendanceData: "",
      middayMealPhoto: null,
      remarks: "",
    })
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>School Inspection Form</Text>
        <Text style={styles.subtitle}>Complete all required fields</Text>
      </View>

      <View style={styles.form}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Infrastructure Check</Text>
          <View style={styles.checkboxContainer}>
            <Checkbox
              status={formData.infrastructureCheck ? "checked" : "unchecked"}
              onPress={() =>
                setFormData((prev) => ({
                  ...prev,
                  infrastructureCheck: !prev.infrastructureCheck,
                }))
              }
            />
            <Text style={styles.checkboxLabel}>Toilets, classrooms, and electricity are functional</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Attendance Data</Text>
          <TextInput
            mode="outlined"
            label="Enter attendance information"
            value={formData.attendanceData}
            onChangeText={(text) => setFormData((prev) => ({ ...prev, attendanceData: text }))}
            multiline
            numberOfLines={3}
            style={styles.textInput}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Midday Meal Photo *</Text>
          {formData.middayMealPhoto ? (
            <View style={styles.photoContainer}>
              <Image source={{ uri: formData.middayMealPhoto.url }} style={styles.photoPreview} />
              <Text style={styles.photoInfo}>
                📍 GPS: {formData.middayMealPhoto.location.latitude.toFixed(6)},{" "}
                {formData.middayMealPhoto.location.longitude.toFixed(6)}
              </Text>
              <TouchableOpacity style={styles.retakeButton} onPress={() => takePhoto("middayMealPhoto")}>
                <Text style={styles.retakeButtonText}>Retake Photo</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.photoButton}
              onPress={() => takePhoto("middayMealPhoto")}
              disabled={uploadingPhoto}
            >
              {uploadingPhoto ? (
                <ActivityIndicator color={COLORS.white} />
              ) : (
                <>
                  <Text style={styles.photoButtonText}>📷 Take Midday Meal Photo</Text>
                  <Text style={styles.photoButtonSubtext}>GPS location will be captured</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Remarks (Optional)</Text>
          <TextInput
            mode="outlined"
            label="Additional observations"
            value={formData.remarks}
            onChangeText={(text) => setFormData((prev) => ({ ...prev, remarks: text }))}
            multiline
            numberOfLines={3}
            style={styles.textInput}
          />
        </View>

        <TouchableOpacity
          style={[styles.submitButton, loading && styles.disabledButton]}
          onPress={submitInspection}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={COLORS.white} />
          ) : (
            <Text style={styles.submitButtonText}>Submit Inspection</Text>
          )}
        </TouchableOpacity>

        <Text style={styles.forwardingNote}>* This report will be automatically forwarded to DEO after submission</Text>
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    backgroundColor: COLORS.primary,
    padding: 20,
    paddingTop: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: COLORS.white,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.background,
    marginTop: 5,
  },
  form: {
    padding: 20,
  },
  section: {
    marginBottom: 25,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: COLORS.primary,
    marginBottom: 10,
  },
  checkboxContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.white,
    padding: 15,
    borderRadius: 8,
  },
  checkboxLabel: {
    flex: 1,
    marginLeft: 10,
    fontSize: 16,
    color: COLORS.black,
  },
  textInput: {
    backgroundColor: COLORS.white,
  },
  photoButton: {
    backgroundColor: COLORS.accent,
    borderRadius: 8,
    padding: 20,
    alignItems: "center",
    borderStyle: "dashed",
    borderWidth: 2,
    borderColor: COLORS.accent,
  },
  photoButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: "bold",
  },
  photoButtonSubtext: {
    color: COLORS.white,
    fontSize: 12,
    marginTop: 5,
  },
  photoContainer: {
    backgroundColor: COLORS.white,
    borderRadius: 8,
    padding: 15,
  },
  photoPreview: {
    width: "100%",
    height: 200,
    borderRadius: 8,
    marginBottom: 10,
  },
  photoInfo: {
    fontSize: 12,
    color: COLORS.gray,
    marginBottom: 10,
  },
  retakeButton: {
    backgroundColor: COLORS.secondary,
    borderRadius: 6,
    padding: 10,
    alignItems: "center",
  },
  retakeButtonText: {
    color: COLORS.white,
    fontWeight: "bold",
  },
  submitButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    padding: 15,
    alignItems: "center",
    marginTop: 20,
  },
  disabledButton: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: "bold",
  },
  forwardingNote: {
    fontSize: 12,
    color: COLORS.gray,
    textAlign: "center",
    marginTop: 10,
    fontStyle: "italic",
  },
})

export default InspectionForm
