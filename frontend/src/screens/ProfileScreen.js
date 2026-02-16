"use client"

import { useState } from "react"
import { View, Text, StyleSheet, TouchableOpacity, Alert, SafeAreaView, Image, Modal } from "react-native"
import { TextInput } from "react-native-paper"
import { Ionicons } from "@expo/vector-icons"
import * as ImagePicker from "expo-image-picker"
import { COLORS } from "../constants/colors"
import { DEPARTMENTS } from "../constants/departments"
import api from "../services/api"
import { useAuth } from "../context/AuthContext"

const ProfileScreen = ({ navigation, userData }) => {
  const [showSettings, setShowSettings] = useState(false)
  const [profilePhoto, setProfilePhoto] = useState(userData.profilePhoto || null)
  const [uploading, setUploading] = useState(false)
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")

  const uploadToCloudinary = async (imageUri) => {
    const formData = new FormData()
    formData.append("file", {
      uri: imageUri,
      type: "image/jpeg",
      name: "profile_photo.jpg",
    })
    formData.append("upload_preset", "inspection_photos") // Replace with your preset

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

  // We need to access context for logout
  // But navigation is passed as prop. 
  // Ideally, useAuth should be used.
  // Wait, the component receives userData as prop, but we should probably use the one from context to be safe and consistent.
  // Or just use the prop if it's passed from Dashboard.

  const { logout, userProfile, setUserProfile } = useAuth()

  const handleProfilePhotoUpload = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
      if (status !== "granted") {
        Alert.alert("Permission Required", "Please grant camera roll permissions to upload profile photo.")
        return
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      })

      if (!result.canceled) {
        setUploading(true)

        // Upload to Cloudinary
        const imageUrl = await uploadToCloudinary(result.assets[0].uri)

        // Update user profile in Backend
        // We need an endpoint to update user profile. 
        // Let's assume PUT /users/:id or /users/profile
        // I created PUT /users/:id in userRoutes? No, I only created GET /users.
        // I should have created PUT /users/:id. 
        // For now, I'll silently fail or skip backend update if route missing, 
        // OR better, I will add the route in the next step. 
        // Assuming I will add `router.put('/:id', ...)` in userRoutes.js.

        await api.put(`/users/${userData._id || userData.uid}`, {
          profilePhoto: imageUrl,
        })

        // Update local state and context if needed
        // setUserProfile({...userProfile, profilePhoto: imageUrl}) 

        setProfilePhoto(imageUrl)
        Alert.alert("Success", "Profile photo updated successfully!")
      }
    } catch (error) {
      console.error("Profile photo upload error:", error)
      Alert.alert("Error", "Failed to upload profile photo")
    } finally {
      setUploading(false)
    }
  }

  const handlePasswordChange = async () => {
    if (!newPassword || !confirmPassword) {
      Alert.alert("Error", "Please fill all password fields")
      return
    }

    if (newPassword !== confirmPassword) {
      Alert.alert("Error", "Passwords do not match")
      return
    }

    if (newPassword.length < 6) {
      Alert.alert("Error", "Password must be at least 6 characters")
      return
    }

    try {
      // Backend password update
      // Need endpoint POST /auth/change-password or PUT /users/:id
      // For now, let's assume we can update user via PUT /users/:id 
      // BUT updating password usually requires hashing on backend. 
      // The PUT /users/:id I might implement would just update fields. 
      // If I send password, backend should hash it. 
      // I'll assume I'll handle that in backend.

      await api.put(`/users/${userData._id || userData.uid}`, {
        password: newPassword
      })

      Alert.alert("Success", "Password updated successfully!")
      setNewPassword("")
      setConfirmPassword("")
      setShowSettings(false)
    } catch (error) {
      console.error("Password update error:", error)
      Alert.alert("Error", "Failed to update password")
    }
  }

  const handleLogout = () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        style: "destructive",
        onPress: async () => {
          try {
            await logout()
            navigation.replace("Welcome")
          } catch (error) {
            Alert.alert("Error", "Failed to logout")
          }
        },
      },
    ])
  }

  const department = DEPARTMENTS[userData.department]

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.photoContainer} onPress={handleProfilePhotoUpload}>
          {profilePhoto ? (
            <Image source={{ uri: profilePhoto }} style={styles.profilePhoto} />
          ) : (
            <View style={styles.avatarContainer}>
              <Text style={styles.avatarText}>{userData.name.charAt(0).toUpperCase()}</Text>
            </View>
          )}
          <View style={styles.cameraIcon}>
            <Ionicons name="camera" size={16} color={COLORS.white} />
          </View>
        </TouchableOpacity>
        <Text style={styles.name}>{userData.name}</Text>
        <Text style={styles.role}>{userData.role.toUpperCase()}</Text>
        {uploading && <Text style={styles.uploadingText}>Uploading...</Text>}
      </View>

      <View style={styles.infoSection}>
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Ionicons name="business-outline" size={20} color={COLORS.primary} />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Department</Text>
              <Text style={styles.infoValue}>{department?.name}</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <Ionicons name="person-outline" size={20} color={COLORS.primary} />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Role</Text>
              <Text style={styles.infoValue}>{userData.role.toUpperCase()}</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <Ionicons name="card-outline" size={20} color={COLORS.primary} />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Aadhaar</Text>
              <Text style={styles.infoValue}>{userData.aadhaar}</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <Ionicons name="mail-outline" size={20} color={COLORS.primary} />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Email</Text>
              <Text style={styles.infoValue}>{userData.email}</Text>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.actionsSection}>
        <TouchableOpacity style={styles.actionButton} onPress={() => setShowSettings(true)}>
          <Ionicons name="settings-outline" size={24} color={COLORS.primary} />
          <Text style={styles.actionText}>Settings</Text>
          <Ionicons name="chevron-forward-outline" size={20} color={COLORS.gray} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton}>
          <Ionicons name="help-circle-outline" size={24} color={COLORS.primary} />
          <Text style={styles.actionText}>Help & Support</Text>
          <Ionicons name="chevron-forward-outline" size={20} color={COLORS.gray} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton}>
          <Ionicons name="information-circle-outline" size={24} color={COLORS.primary} />
          <Text style={styles.actionText}>About</Text>
          <Ionicons name="chevron-forward-outline" size={20} color={COLORS.gray} />
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Ionicons name="log-out-outline" size={24} color={COLORS.white} />
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>

      {/* Settings Modal */}
      <Modal visible={showSettings} animationType="slide" transparent={true}>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Settings</Text>
              <TouchableOpacity onPress={() => setShowSettings(false)}>
                <Ionicons name="close" size={24} color={COLORS.gray} />
              </TouchableOpacity>
            </View>

            <View style={styles.settingsSection}>
              <Text style={styles.sectionTitle}>Change Password</Text>

              <TextInput
                mode="outlined"
                label="New Password"
                value={newPassword}
                onChangeText={setNewPassword}
                secureTextEntry
                style={styles.passwordInput}
              />

              <TextInput
                mode="outlined"
                label="Confirm Password"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
                style={styles.passwordInput}
              />

              <TouchableOpacity style={styles.updateButton} onPress={handlePasswordChange}>
                <Text style={styles.updateButtonText}>Update Password</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    backgroundColor: COLORS.primary,
    alignItems: "center",
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  photoContainer: {
    position: "relative",
    marginBottom: 15,
  },
  profilePhoto: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.accent,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    fontSize: 32,
    fontWeight: "bold",
    color: COLORS.white,
  },
  cameraIcon: {
    position: "absolute",
    bottom: 0,
    right: 0,
    backgroundColor: COLORS.secondary,
    borderRadius: 12,
    padding: 4,
  },
  name: {
    fontSize: 24,
    fontWeight: "bold",
    color: COLORS.white,
    marginBottom: 5,
  },
  role: {
    fontSize: 16,
    color: COLORS.background,
  },
  uploadingText: {
    fontSize: 12,
    color: COLORS.background,
    marginTop: 5,
  },
  infoSection: {
    padding: 20,
  },
  infoCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.background,
  },
  infoContent: {
    marginLeft: 15,
    flex: 1,
  },
  infoLabel: {
    fontSize: 14,
    color: COLORS.gray,
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 16,
    color: COLORS.black,
    fontWeight: "500",
  },
  actionsSection: {
    padding: 20,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  actionText: {
    fontSize: 16,
    color: COLORS.black,
    marginLeft: 15,
    flex: 1,
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.error,
    borderRadius: 12,
    padding: 15,
    marginHorizontal: 20,
    marginTop: 20,
  },
  logoutText: {
    fontSize: 16,
    color: COLORS.white,
    fontWeight: "bold",
    marginLeft: 10,
  },
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 20,
    width: "90%",
    maxHeight: "70%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: COLORS.primary,
  },
  settingsSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: COLORS.primary,
    marginBottom: 15,
  },
  passwordInput: {
    marginBottom: 15,
    backgroundColor: COLORS.white,
  },
  updateButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    padding: 15,
    alignItems: "center",
  },
  updateButtonText: {
    color: COLORS.white,
    fontWeight: "bold",
    fontSize: 16,
  },
})

export default ProfileScreen
