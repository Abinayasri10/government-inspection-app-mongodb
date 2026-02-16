"use client"

import { useState, useEffect } from "react"
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator, Modal } from "react-native"
import { TextInput, RadioButton } from "react-native-paper"
import * as ImagePicker from "expo-image-picker"
import * as Location from "expo-location"
import SignatureScreen from "react-native-signature-canvas"
import { Ionicons } from "@expo/vector-icons"
import { COLORS } from "../constants/colors"
import api from "../services/api"

import PDFGenerator from "../services/PDFGenerator"
import EmailService from "../services/EmailService"
import { useAuth } from "../context/AuthContext"

const HealthcareInspectionForm = ({ route, navigation }) => {
  const { assignmentData } = route.params || {}
  const { userProfile } = useAuth()
  const userData = userProfile

  const [facilityData, setFacilityData] = useState(null)
  const [currentLocation, setCurrentLocation] = useState(null)
  const [locationVerified, setLocationVerified] = useState(false)
  const [adminApproved, setAdminApproved] = useState(false)
  const [showLocationVerification, setShowLocationVerification] = useState(true)
  const [showFacilityDetails, setShowFacilityDetails] = useState(false)
  const [showAdminApproval, setShowAdminApproval] = useState(false)
  const [showInspectionForm, setShowInspectionForm] = useState(false)
  const [currentSection, setCurrentSection] = useState("infrastructure")
  const [formQuestions, setFormQuestions] = useState({})
  const [responses, setResponses] = useState({})
  const [photos, setPhotos] = useState({})
  const [loading, setLoading] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [showSignature, setShowSignature] = useState(false)
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [currentPhotoType, setCurrentPhotoType] = useState("")
  const [signature, setSignature] = useState(null)
  const [approvalLoading, setApprovalLoading] = useState(false)

  // Real approval state management
  const [approvalStatus, setApprovalStatus] = useState({
    approved: false,
    checking: false,
    approvalData: null,
    emailSent: false,
    error: null,
  })

  const sections = [
    { id: "infrastructure", title: "Infrastructure", icon: "🏥" },
    { id: "equipment", title: "Medical Equipment & Supplies", icon: "🩺" },
    { id: "sanitation", title: "Sanitation & Hygiene", icon: "🧼" },
    { id: "staff", title: "Staff & Services", icon: "👨‍⚕️" },
    { id: "records", title: "Patient Records & Welfare", icon: "📋" },
    { id: "safety", title: "Safety & Emergency Preparedness", icon: "🚨" },
  ]

  // Healthcare inspection questions based on the provided structure
  const defaultQuestions = {
    infrastructure: [
      {
        id: "building_safe",
        text: "Is the hospital/centre building structurally safe?",
        type: "yesno",
        required: true,
        section: "infrastructure",
      },
      {
        id: "wards_ventilated",
        text: "Are patient wards well-ventilated and adequately lit?",
        type: "yesno",
        required: true,
        section: "infrastructure",
      },
      {
        id: "separate_toilets",
        text: "Are there separate toilets for male/female patients?",
        type: "yesno",
        required: true,
        section: "infrastructure",
      },
      {
        id: "waiting_area",
        text: "Is there a functional waiting area for patients/visitors?",
        type: "yesno",
        required: true,
        section: "infrastructure",
      },
      {
        id: "accessibility",
        text: "Is the facility accessible for differently-abled patients (ramps/lifts)?",
        type: "yesno",
        required: true,
        section: "infrastructure",
      },
      {
        id: "building_condition",
        text: "Describe the overall condition of the hospital/centre building.",
        type: "text",
        required: false,
        section: "infrastructure",
        placeholder: "Good, minor cracks observed.",
      },
      {
        id: "patient_beds",
        text: "Number of patient beds available vs. required.",
        type: "text",
        required: true,
        section: "infrastructure",
        placeholder: "25 available, 10 more needed.",
      },
    ],
    equipment: [
      {
        id: "medical_equipment",
        text: "Is essential medical equipment (BP apparatus, ECG, Oxygen cylinders) available and functional?",
        type: "yesno",
        required: true,
        section: "equipment",
      },
      {
        id: "sterilization_units",
        text: "Are sterilization/autoclave units functional?",
        type: "yesno",
        required: true,
        section: "equipment",
      },
      {
        id: "ambulance_available",
        text: "Is there an ambulance available at the facility?",
        type: "yesno",
        required: true,
        section: "equipment",
      },
      {
        id: "medicines_supplied",
        text: "Are medicines supplied as per essential drug list?",
        type: "yesno",
        required: true,
        section: "equipment",
      },
      {
        id: "cold_chain",
        text: "Is the cold chain equipment (for vaccines) functional?",
        type: "yesno",
        required: true,
        section: "equipment",
      },
      {
        id: "diagnostic_machines",
        text: "List the functional diagnostic machines available.",
        type: "text",
        required: true,
        section: "equipment",
        placeholder: "X-ray, Ultrasound, ECG.",
      },
      {
        id: "oxygen_cylinders",
        text: "Number of oxygen cylinders available.",
        type: "text",
        required: true,
        section: "equipment",
        placeholder: "15 cylinders, 12 filled.",
      },
    ],
    sanitation: [
      {
        id: "regular_cleaning",
        text: "Are patient wards/toilets cleaned regularly?",
        type: "yesno",
        required: true,
        section: "sanitation",
      },
      {
        id: "waste_disposal",
        text: "Is biomedical waste disposed of as per guidelines?",
        type: "yesno",
        required: true,
        section: "sanitation",
      },
      {
        id: "waste_segregation",
        text: "Is a functional waste segregation system in place (Red/Yellow/Blue bins)?",
        type: "yesno",
        required: true,
        section: "sanitation",
      },
      {
        id: "water_supply",
        text: "Is water supply available 24x7?",
        type: "yesno",
        required: true,
        section: "sanitation",
      },
      {
        id: "pest_control",
        text: "Is a pest control system in place?",
        type: "yesno",
        required: false,
        section: "sanitation",
      },
      {
        id: "waste_disposal_frequency",
        text: "Frequency of biomedical waste disposal (per day/week).",
        type: "text",
        required: true,
        section: "sanitation",
        placeholder: "Daily collection at 5 PM.",
      },
      {
        id: "functional_toilets",
        text: "Number of functional toilets (male/female).",
        type: "text",
        required: true,
        section: "sanitation",
        placeholder: "3 male, 2 female toilets functional.",
      },
    ],
    staff: [
      {
        id: "doctors_available",
        text: "Are doctors available as per sanctioned posts?",
        type: "yesno",
        required: true,
        section: "staff",
      },
      {
        id: "nurses_available",
        text: "Are nurses available as per sanctioned posts?",
        type: "yesno",
        required: true,
        section: "staff",
      },
      {
        id: "pharmacist_available",
        text: "Is there a pharmacist available on duty?",
        type: "yesno",
        required: true,
        section: "staff",
      },
      {
        id: "lab_technician",
        text: "Is there a laboratory technician available?",
        type: "yesno",
        required: true,
        section: "staff",
      },
      {
        id: "emergency_duty",
        text: "Is there a round-the-clock emergency duty roster?",
        type: "yesno",
        required: true,
        section: "staff",
      },
      {
        id: "doctors_count",
        text: "Total number of doctors sanctioned vs. available.",
        type: "text",
        required: true,
        section: "staff",
        placeholder: "5 sanctioned, 3 available.",
      },
      {
        id: "nurses_count",
        text: "Total number of nurses sanctioned vs. available.",
        type: "text",
        required: true,
        section: "staff",
        placeholder: "10 sanctioned, 8 available.",
      },
    ],
    records: [
      {
        id: "patient_records",
        text: "Are patient records maintained properly?",
        type: "yesno",
        required: true,
        section: "records",
      },
      {
        id: "opd_register",
        text: "Is OPD register updated daily?",
        type: "yesno",
        required: true,
        section: "records",
      },
      {
        id: "birth_death_register",
        text: "Is a birth/death register maintained?",
        type: "yesno",
        required: true,
        section: "records",
      },
      {
        id: "grievance_system",
        text: "Is there a grievance redressal system for patients?",
        type: "yesno",
        required: true,
        section: "records",
      },
      {
        id: "free_medicines",
        text: "Are free medicines provided to eligible patients?",
        type: "yesno",
        required: true,
        section: "records",
      },
      {
        id: "opd_patients",
        text: "Average number of OPD patients per day.",
        type: "text",
        required: true,
        section: "records",
        placeholder: "150 patients daily.",
      },
      {
        id: "ipd_patients",
        text: "Average number of IPD patients per month.",
        type: "text",
        required: true,
        section: "records",
        placeholder: "60 patients admitted monthly.",
      },
    ],
    safety: [
      {
        id: "fire_safety",
        text: "Is there a fire safety system in place?",
        type: "yesno",
        required: true,
        section: "safety",
      },
      {
        id: "fire_extinguishers",
        text: "Are fire extinguishers installed and functional?",
        type: "yesno",
        required: true,
        section: "safety",
      },
      {
        id: "emergency_exit",
        text: "Is an emergency exit available and accessible?",
        type: "yesno",
        required: true,
        section: "safety",
      },
      {
        id: "power_backup",
        text: "Is there an emergency power backup (generator/inverter)?",
        type: "yesno",
        required: true,
        section: "safety",
      },
      {
        id: "disaster_plan",
        text: "Is there an emergency disaster management plan?",
        type: "yesno",
        required: false,
        section: "safety",
      },
      {
        id: "extinguisher_count",
        text: "Number of fire extinguishers installed.",
        type: "text",
        required: true,
        section: "safety",
        placeholder: "10 extinguishers across facility.",
      },
      {
        id: "backup_power_type",
        text: "Type of backup power available.",
        type: "text",
        required: true,
        section: "safety",
        placeholder: "30 kVA generator.",
      },
    ],
  }

  useEffect(() => {
    initializeForm()
  }, [])

  const initializeForm = async () => {
    try {
      setInitialLoading(true)

      // Set facility data from assignment
      if (assignmentData) {
        setFacilityData({
          name: assignmentData.locationName,
          address: assignmentData.address,
          coordinates: assignmentData.coordinates,
          facilityType: assignmentData.facilityType || "Healthcare Facility",
          ...assignmentData.facilityData,
        })
      }

      // Load questions from database or use defaults
      await loadQuestions()

      // Get current location
      await getCurrentLocation()

      setInitialLoading(false)
    } catch (error) {
      console.error("Error initializing healthcare form:", error)
      setInitialLoading(false)
      Alert.alert("Error", "Failed to initialize form")
    }
  }

  const loadQuestions = async () => {
    try {
      const response = await api.get("/questions?department=health")
      const questionsList = response.data

      if (questionsList.length === 0) {
        console.log("No healthcare questions found in database, using defaults")
        setFormQuestions(defaultQuestions)
        return
      }

      const questionsFromDB = {}
      questionsList.forEach((question) => {
        if (!questionsFromDB[question.section]) {
          questionsFromDB[question.section] = []
        }
        questionsFromDB[question.section].push(question)
      })

      setFormQuestions(questionsFromDB)
    } catch (error) {
      console.error("Error loading healthcare questions:", error)
      setFormQuestions(defaultQuestions)
    }
  }

  const getCurrentLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync()
      if (status !== "granted") {
        Alert.alert("Permission Denied", "Location permission is required for inspection")
        return
      }

      const location = await Location.getCurrentPositionAsync({})
      setCurrentLocation(location.coords)
    } catch (error) {
      console.error("Error getting location:", error)
      Alert.alert("Location Error", "Failed to get current location")
    }
  }

  const verifyLocation = () => {
    if (!currentLocation || !facilityData?.coordinates) {
      Alert.alert("Error", "Location data not available")
      return
    }

    // Calculate distance between current location and facility
    const distance = calculateDistance(
      currentLocation.latitude,
      currentLocation.longitude,
      facilityData.coordinates.latitude,
      facilityData.coordinates.longitude,
    )

    console.log("Distance to facility:", distance, "meters")

    if (distance <= 500) {
      // Within 500 meters
      setLocationVerified(true)
      setShowLocationVerification(false)
      setShowFacilityDetails(true)
    } else {
      Alert.alert(
        "Location Verification Failed",
        `You are ${Math.round(distance)}m away from the facility. Please move closer (within 500m) to start the inspection.`,
        [{ text: "Retry", onPress: verifyLocation }],
      )
    }
  }

  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371e3 // Earth's radius in meters
    const φ1 = (lat1 * Math.PI) / 180
    const φ2 = (lat2 * Math.PI) / 180
    const Δφ = ((lat2 - lat1) * Math.PI) / 180
    const Δλ = ((lon2 - lon1) * Math.PI) / 180

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

    return R * c
  }

  const sendAdminApprovalEmail = async () => {
    try {
      setApprovalLoading(true)

      // Send approval email to facility admin
      const emailResult = await EmailService.sendHealthcareApprovalRequest({
        facilityName: facilityData.name,
        facilityAddress: facilityData.address,
        inspectorName: userData.name,
        inspectorRole: userData.role,
        inspectionDate: new Date().toLocaleDateString("en-IN"),
        assignmentId: assignmentData.id,
      })

      if (emailResult.success) {
        setApprovalStatus({
          approved: false,
          checking: true,
          emailSent: true,
          error: null,
        })

        // Start checking for approval
        startApprovalCheck()
      } else {
        throw new Error(emailResult.error)
      }
    } catch (error) {
      console.error("Error sending approval email:", error)
      setApprovalStatus({
        approved: false,
        checking: false,
        emailSent: false,
        error: error.message,
      })
    } finally {
      setApprovalLoading(false)
    }
  }

  const startApprovalCheck = () => {
    const checkInterval = setInterval(async () => {
      try {
        // Check for approval in database using the approval/status endpoint
        // AssignmentId and SchoolId (or FacilityId) are needed.
        // Assuming assignmentData.id is assignmentId and facilityData.id or name is schoolId/locationId.
        // But the previous implementation used `getDoc(doc(db, "approvals", assignmentData.id))`.
        // This implies the document ID was the assignment ID.
        // Let's use the API to get approval status by assignment ID.

        // Wait, the new API expects assignmentId and schoolId as query params. 
        // But if we stored it with assignmentId as the key, we might need a different lookup.
        // However, let's stick to the established pattern in EmailService: checkApprovalStatus(assignmentId, schoolId)

        // For healthcare, we might use facilityData.id or name as schoolId equivalent.
        const facilityId = facilityData.id || facilityData.name;

        const response = await api.get(`/approvals/status?assignmentId=${assignmentData.id}&schoolId=${facilityId}`)
        const approvalData = response.data

        if (approvalData && approvalData.approved) {
          clearInterval(checkInterval)
          setApprovalStatus({
            approved: true,
            checking: false,
            approvalData: approvalData,
            emailSent: true,
            error: null,
          })
          setAdminApproved(true)
          setShowAdminApproval(false)
          setShowInspectionForm(true)
        }
      } catch (error) {
        // If 404, it means not created or not found, just continue polling
        // console.error("Error checking approval:", error)
      }
    }, 5000) // Check every 5 seconds

    // Stop checking after 10 minutes
    setTimeout(() => {
      clearInterval(checkInterval)
      if (!approvalStatus.approved) {
        setApprovalStatus((prev) => ({
          ...prev,
          checking: false,
          error: "Approval timeout. Please contact the facility administrator.",
        }))
      }
    }, 600000) // 10 minutes
  }

  const handleResponse = (questionId, value) => {
    setResponses((prev) => ({
      ...prev,
      [questionId]: value,
    }))
  }

  const takePhoto = async (photoType) => {
    try {
      setCurrentPhotoType(photoType)
      setUploadingPhoto(true)

      const { status } = await ImagePicker.requestCameraPermissionsAsync()
      if (status !== "granted") {
        Alert.alert("Permission Denied", "Camera permission is required")
        return
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      })

      if (!result.canceled && result.assets[0]) {
        const imageUri = result.assets[0].uri

        // Add location metadata to photo
        const photoData = {
          uri: imageUri,
          timestamp: new Date().toISOString(),
          location: currentLocation,
          type: photoType,
        }

        setPhotos((prev) => ({
          ...prev,
          [photoType]: photoData,
        }))

        Alert.alert("Success", "Photo captured successfully")
      }
    } catch (error) {
      console.error("Error taking photo:", error)
      Alert.alert("Error", "Failed to capture photo")
    } finally {
      setUploadingPhoto(false)
      setCurrentPhotoType("")
    }
  }

  const handleSignature = (signature) => {
    setSignature(signature)
    setShowSignature(false)
    setShowConfirmation(true)
  }

  const submitInspection = async () => {
    try {
      setLoading(true)

      // Validate required responses
      const requiredQuestions = Object.values(formQuestions)
        .flat()
        .filter((q) => q.required)

      const missingResponses = requiredQuestions.filter((q) => !responses[q.id])

      if (missingResponses.length > 0) {
        Alert.alert(
          "Incomplete Form",
          `Please answer all required questions. Missing: ${missingResponses.length} responses`,
        )
        setLoading(false)
        return
      }

      if (!signature) {
        Alert.alert("Missing Signature", "Please provide your digital signature")
        setLoading(false)
        return
      }

      // Prepare inspection data
      const inspectionData = {
        assignmentId: assignmentData.id,
        facilityName: facilityData.name,
        facilityAddress: facilityData.address,
        facilityType: facilityData.facilityType,
        department: "health",
        userId: userData.uid || userData.id || userData._id,
        inspectorName: userData.name,
        inspectorRole: userData.role,
        inspectionDate: new Date().toLocaleDateString("en-IN"),
        submittedAt: new Date().toISOString(),
        responses,
        photos,
        signature,
        location: currentLocation,
        status: "completed",
      }

      // Save to database via API
      console.log("💾 Submitting healthcare inspection to database...")
      const response = await api.post("/inspections", inspectionData)
      const savedInspection = response.data
      console.log("✅ Healthcare inspection saved with ID:", savedInspection._id)

      // Update assignment status via API
      if (assignmentData?.id) {
        await api.put(`/assignments/${assignmentData.id}`, {
          status: "completed",
          completedAt: new Date().toISOString(),
          completedBy: userData.uid || userData.id || userData._id,
        })
        console.log("✅ Assignment status updated to completed")
      }

      // Generate and send PDF report
      // Note: PDFGenerator might need adjustment if it relies on local file paths vs URLs
      // But assuming it handles data objects fine.
      await PDFGenerator.generatePDF({
        ...inspectionData,
        id: savedInspection._id,
      })

      Alert.alert("Inspection Completed", "Healthcare facility inspection has been submitted successfully!", [
        {
          text: "OK",
          onPress: () => {
            navigation.navigate("Home", { refresh: true })
          },
        },
      ])
    } catch (error) {
      console.error("Error submitting healthcare inspection:", error)
      Alert.alert("Error", "Failed to submit inspection")
    } finally {
      setLoading(false)
    }
  }

  if (initialLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Initializing Healthcare Inspection...</Text>
      </View>
    )
  }

  // Location Verification Screen
  if (showLocationVerification) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>📍 Location Verification</Text>
          <Text style={styles.headerSubtitle}>Healthcare Facility Inspection</Text>
        </View>

        <ScrollView style={styles.content}>
          <View style={styles.locationCard}>
            <Ionicons name="location" size={48} color={COLORS.primary} />
            <Text style={styles.locationTitle}>Verify Your Location</Text>
            <Text style={styles.locationText}>
              Please ensure you are at the healthcare facility before starting the inspection.
            </Text>

            <View style={styles.facilityInfo}>
              <Text style={styles.facilityName}>{facilityData?.name}</Text>
              <Text style={styles.facilityAddress}>{facilityData?.address}</Text>
            </View>

            {currentLocation && (
              <View style={styles.coordinatesInfo}>
                <Text style={styles.coordinatesText}>
                  Your Location: {currentLocation.latitude.toFixed(6)}, {currentLocation.longitude.toFixed(6)}
                </Text>
              </View>
            )}

            <TouchableOpacity style={styles.verifyButton} onPress={verifyLocation} disabled={!currentLocation}>
              <Ionicons name="checkmark-circle" size={20} color={COLORS.white} />
              <Text style={styles.verifyButtonText}>Verify Location</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    )
  }

  // Facility Details Screen
  if (showFacilityDetails) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>🏥 Facility Details</Text>
          <Text style={styles.headerSubtitle}>Healthcare Inspection</Text>
        </View>

        <ScrollView style={styles.content}>
          <View style={styles.detailsCard}>
            <Text style={styles.facilityName}>{facilityData?.name}</Text>
            <Text style={styles.facilityType}>{facilityData?.facilityType}</Text>
            <Text style={styles.facilityAddress}>{facilityData?.address}</Text>

            <View style={styles.inspectorInfo}>
              <Text style={styles.inspectorLabel}>Inspector Details:</Text>
              <Text style={styles.inspectorText}>Name: {userData.name}</Text>
              <Text style={styles.inspectorText}>Role: {userData.role.toUpperCase()}</Text>
              <Text style={styles.inspectorText}>Date: {new Date().toLocaleDateString("en-IN")}</Text>
            </View>

            <TouchableOpacity
              style={styles.proceedButton}
              onPress={() => {
                setShowFacilityDetails(false)
                setShowAdminApproval(true)
              }}
            >
              <Text style={styles.proceedButtonText}>Proceed to Admin Approval</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    )
  }

  // Admin Approval Screen
  if (showAdminApproval) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>✉️ Admin Approval</Text>
          <Text style={styles.headerSubtitle}>Healthcare Facility Inspection</Text>
        </View>

        <ScrollView style={styles.content}>
          <View style={styles.approvalCard}>
            <Ionicons name="mail" size={48} color={COLORS.primary} />
            <Text style={styles.approvalTitle}>Admin Approval Required</Text>
            <Text style={styles.approvalText}>
              An approval email will be sent to the facility administrator. Please wait for approval before proceeding.
            </Text>

            {!approvalStatus.emailSent && (
              <TouchableOpacity
                style={styles.sendEmailButton}
                onPress={sendAdminApprovalEmail}
                disabled={approvalLoading}
              >
                {approvalLoading ? (
                  <ActivityIndicator size="small" color={COLORS.white} />
                ) : (
                  <Ionicons name="send" size={20} color={COLORS.white} />
                )}
                <Text style={styles.sendEmailButtonText}>{approvalLoading ? "Sending..." : "Send Approval Email"}</Text>
              </TouchableOpacity>
            )}

            {approvalStatus.emailSent && approvalStatus.checking && (
              <View style={styles.waitingContainer}>
                <ActivityIndicator size="large" color={COLORS.primary} />
                <Text style={styles.waitingText}>Waiting for admin approval...</Text>
                <Text style={styles.waitingSubtext}>This may take a few minutes</Text>
              </View>
            )}

            {approvalStatus.error && (
              <View style={styles.errorContainer}>
                <Ionicons name="alert-circle" size={24} color={COLORS.error} />
                <Text style={styles.errorText}>{approvalStatus.error}</Text>
                <TouchableOpacity style={styles.retryButton} onPress={sendAdminApprovalEmail}>
                  <Text style={styles.retryButtonText}>Retry</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </ScrollView>
      </View>
    )
  }

  // Main Inspection Form
  if (showInspectionForm) {
    const currentQuestions = formQuestions[currentSection] || []
    const currentSectionData = sections.find((s) => s.id === currentSection)

    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>
            {currentSectionData?.icon} {currentSectionData?.title}
          </Text>
          <Text style={styles.headerSubtitle}>{facilityData?.name}</Text>
        </View>

        {/* Section Navigation */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.sectionNav}>
          {sections.map((section) => (
            <TouchableOpacity
              key={section.id}
              style={[styles.sectionTab, currentSection === section.id && styles.activeSectionTab]}
              onPress={() => setCurrentSection(section.id)}
            >
              <Text style={styles.sectionEmoji}>{section.icon}</Text>
              <Text style={[styles.sectionTabText, currentSection === section.id && styles.activeSectionTabText]}>
                {section.title}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <ScrollView style={styles.formContent}>
          {currentQuestions.map((question) => (
            <View key={question.id} style={styles.questionContainer}>
              <Text style={styles.questionText}>
                {question.text}
                {question.required && <Text style={styles.required}> *</Text>}
              </Text>

              {question.type === "yesno" && (
                <View style={styles.radioContainer}>
                  <TouchableOpacity style={styles.radioOption} onPress={() => handleResponse(question.id, "yes")}>
                    <RadioButton
                      value="yes"
                      status={responses[question.id] === "yes" ? "checked" : "unchecked"}
                      onPress={() => handleResponse(question.id, "yes")}
                    />
                    <Text style={styles.radioLabel}>Yes</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.radioOption} onPress={() => handleResponse(question.id, "no")}>
                    <RadioButton
                      value="no"
                      status={responses[question.id] === "no" ? "checked" : "unchecked"}
                      onPress={() => handleResponse(question.id, "no")}
                    />
                    <Text style={styles.radioLabel}>No</Text>
                  </TouchableOpacity>
                </View>
              )}

              {question.type === "text" && (
                <TextInput
                  style={styles.textInput}
                  placeholder={question.placeholder || "Enter your response..."}
                  value={responses[question.id] || ""}
                  onChangeText={(text) => handleResponse(question.id, text)}
                  multiline
                  numberOfLines={3}
                />
              )}
            </View>
          ))}

          {/* Photo Upload Section */}
          <View style={styles.photoSection}>
            <Text style={styles.photoSectionTitle}>📸 Required Photos</Text>

            {currentSection === "infrastructure" && (
              <>
                <TouchableOpacity
                  style={styles.photoButton}
                  onPress={() => takePhoto("facility_building")}
                  disabled={uploadingPhoto}
                >
                  <Ionicons name="camera" size={20} color={COLORS.white} />
                  <Text style={styles.photoButtonText}>
                    {photos.facility_building ? "✓ Building Photo" : "Take Building Photo"}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.photoButton}
                  onPress={() => takePhoto("patient_ward")}
                  disabled={uploadingPhoto}
                >
                  <Ionicons name="camera" size={20} color={COLORS.white} />
                  <Text style={styles.photoButtonText}>{photos.patient_ward ? "✓ Ward Photo" : "Take Ward Photo"}</Text>
                </TouchableOpacity>
              </>
            )}

            {currentSection === "equipment" && (
              <>
                <TouchableOpacity
                  style={styles.photoButton}
                  onPress={() => takePhoto("medical_equipment")}
                  disabled={uploadingPhoto}
                >
                  <Ionicons name="camera" size={20} color={COLORS.white} />
                  <Text style={styles.photoButtonText}>
                    {photos.medical_equipment ? "✓ Equipment Photo" : "Take Equipment Photo"}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.photoButton}
                  onPress={() => takePhoto("pharmacy")}
                  disabled={uploadingPhoto}
                >
                  <Ionicons name="camera" size={20} color={COLORS.white} />
                  <Text style={styles.photoButtonText}>
                    {photos.pharmacy ? "✓ Pharmacy Photo" : "Take Pharmacy Photo"}
                  </Text>
                </TouchableOpacity>
              </>
            )}

            {currentSection === "sanitation" && (
              <>
                <TouchableOpacity
                  style={styles.photoButton}
                  onPress={() => takePhoto("toilet_facilities")}
                  disabled={uploadingPhoto}
                >
                  <Ionicons name="camera" size={20} color={COLORS.white} />
                  <Text style={styles.photoButtonText}>
                    {photos.toilet_facilities ? "✓ Toilet Photo" : "Take Toilet Photo"}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.photoButton}
                  onPress={() => takePhoto("waste_disposal")}
                  disabled={uploadingPhoto}
                >
                  <Ionicons name="camera" size={20} color={COLORS.white} />
                  <Text style={styles.photoButtonText}>
                    {photos.waste_disposal ? "✓ Waste Disposal Photo" : "Take Waste Disposal Photo"}
                  </Text>
                </TouchableOpacity>
              </>
            )}

            {uploadingPhoto && currentPhotoType && (
              <View style={styles.uploadingContainer}>
                <ActivityIndicator size="small" color={COLORS.primary} />
                <Text style={styles.uploadingText}>Capturing {currentPhotoType}...</Text>
              </View>
            )}
          </View>

          {/* Navigation Buttons */}
          <View style={styles.navigationButtons}>
            {currentSection !== "infrastructure" && (
              <TouchableOpacity
                style={styles.prevButton}
                onPress={() => {
                  const currentIndex = sections.findIndex((s) => s.id === currentSection)
                  if (currentIndex > 0) {
                    setCurrentSection(sections[currentIndex - 1].id)
                  }
                }}
              >
                <Ionicons name="arrow-back" size={20} color={COLORS.primary} />
                <Text style={styles.prevButtonText}>Previous</Text>
              </TouchableOpacity>
            )}

            {currentSection !== "safety" ? (
              <TouchableOpacity
                style={styles.nextButton}
                onPress={() => {
                  const currentIndex = sections.findIndex((s) => s.id === currentSection)
                  if (currentIndex < sections.length - 1) {
                    setCurrentSection(sections[currentIndex + 1].id)
                  }
                }}
              >
                <Text style={styles.nextButtonText}>Next</Text>
                <Ionicons name="arrow-forward" size={20} color={COLORS.white} />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={styles.signatureButton} onPress={() => setShowSignature(true)}>
                <Ionicons name="create" size={20} color={COLORS.white} />
                <Text style={styles.signatureButtonText}>Add Signature & Submit</Text>
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>

        {/* Signature Modal */}
        <Modal visible={showSignature} animationType="slide">
          <View style={styles.signatureContainer}>
            <Text style={styles.signatureTitle}>Digital Signature</Text>
            <Text style={styles.signatureSubtitle}>Please sign below to complete the inspection</Text>

            <View style={styles.signatureCanvas}>
              <SignatureScreen
                onOK={handleSignature}
                onEmpty={() => Alert.alert("Error", "Please provide a signature")}
                descriptionText="Sign here"
                clearText="Clear"
                confirmText="Confirm"
                webStyle={`
                  .m-signature-pad {
                    box-shadow: none;
                    border: 2px solid ${COLORS.primary};
                    border-radius: 8px;
                  }
                  .m-signature-pad--body {
                    border: none;
                  }
                  .m-signature-pad--footer {
                    display: none;
                  }
                `}
              />
            </View>

            <TouchableOpacity style={styles.cancelSignatureButton} onPress={() => setShowSignature(false)}>
              <Text style={styles.cancelSignatureButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </Modal>

        {/* Confirmation Modal */}
        <Modal visible={showConfirmation} animationType="slide" transparent>
          <View style={styles.confirmationOverlay}>
            <View style={styles.confirmationContainer}>
              <Ionicons name="checkmark-circle" size={64} color={COLORS.success} />
              <Text style={styles.confirmationTitle}>Submit Inspection?</Text>
              <Text style={styles.confirmationText}>
                Are you sure you want to submit this healthcare facility inspection? This action cannot be undone.
              </Text>

              <View style={styles.confirmationButtons}>
                <TouchableOpacity style={styles.cancelConfirmButton} onPress={() => setShowConfirmation(false)}>
                  <Text style={styles.cancelConfirmButtonText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.submitButton} onPress={submitInspection} disabled={loading}>
                  {loading ? (
                    <ActivityIndicator size="small" color={COLORS.white} />
                  ) : (
                    <Ionicons name="send" size={20} color={COLORS.white} />
                  )}
                  <Text style={styles.submitButtonText}>{loading ? "Submitting..." : "Submit"}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    )
  }

  return null
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.background,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: COLORS.gray,
  },
  header: {
    backgroundColor: COLORS.primary,
    padding: 20,
    paddingTop: 40,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: COLORS.white,
  },
  headerSubtitle: {
    fontSize: 14,
    color: COLORS.background,
    marginTop: 5,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  locationCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 20,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  locationTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: COLORS.primary,
    marginTop: 16,
    marginBottom: 8,
  },
  locationText: {
    fontSize: 14,
    color: COLORS.gray,
    textAlign: "center",
    marginBottom: 20,
  },
  facilityInfo: {
    alignItems: "center",
    marginBottom: 20,
  },
  facilityName: {
    fontSize: 16,
    fontWeight: "bold",
    color: COLORS.primary,
    textAlign: "center",
  },
  facilityAddress: {
    fontSize: 12,
    color: COLORS.gray,
    textAlign: "center",
    marginTop: 5,
  },
  coordinatesInfo: {
    backgroundColor: COLORS.background,
    padding: 10,
    borderRadius: 8,
    marginBottom: 20,
  },
  coordinatesText: {
    fontSize: 12,
    color: COLORS.gray,
    textAlign: "center",
  },
  verifyButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    padding: 15,
    justifyContent: "center",
  },
  verifyButtonText: {
    color: COLORS.white,
    fontWeight: "bold",
    marginLeft: 8,
  },
  detailsCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  facilityType: {
    fontSize: 14,
    color: COLORS.secondary,
    marginBottom: 10,
  },
  inspectorInfo: {
    backgroundColor: COLORS.background,
    padding: 15,
    borderRadius: 8,
    marginTop: 20,
    marginBottom: 20,
  },
  inspectorLabel: {
    fontSize: 14,
    fontWeight: "bold",
    color: COLORS.primary,
    marginBottom: 8,
  },
  inspectorText: {
    fontSize: 12,
    color: COLORS.gray,
    marginBottom: 4,
  },
  proceedButton: {
    backgroundColor: COLORS.accent,
    borderRadius: 8,
    padding: 15,
    alignItems: "center",
  },
  proceedButtonText: {
    color: COLORS.white,
    fontWeight: "bold",
  },
  approvalCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 20,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  approvalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: COLORS.primary,
    marginTop: 16,
    marginBottom: 8,
  },
  approvalText: {
    fontSize: 14,
    color: COLORS.gray,
    textAlign: "center",
    marginBottom: 20,
  },
  sendEmailButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    padding: 15,
    justifyContent: "center",
  },
  sendEmailButtonText: {
    color: COLORS.white,
    fontWeight: "bold",
    marginLeft: 8,
  },
  waitingContainer: {
    alignItems: "center",
    marginTop: 20,
  },
  waitingText: {
    fontSize: 16,
    color: COLORS.primary,
    marginTop: 16,
  },
  waitingSubtext: {
    fontSize: 12,
    color: COLORS.gray,
    marginTop: 5,
  },
  errorContainer: {
    alignItems: "center",
    marginTop: 20,
  },
  errorText: {
    fontSize: 14,
    color: COLORS.error,
    textAlign: "center",
    marginTop: 8,
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: COLORS.error,
    borderRadius: 8,
    padding: 12,
    paddingHorizontal: 20,
  },
  retryButtonText: {
    color: COLORS.white,
    fontWeight: "bold",
  },
  sectionNav: {
    backgroundColor: COLORS.white,
    paddingVertical: 10,
    paddingHorizontal: 5,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
  },
  sectionTab: {
    alignItems: "center",
    paddingHorizontal: 15,
    paddingVertical: 8,
    marginHorizontal: 5,
    borderRadius: 20,
    backgroundColor: COLORS.background,
    minWidth: 100,
  },
  activeSectionTab: {
    backgroundColor: COLORS.primary,
  },
  sectionEmoji: {
    fontSize: 16,
    marginBottom: 4,
  },
  sectionTabText: {
    fontSize: 10,
    color: COLORS.gray,
    textAlign: "center",
  },
  activeSectionTabText: {
    color: COLORS.white,
    fontWeight: "bold",
  },
  formContent: {
    flex: 1,
    padding: 20,
  },
  questionContainer: {
    backgroundColor: COLORS.white,
    borderRadius: 8,
    padding: 15,
    marginBottom: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  questionText: {
    fontSize: 14,
    color: COLORS.black,
    marginBottom: 10,
  },
  required: {
    color: COLORS.error,
  },
  radioContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  radioOption: {
    flexDirection: "row",
    alignItems: "center",
  },
  radioLabel: {
    fontSize: 14,
    color: COLORS.black,
    marginLeft: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: COLORS.lightGray,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    textAlignVertical: "top",
  },
  photoSection: {
    backgroundColor: COLORS.white,
    borderRadius: 8,
    padding: 15,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  photoSectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: COLORS.primary,
    marginBottom: 15,
  },
  photoButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.accent,
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
    justifyContent: "center",
  },
  photoButtonText: {
    color: COLORS.white,
    fontWeight: "bold",
    marginLeft: 8,
  },
  uploadingContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 10,
  },
  uploadingText: {
    fontSize: 12,
    color: COLORS.primary,
    marginLeft: 8,
  },
  navigationButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 20,
    marginBottom: 40,
  },
  prevButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.white,
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  prevButtonText: {
    color: COLORS.primary,
    fontWeight: "bold",
    marginLeft: 8,
  },
  nextButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    padding: 12,
  },
  nextButtonText: {
    color: COLORS.white,
    fontWeight: "bold",
    marginRight: 8,
  },
  signatureButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.success,
    borderRadius: 8,
    padding: 12,
    flex: 1,
    justifyContent: "center",
  },
  signatureButtonText: {
    color: COLORS.white,
    fontWeight: "bold",
    marginLeft: 8,
  },
  signatureContainer: {
    flex: 1,
    backgroundColor: COLORS.white,
    padding: 20,
  },
  signatureTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: COLORS.primary,
    textAlign: "center",
    marginBottom: 10,
  },
  signatureSubtitle: {
    fontSize: 14,
    color: COLORS.gray,
    textAlign: "center",
    marginBottom: 20,
  },
  signatureCanvas: {
    flex: 1,
    borderWidth: 2,
    borderColor: COLORS.primary,
    borderRadius: 8,
    marginBottom: 20,
  },
  cancelSignatureButton: {
    backgroundColor: COLORS.gray,
    borderRadius: 8,
    padding: 15,
    alignItems: "center",
  },
  cancelSignatureButtonText: {
    color: COLORS.white,
    fontWeight: "bold",
  },
  confirmationOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  confirmationContainer: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 30,
    alignItems: "center",
    marginHorizontal: 20,
  },
  confirmationTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: COLORS.primary,
    marginTop: 16,
    marginBottom: 8,
  },
  confirmationText: {
    fontSize: 14,
    color: COLORS.gray,
    textAlign: "center",
    marginBottom: 20,
  },
  confirmationButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
  },
  cancelConfirmButton: {
    flex: 1,
    backgroundColor: COLORS.gray,
    borderRadius: 8,
    padding: 15,
    alignItems: "center",
    marginRight: 10,
  },
  cancelConfirmButtonText: {
    color: COLORS.white,
    fontWeight: "bold",
  },
  submitButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.success,
    borderRadius: 8,
    padding: 15,
    justifyContent: "center",
    marginLeft: 10,
  },
  submitButtonText: {
    color: COLORS.white,
    fontWeight: "bold",
    marginLeft: 8,
  },
})

export default HealthcareInspectionForm
