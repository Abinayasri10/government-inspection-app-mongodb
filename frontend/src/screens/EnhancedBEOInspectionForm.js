"use client"

import { useState, useEffect } from "react"
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Image,
  ActivityIndicator,
  Modal,
} from "react-native"
import { TextInput, RadioButton } from "react-native-paper"
import * as ImagePicker from "expo-image-picker"
import * as Location from "expo-location"
import * as FileSystem from "expo-file-system"
import SignatureScreen from "react-native-signature-canvas"
import { Ionicons } from "@expo/vector-icons"
import { COLORS } from "../constants/colors"
import api from "../services/api"

import PDFGenerator from "../services/PDFGenerator"
import EmailService from "../services/EmailService"
import { useAuth } from "../context/AuthContext"

const EnhancedBEOInspectionForm = ({ route, navigation }) => {
  const { assignmentData } = route.params || {}
  const { userProfile } = useAuth()
  const userData = userProfile

  const [schoolData, setSchoolData] = useState(null)
  const [currentLocation, setCurrentLocation] = useState(null)
  const [locationVerified, setLocationVerified] = useState(false)
  const [principalApproved, setPrincipalApproved] = useState(false)
  const [showLocationVerification, setShowLocationVerification] = useState(true)
  const [showSchoolDetails, setShowSchoolDetails] = useState(false)
  const [showPrincipalApproval, setShowPrincipalApproval] = useState(false)
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
  const [approvalListener, setApprovalListener] = useState(null)

  const sections = [
    { id: "infrastructure", title: "Infrastructure", icon: "🏫" },
    { id: "teaching", title: "Teaching", icon: "📚" },
    { id: "welfare", title: "Student Welfare", icon: "👥" },
    { id: "observations", title: "Observations", icon: "📝" },
  ]

  // Default questions if database doesn't have any
  const defaultQuestions = {
    infrastructure: [
      {
        id: "building_safe",
        text: "Is the school building safe and in good condition?",
        type: "yesno",
        required: true,
        section: "infrastructure",
      },
      {
        id: "drinking_water",
        text: "Are drinking water facilities available and functional?",
        type: "yesno",
        required: true,
        section: "infrastructure",
      },
      {
        id: "separate_toilets",
        text: "Are separate toilet facilities available for boys and girls?",
        type: "yesno",
        required: true,
        section: "infrastructure",
      },
      {
        id: "classrooms_count",
        text: "Number of classrooms and their condition",
        type: "text",
        required: true,
        section: "infrastructure",
      },
    ],
    teaching: [
      {
        id: "teachers_present",
        text: "Are all teachers present and teaching?",
        type: "yesno",
        required: true,
        section: "teaching",
      },
      {
        id: "teaching_materials",
        text: "Are adequate teaching materials available?",
        type: "yesno",
        required: true,
        section: "teaching",
      },
    ],
    welfare: [
      {
        id: "midday_meal",
        text: "Is Mid-Day Meal provided regularly?",
        type: "yesno",
        required: true,
        section: "welfare",
      },
      {
        id: "meal_quality",
        text: "Quality and hygiene of Mid-Day Meal",
        type: "text",
        required: true,
        section: "welfare",
      },
    ],
    observations: [
      {
        id: "strengths",
        text: "Strengths observed during inspection",
        type: "text",
        required: true,
        section: "observations",
      },
      {
        id: "improvements",
        text: "Areas that need improvement",
        type: "text",
        required: true,
        section: "observations",
      },
      {
        id: "recommendations",
        text: "Immediate actions recommended",
        type: "text",
        required: true,
        section: "observations",
      },
    ],
  }

  useEffect(() => {
    initializeForm()

    // Cleanup function
    return () => {
      if (approvalListener) {
        approvalListener()
      }
    }
  }, [])

  const initializeForm = async () => {
    try {
      setInitialLoading(true)
      console.log("🚀 Initializing form with assignment data:", JSON.stringify(assignmentData, null, 2))

      await requestPermissions()
      await fetchSchoolData()
      await getCurrentLocation()
      await loadFormQuestions()

      setInitialLoading(false)
    } catch (error) {
      console.error("❌ Error initializing form:", error)
      setInitialLoading(false)
      Alert.alert("Error", "Failed to initialize inspection form")
    }
  }

  const requestPermissions = async () => {
    try {
      const { status: cameraStatus } = await ImagePicker.requestCameraPermissionsAsync()
      if (cameraStatus !== "granted") {
        Alert.alert("Permission Required", "Camera permission is required to take photos.")
        return
      }

      const { status: locationStatus } = await Location.requestForegroundPermissionsAsync()
      if (locationStatus !== "granted") {
        Alert.alert("Permission Required", "Location permission is required for GPS verification.")
        return
      }

      console.log("✅ Permissions granted successfully")
    } catch (error) {
      console.error("❌ Permission request error:", error)
      Alert.alert("Error", "Failed to request permissions")
    }
  }

  const fetchSchoolData = async () => {
    try {
      console.log("🏫 Starting school data fetch for specific assignment...")
      let foundSchool = null

      // Method 1: Try to get school data by schoolId from assignment
      if (assignmentData?.schoolId) {
        try {
          // Handle case where schoolId is populated (object) or raw (string)
          const idToFetch = typeof assignmentData.schoolId === 'object'
            ? (assignmentData.schoolId._id || assignmentData.schoolId.id)
            : assignmentData.schoolId

          if (idToFetch) {
            const response = await api.get(`/schools/${idToFetch}`)
            foundSchool = response.data
            console.log("✅ School data found by ID:", foundSchool.name)
          }
        } catch (error) {
          console.error("❌ Error fetching school by ID:", error)
        }
      }

      // Method 2: Try to search by exact school name match
      if (!foundSchool && assignmentData?.schoolName) {
        try {
          const response = await api.get(`/schools?name=${encodeURIComponent(assignmentData.schoolName)}`)
          if (response.data && response.data.length > 0) {
            foundSchool = response.data[0]
            console.log("✅ School found by exact name match")
          }
        } catch (error) {
          console.error("❌ Error searching school by name:", error)
        }
      }

      // Method 3: Try to search by locationName
      if (!foundSchool && assignmentData?.locationName) {
        try {
          const response = await api.get(`/schools?name=${encodeURIComponent(assignmentData.locationName)}`)
          if (response.data && response.data.length > 0) {
            foundSchool = response.data[0]
            console.log("✅ School found by location name match")
          }
        } catch (error) {
          console.error("❌ Error searching school by location name:", error)
        }
      }

      // Method 4: Search by partial name match or address
      if (!foundSchool && (assignmentData?.schoolName || assignmentData?.locationName)) {
        try {
          const searchTerm = assignmentData.schoolName || assignmentData.locationName
          const response = await api.get(`/schools?name=${encodeURIComponent(searchTerm)}`)
          if (response.data && response.data.length > 0) {
            foundSchool = response.data[0]
            // The API performs regex search, so first result is likely best match
            console.log("✅ School found by partial match:", foundSchool.name)
          }
        } catch (error) {
          console.error("❌ Error in partial search:", error)
        }
      }

      // If school found, use it; otherwise create a realistic default
      if (foundSchool) {
        console.log("✅ Using found school data:", foundSchool.name)
        setSchoolData(foundSchool)
      } else {
        console.log("⚠️ No matching school found, creating assignment-specific default")
        const defaultSchoolData = {
          id: (typeof assignmentData.schoolId === 'object' ? assignmentData.schoolId._id : assignmentData.schoolId) || `default_${assignmentData?.id || Date.now()}`,
          name: assignmentData?.schoolName || assignmentData?.locationName || "Government School",
          address: assignmentData?.address || "Address not specified",
          schoolType: "Government",
          level: "primary",
          principalName: "Principal Name",
          principalPhone: "+91 9876543210",
          principalEmail: "principal@school.gov.in",
          totalStudents: 200,
          totalTeachers: 10,
          establishedYear: 1990,
          lastInspectionDate: null,
          coordinates: {
            latitude: 12.9716,
            longitude: 77.5946,
          },
          infrastructure: {
            totalClassrooms: 6,
            hasLibrary: true,
            hasPlayground: true,
            hasToilets: true,
            separateToiletsForGirls: true,
            hasElectricity: true,
            hasWaterSupply: true,
            hasMidDayMealKitchen: true,
          },
          facilities: {
            computerLab: false,
            scienceLab: false,
            smartClassrooms: 1,
            rampForDisabled: true,
          },
        }

        console.log("✅ Created assignment-specific default school data")
        setSchoolData(defaultSchoolData)
      }
    } catch (error) {
      console.error("❌ Critical error in fetchSchoolData:", error)
      // Create emergency fallback
      setSchoolData({
        id: "emergency_default",
        name: assignmentData?.schoolName || assignmentData?.locationName || "School",
        address: assignmentData?.address || "Address not available",
        schoolType: "Government",
        level: "primary",
        principalName: "Principal",
        principalPhone: "Not Available",
        principalEmail: "Not Available",
        totalStudents: 150,
        totalTeachers: 8,
        establishedYear: 1985,
        infrastructure: {
          totalClassrooms: 5,
          hasLibrary: true,
          hasPlayground: true,
          hasToilets: true,
        },
      })
    }
  }

  const getCurrentLocation = async () => {
    try {
      console.log("📍 Getting current location...")
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
        timeout: 15000,
        maximumAge: 10000,
      })
      setCurrentLocation(location)
      console.log("✅ Location obtained:", location.coords)
    } catch (error) {
      console.error("❌ Location error:", error)
      Alert.alert("Location Error", "Unable to get your location. Please ensure GPS is enabled.")
    }
  }

  const handleLocationVerification = () => {
    console.log("🔄 Starting location verification...")
    // Simulate location verification UI
    setTimeout(() => {
      console.log("✅ Location verified, showing school details")
      setLocationVerified(true)
      setShowLocationVerification(false)
      setShowSchoolDetails(true)
    }, 2000)
  }

  const handleProceedToPrincipalApproval = async () => {
    console.log("➡️ Proceeding to principal approval...")
    setShowSchoolDetails(false)
    setShowPrincipalApproval(true)

    // Validate required data before sending email
    if (!schoolData || !userData) {
      Alert.alert("Error", "Missing school or user data. Please try again.")
      return
    }

    // Send email to principal for approval and create approval record
    try {
      setApprovalLoading(true)
      setApprovalStatus((prev) => ({ ...prev, checking: true, error: null }))

      console.log("📧 Sending principal approval request via SendGrid...")
      console.log("📋 Data being sent:", {
        schoolData: { id: schoolData.id, name: schoolData.name },
        userData: { uid: userData.uid, name: userData.name },
        assignmentData: assignmentData ? { id: assignmentData.id } : null,
      })

      const emailResult = await EmailService.sendPrincipalApprovalRequest(schoolData, userData, assignmentData)

      if (emailResult.success) {
        console.log("✅ Principal approval email sent successfully via SendGrid")
        setApprovalStatus({
          approved: false,
          checking: false,
          approvalData: emailResult.approvalData,
          emailSent: true,
          error: null,
        })

        // Set up real-time listener for approval status
        setupApprovalListener()

        Alert.alert(
          "Email Sent Successfully! 📧",
          `Approval request has been sent to inspectiq5@gmail.com via SendGrid. The email includes a professional HTML template with all inspection details. Please wait for the principal to click the approval link.`,
          [{ text: "OK" }],
        )
      } else {
        console.log("⚠️ Email sending failed:", emailResult.error)
        setApprovalStatus({
          approved: false,
          checking: false,
          approvalData: null,
          emailSent: false,
          error: emailResult.message || "Failed to send email",
        })
        Alert.alert("Error", emailResult.message || "Failed to send approval request. Please try again.")
      }
    } catch (error) {
      console.error("❌ Error sending principal approval email:", error)
      setApprovalStatus({
        approved: false,
        checking: false,
        approvalData: null,
        emailSent: false,
        error: error.message,
      })
      Alert.alert("Error", "Failed to send approval request. Please try again.")
    } finally {
      setApprovalLoading(false)
    }
  }

  const setupApprovalListener = () => {
    // Use the approval data from the email service response
    const assignmentId = approvalStatus.approvalData?.assignmentId || assignmentData?.id
    const schoolId = approvalStatus.approvalData?.schoolId || schoolData?.id

    if (!assignmentId || !schoolId) {
      console.log("⚠️ Missing assignment or school ID for listener")
      return
    }

    console.log("🔄 Setting up real-time approval listener...")

    const unsubscribe = EmailService.setupApprovalListener(assignmentId, schoolId, (approvalData) => {
      console.log("🔔 Approval status update received:", approvalData)

      if (approvalData.approved) {
        setApprovalStatus({
          approved: true,
          checking: false,
          approvalData: approvalData,
          emailSent: true,
          error: null,
        })

        Alert.alert(
          "Approval Received! ✅",
          `Principal approval has been received at ${new Date(approvalData.approvedAt).toLocaleString()}. You can now proceed with the inspection.`,
          [{ text: "Continue", onPress: () => { } }],
        )
      } else if (approvalData.error) {
        setApprovalStatus((prev) => ({
          ...prev,
          checking: false,
          error: approvalData.error,
        }))
      }
    })

    if (unsubscribe) {
      setApprovalListener(unsubscribe)
    }
  }

  const handlePrincipalApproval = async () => {
    if (!approvalStatus.approved) {
      Alert.alert(
        "Approval Required",
        "Please wait for the principal to click the approval link in the email before proceeding. The button will be enabled automatically when approval is received.",
        [{ text: "OK" }],
      )
      return
    }

    console.log("✅ Principal approval confirmed, proceeding to form")
    setPrincipalApproved(true)
    setShowPrincipalApproval(false)

    // Clean up listener
    if (approvalListener) {
      approvalListener()
      setApprovalListener(null)
    }

    autoFillSchoolDetails()
    setShowInspectionForm(true)
  }

  const checkApprovalStatusManually = async () => {
    const assignmentId = approvalStatus.approvalData?.assignmentId || assignmentData?.id
    const schoolId = approvalStatus.approvalData?.schoolId || schoolData?.id

    if (!assignmentId || !schoolId) {
      Alert.alert("Error", "Missing assignment or school information")
      return
    }

    try {
      setApprovalStatus((prev) => ({ ...prev, checking: true }))

      const result = await EmailService.checkApprovalStatus(assignmentId, schoolId)

      if (result.approved) {
        setApprovalStatus({
          approved: true,
          checking: false,
          approvalData: result,
          emailSent: true,
          error: null,
        })
        Alert.alert("Success! ✅", "Approval has been received! You can now proceed with the inspection.")
      } else {
        setApprovalStatus((prev) => ({
          ...prev,
          checking: false,
          error: result.error || "No approval received yet",
        }))
        Alert.alert(
          "No Approval Yet",
          "The principal has not yet clicked the approval link. Please wait for the email approval.",
        )
      }
    } catch (error) {
      console.error("Error checking approval:", error)
      setApprovalStatus((prev) => ({
        ...prev,
        checking: false,
        error: error.message,
      }))
      Alert.alert("Error", "Failed to check approval status")
    }
  }

  // Add a test approval function for development
  const simulateApproval = async () => {
    const assignmentId = approvalStatus.approvalData?.assignmentId || assignmentData?.id
    const schoolId = approvalStatus.approvalData?.schoolId || schoolData?.id

    if (!assignmentId || !schoolId) {
      Alert.alert("Error", "Missing assignment or school information")
      return
    }

    try {
      const result = await EmailService.simulateApproval(assignmentId, schoolId)
      if (result.success) {
        Alert.alert("Test Approval", "Approval has been simulated successfully!")
      } else {
        Alert.alert("Error", result.error)
      }
    } catch (error) {
      Alert.alert("Error", error.message)
    }
  }

  const loadFormQuestions = async () => {
    try {
      console.log("📝 Loading form questions...")
      const schoolLevel = schoolData?.level?.toLowerCase() || "primary"
      console.log("🎯 School level for questions:", schoolLevel)

      const response = await api.get(`/questions?department=education&schoolLevel=${schoolLevel}`)
      const questionsList = response.data
      const questionsBySection = {}

      questionsList.forEach((question) => {
        if (!questionsBySection[question.section]) {
          questionsBySection[question.section] = []
        }
        questionsBySection[question.section].push(question)
      })

      // If no questions found in database, use default questions
      if (Object.keys(questionsBySection).length === 0) {
        console.log("⚠️ No questions found in database, using default questions")
        setFormQuestions(defaultQuestions)
      } else {
        console.log("✅ Questions loaded from database:", Object.keys(questionsBySection))
        setFormQuestions(questionsBySection)
      }
    } catch (error) {
      console.error("❌ Error loading form questions:", error)
      console.log("⚠️ Using default questions due to error")
      setFormQuestions(defaultQuestions)
    }
  }

  const autoFillSchoolDetails = () => {
    if (schoolData) {
      console.log("📋 Auto-filling school details with:", {
        name: schoolData.name,
        address: schoolData.address,
        principal: schoolData.principalName,
        students: schoolData.totalStudents,
        teachers: schoolData.totalTeachers,
      })

      setResponses((prev) => ({
        ...prev,
        school_name: schoolData.name || "",
        school_address: schoolData.address || "",
        school_type: schoolData.schoolType || "",
        school_level: schoolData.level || "",
        principal_name: schoolData.principalName || "",
        principal_phone: schoolData.principalPhone || "",
        principal_email: schoolData.principalEmail || "",
        total_students: schoolData.totalStudents?.toString() || "0",
        total_teachers: schoolData.totalTeachers?.toString() || "0",
        total_classrooms: schoolData.infrastructure?.totalClassrooms?.toString() || "0",
        established_year: schoolData.establishedYear?.toString() || "",
        last_inspection_date: schoolData.lastInspectionDate || "",
      }))

      console.log("✅ School details auto-filled successfully")
    } else {
      console.log("⚠️ No school data available for auto-fill")
    }
  }

  const uploadToCloudinary = async (imageUri) => {
    try {
      console.log("☁️ Starting Cloudinary upload for:", imageUri)

      const base64 = await FileSystem.readAsStringAsync(imageUri, {
        encoding: FileSystem.EncodingType.Base64,
      })

      const formDataUpload = new FormData()
      formDataUpload.append("file", `data:image/jpeg;base64,${base64}`)
      formDataUpload.append("upload_preset", "inspection_photos")
      formDataUpload.append("folder", "government_inspections")

      const response = await fetch("https://api.cloudinary.com/v1_1/dmbxs6pxe/image/upload", {
        method: "POST",
        body: formDataUpload,
        headers: {
          "Content-Type": "multipart/form-data",
        },
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      console.log("✅ Cloudinary upload successful:", data.secure_url)
      return data.secure_url
    } catch (error) {
      console.error("❌ Cloudinary upload error:", error)
      throw new Error("Failed to upload image to cloud storage")
    }
  }

  const takePhoto = async (photoType) => {
    if (!locationVerified) {
      Alert.alert("Location Required", "Please verify your location first before taking photos.")
      return
    }

    if (!principalApproved) {
      Alert.alert("Approval Required", "Please wait for principal approval before taking photos.")
      return
    }

    if (!currentLocation) {
      Alert.alert("GPS Required", "GPS location is required for photo tagging.")
      return
    }

    try {
      console.log("📸 Taking photo for:", photoType)
      setUploadingPhoto(true)
      setCurrentPhotoType(photoType)

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
        exif: true,
      })

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const imageUri = result.assets[0].uri
        console.log("✅ Image captured:", imageUri)

        const imageUrl = await uploadToCloudinary(imageUri)

        const photoData = {
          url: imageUrl,
          localUri: imageUri,
          location: {
            latitude: currentLocation.coords.latitude,
            longitude: currentLocation.coords.longitude,
            accuracy: currentLocation.coords.accuracy,
            altitude: currentLocation.coords.altitude,
          },
          timestamp: new Date().toISOString(),
          type: photoType,
        }

        setPhotos((prev) => ({
          ...prev,
          [photoType]: photoData,
        }))

        Alert.alert("Success", "Photo uploaded successfully with GPS data!")
      }
    } catch (error) {
      console.error("❌ Photo capture error:", error)
      Alert.alert("Error", `Failed to capture photo: ${error.message}`)
    } finally {
      setUploadingPhoto(false)
      setCurrentPhotoType("")
    }
  }

  const handleResponseChange = (questionId, value) => {
    setResponses((prev) => ({
      ...prev,
      [questionId]: value,
    }))
  }

  const validateSection = (sectionId) => {
    const sectionQuestions = formQuestions[sectionId] || []

    for (const question of sectionQuestions) {
      if (question.required && !responses[question.id]) {
        Alert.alert("Validation Error", `Please answer: ${question.text}`)
        return false
      }
    }
    return true
  }

  const nextSection = () => {
    if (!validateSection(currentSection)) return

    const currentIndex = sections.findIndex((s) => s.id === currentSection)
    if (currentIndex < sections.length - 1) {
      setCurrentSection(sections[currentIndex + 1].id)
    } else {
      setShowConfirmation(true)
    }
  }

  const previousSection = () => {
    const currentIndex = sections.findIndex((s) => s.id === currentSection)
    if (currentIndex > 0) {
      setCurrentSection(sections[currentIndex - 1].id)
    }
  }

  const handleSubmit = () => {
    if (!locationVerified) {
      Alert.alert("Location Required", "Please verify your location before submitting.")
      return
    }

    if (!principalApproved) {
      Alert.alert("Approval Required", "Please wait for principal approval before submitting.")
      return
    }

    if (!validateAllSections()) return
    setShowConfirmation(true)
  }

  const validateAllSections = () => {
    for (const section of sections) {
      if (!validateSection(section.id)) {
        setCurrentSection(section.id)
        return false
      }
    }
    return true
  }

  const confirmSubmission = () => {
    setShowConfirmation(false)
    setShowSignature(true)
  }

  const handleSignature = (signatureData) => {
    setSignature(signatureData)
    setShowSignature(false)
    submitInspection(signatureData)
  }

  const submitInspection = async (signatureData) => {
    if (!signatureData) {
      Alert.alert("Error", "Digital signature is required")
      return
    }

    const userId = userData?.id || userData?._id || userData?.uid;
    if (!userData || !userId) {
      Alert.alert("Error", "User information is missing. Please log in again.")
      return
    }

    setLoading(true)

    try {
      const inspectionData = {
        // School information (auto-filled)
        schoolName: schoolData?.name || "Unknown School",
        address: schoolData?.address || "Unknown Address",
        schoolLevel: schoolData?.level || "primary",
        schoolType: schoolData?.schoolType || "Government",
        principalName: schoolData?.principalName || "Not provided",
        principalPhone: schoolData?.principalPhone || "Not provided",

        // Inspection details
        inspectionDate: new Date().toISOString().split("T")[0],
        inspectorName: userData.name || "Unknown Inspector",
        inspectorDesignation: userData.role?.toUpperCase() || "BEO",

        // All responses
        responses,

        // Location data
        inspectionLocation: currentLocation
          ? {
            latitude: currentLocation.coords.latitude,
            longitude: currentLocation.coords.longitude,
            accuracy: currentLocation.coords.accuracy,
          }
          : null,
        schoolLocation: schoolData?.coordinates || null,
        locationVerified: locationVerified,
        principalApproved: principalApproved,

        // Photos
        photos,

        // Observations
        strengths: responses.strengths || "Not provided",
        improvements: responses.improvements || "Not provided",
        recommendations: responses.recommendations || "Not provided",

        signature: signatureData,

        // Metadata
        userId: userData.id || userData._id,
        userName: userData.name || "Unknown",
        department: userData.department || "education",
        role: userData.role || "beo",
        assignmentId: assignmentData?.id || null,
        schoolId: schoolData?.id || assignmentData?.schoolId || null,

        submittedAt: new Date().toISOString(),
        status: "submitted",
        forwardedTo: "deo",
        signatureTimestamp: new Date().toISOString(),
      }

      console.log("💾 Submitting inspection to database...")
      const response = await api.post("/inspections", inspectionData)
      const savedInspection = response.data
      console.log("✅ Inspection saved with ID:", savedInspection._id)

      // Update assignment status to completed
      const assignmentId = assignmentData?._id || assignmentData?.id;
      if (assignmentId) {
        await api.put(`/assignments/${assignmentId}`, {
          status: "completed",
          completedAt: new Date().toISOString(),
          completedBy: userData.id || userData._id,
        })
        console.log("✅ Assignment status updated to completed")
      }



      // Send email notification about completion via SendGrid
      try {
        const emailResult = await EmailService.sendInspectionCompletedNotification({
          ...inspectionData,
          id: savedInspection._id,
        })

        if (emailResult.success) {
          console.log("✅ Inspection completion email sent successfully via SendGrid")
        }
      } catch (error) {
        console.error("❌ Error sending completion email:", error)
      }

      // Generate PDF report
      const pdfResult = await PDFGenerator.generatePDF(inspectionData)

      if (pdfResult.success) {
        Alert.alert(
          "Success",
          "Inspection submitted successfully! Report generated and forwarded to DEO. Professional email notification sent via SendGrid.",
          [
            { text: "View Report", onPress: () => PDFGenerator.sharePDF(pdfResult.uri, pdfResult.fileName) },
            { text: "OK", onPress: () => navigation.navigate("Home") },
          ],
        )
      } else {
        Alert.alert(
          "Success",
          "Inspection submitted successfully and forwarded to DEO. Email notification sent via SendGrid.",
          [{ text: "OK", onPress: () => navigation.navigate("Home") }],
        )
      }
    } catch (error) {
      console.error("❌ Submission error:", error)
      Alert.alert("Error", `Failed to submit inspection: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  const renderRadioGroup = (question, value) => (
    <View style={styles.radioGroup}>
      <TouchableOpacity style={styles.radioOption} onPress={() => handleResponseChange(question.id, "yes")}>
        <RadioButton
          value="yes"
          status={value === "yes" ? "checked" : "unchecked"}
          onPress={() => handleResponseChange(question.id, "yes")}
        />
        <Text style={styles.radioLabel}>Yes</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.radioOption} onPress={() => handleResponseChange(question.id, "no")}>
        <RadioButton
          value="no"
          status={value === "no" ? "checked" : "unchecked"}
          onPress={() => handleResponseChange(question.id, "no")}
        />
        <Text style={styles.radioLabel}>No</Text>
      </TouchableOpacity>
    </View>
  )

  const renderCurrentSection = () => {
    const sectionQuestions = formQuestions[currentSection] || []

    return (
      <View style={styles.sectionContent}>
        {/* Auto-filled School Information */}
        {currentSection === "infrastructure" && schoolData && (
          <View style={styles.schoolInfoSection}>
            <Text style={styles.schoolInfoTitle}>📋 School Information (Auto-filled)</Text>
            <View style={styles.schoolInfoGrid}>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>School Name:</Text>
                <Text style={styles.infoValue}>{schoolData.name}</Text>
              </View>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Address:</Text>
                <Text style={styles.infoValue}>{schoolData.address}</Text>
              </View>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Principal:</Text>
                <Text style={styles.infoValue}>{schoolData.principalName}</Text>
              </View>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Students:</Text>
                <Text style={styles.infoValue}>{schoolData.totalStudents}</Text>
              </View>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Teachers:</Text>
                <Text style={styles.infoValue}>{schoolData.totalTeachers}</Text>
              </View>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Level:</Text>
                <Text style={styles.infoValue}>{schoolData.level}</Text>
              </View>
            </View>
          </View>
        )}

        {/* Dynamic Questions */}
        {sectionQuestions.map((question) => (
          <View key={question.id} style={styles.questionContainer}>
            <Text style={styles.questionText}>
              {question.text} {question.required && <Text style={styles.required}>*</Text>}
            </Text>

            {question.type === "yesno" && renderRadioGroup(question, responses[question.id])}

            {(question.type === "text" || question.type === "number") && (
              <TextInput
                mode="outlined"
                placeholder={question.placeholder || "Enter your response"}
                value={responses[question.id] || ""}
                onChangeText={(text) => handleResponseChange(question.id, text)}
                keyboardType={question.type === "number" ? "numeric" : "default"}
                multiline={question.type === "text"}
                numberOfLines={question.type === "text" ? 3 : 1}
                style={styles.textInput}
              />
            )}
          </View>
        ))}

        {/* Photo Upload Section */}
        {currentSection === "infrastructure" && (
          <View style={styles.photoSection}>
            <Text style={styles.photoSectionTitle}>📸 Required Photos (GPS Tagged)</Text>

            <View style={styles.uploadSection}>
              <Text style={styles.uploadLabel}>Classroom Photo * (with GPS)</Text>
              {photos.classroom_photo ? (
                <View style={styles.photoContainer}>
                  <Image
                    source={{ uri: photos.classroom_photo.localUri || photos.classroom_photo.url }}
                    style={styles.photoPreview}
                  />
                  <View style={styles.photoInfoContainer}>
                    <Text style={styles.photoInfo}>
                      📍 GPS: {photos.classroom_photo.location.latitude.toFixed(6)},{" "}
                      {photos.classroom_photo.location.longitude.toFixed(6)}
                    </Text>
                    <Text style={styles.photoTime}>
                      🕒 {new Date(photos.classroom_photo.timestamp).toLocaleString()}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.retakeButton}
                    onPress={() => takePhoto("classroom_photo")}
                    disabled={uploadingPhoto}
                  >
                    <Text style={styles.retakeButtonText}>
                      {uploadingPhoto && currentPhotoType === "classroom_photo" ? "Uploading..." : "Retake Photo"}
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.photoButton}
                  onPress={() => takePhoto("classroom_photo")}
                  disabled={uploadingPhoto || !locationVerified || !principalApproved}
                >
                  {uploadingPhoto && currentPhotoType === "classroom_photo" ? (
                    <ActivityIndicator color={COLORS.white} />
                  ) : (
                    <>
                      <Ionicons name="camera" size={24} color={COLORS.white} />
                      <Text style={styles.photoButtonText}>Take Classroom Photo</Text>
                      <Text style={styles.photoButtonSubtext}>GPS location will be captured</Text>
                    </>
                  )}
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.uploadSection}>
              <Text style={styles.uploadLabel}>Toilet Facilities Photo (with GPS)</Text>
              {photos.toilet_photo ? (
                <View style={styles.photoContainer}>
                  <Image
                    source={{ uri: photos.toilet_photo.localUri || photos.toilet_photo.url }}
                    style={styles.photoPreview}
                  />
                  <View style={styles.photoInfoContainer}>
                    <Text style={styles.photoInfo}>
                      📍 GPS: {photos.toilet_photo.location.latitude.toFixed(6)},{" "}
                      {photos.toilet_photo.location.longitude.toFixed(6)}
                    </Text>
                    <Text style={styles.photoTime}>🕒 {new Date(photos.toilet_photo.timestamp).toLocaleString()}</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.retakeButton}
                    onPress={() => takePhoto("toilet_photo")}
                    disabled={uploadingPhoto}
                  >
                    <Text style={styles.retakeButtonText}>
                      {uploadingPhoto && currentPhotoType === "toilet_photo" ? "Uploading..." : "Retake Photo"}
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.photoButton}
                  onPress={() => takePhoto("toilet_photo")}
                  disabled={uploadingPhoto || !locationVerified || !principalApproved}
                >
                  {uploadingPhoto && currentPhotoType === "toilet_photo" ? (
                    <ActivityIndicator color={COLORS.white} />
                  ) : (
                    <>
                      <Ionicons name="camera" size={24} color={COLORS.white} />
                      <Text style={styles.photoButtonText}>Take Toilet Photo</Text>
                      <Text style={styles.photoButtonSubtext}>GPS location will be captured</Text>
                    </>
                  )}
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}

        {/* Midday Meal Photo for Welfare Section */}
        {currentSection === "welfare" && (
          <View style={styles.photoSection}>
            <Text style={styles.photoSectionTitle}>📸 Welfare Photos (GPS Tagged)</Text>

            <View style={styles.uploadSection}>
              <Text style={styles.uploadLabel}>Mid-Day Meal Photo (with GPS)</Text>
              {photos.meal_photo ? (
                <View style={styles.photoContainer}>
                  <Image
                    source={{ uri: photos.meal_photo.localUri || photos.meal_photo.url }}
                    style={styles.photoPreview}
                  />
                  <View style={styles.photoInfoContainer}>
                    <Text style={styles.photoInfo}>
                      📍 GPS: {photos.meal_photo.location.latitude.toFixed(6)},{" "}
                      {photos.meal_photo.location.longitude.toFixed(6)}
                    </Text>
                    <Text style={styles.photoTime}>���� {new Date(photos.meal_photo.timestamp).toLocaleString()}</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.retakeButton}
                    onPress={() => takePhoto("meal_photo")}
                    disabled={uploadingPhoto}
                  >
                    <Text style={styles.retakeButtonText}>
                      {uploadingPhoto && currentPhotoType === "meal_photo" ? "Uploading..." : "Retake Photo"}
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.photoButton}
                  onPress={() => takePhoto("meal_photo")}
                  disabled={uploadingPhoto || !locationVerified || !principalApproved}
                >
                  {uploadingPhoto && currentPhotoType === "meal_photo" ? (
                    <ActivityIndicator color={COLORS.white} />
                  ) : (
                    <>
                      <Ionicons name="camera" size={24} color={COLORS.white} />
                      <Text style={styles.photoButtonText}>Take Meal Photo</Text>
                      <Text style={styles.photoButtonSubtext}>GPS location will be captured</Text>
                    </>
                  )}
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}
      </View>
    )
  }

  // Show loading screen during initialization
  if (initialLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading inspection form...</Text>
        <Text style={styles.loadingSubtext}>Fetching school data and questions...</Text>
      </View>
    )
  }

  // Location Verification Screen
  if (showLocationVerification) {
    return (
      <View style={styles.verificationContainer}>
        <View style={styles.verificationContent}>
          <Ionicons name="location" size={80} color={COLORS.primary} />
          <Text style={styles.verificationTitle}>Location Verification</Text>
          <Text style={styles.verificationText}>
            Verifying your location to ensure you are within 100 meters of the assigned school...
          </Text>
          <ActivityIndicator size="large" color={COLORS.primary} style={styles.verificationLoader} />
          <TouchableOpacity style={styles.verificationButton} onPress={handleLocationVerification}>
            <Text style={styles.verificationButtonText}>Start Verification</Text>
          </TouchableOpacity>
        </View>
      </View>
    )
  }

  // School Details Display Screen
  if (showSchoolDetails && schoolData) {
    return (
      <View style={styles.schoolDetailsContainer}>
        <ScrollView contentContainerStyle={styles.schoolDetailsScrollContent}>
          <View style={styles.schoolDetailsContent}>
            <Ionicons name="checkmark-circle" size={80} color={COLORS.success} />
            <Text style={styles.schoolDetailsTitle}>Location Verified ✅</Text>
            <Text style={styles.schoolDetailsSubtitle}>Within 100 meter radius</Text>

            <View style={styles.schoolCard}>
              <Text style={styles.schoolCardTitle}>🏫 {schoolData.name}</Text>

              <View style={styles.schoolDetailSection}>
                <Text style={styles.sectionHeader}>📍 Basic Information</Text>
                <View style={styles.schoolDetailItem}>
                  <Text style={styles.schoolDetailLabel}>School Name:</Text>
                  <Text style={styles.schoolDetailValue}>{schoolData.name}</Text>
                </View>
                <View style={styles.schoolDetailItem}>
                  <Text style={styles.schoolDetailLabel}>Address:</Text>
                  <Text style={styles.schoolDetailValue}>{schoolData.address}</Text>
                </View>
                <View style={styles.schoolDetailItem}>
                  <Text style={styles.schoolDetailLabel}>School Type:</Text>
                  <Text style={styles.schoolDetailValue}>{schoolData.schoolType}</Text>
                </View>
                <View style={styles.schoolDetailItem}>
                  <Text style={styles.schoolDetailLabel}>Level:</Text>
                  <Text style={styles.schoolDetailValue}>{schoolData.level}</Text>
                </View>
                <View style={styles.schoolDetailItem}>
                  <Text style={styles.schoolDetailLabel}>Established:</Text>
                  <Text style={styles.schoolDetailValue}>{schoolData.establishedYear}</Text>
                </View>
              </View>

              <View style={styles.schoolDetailSection}>
                <Text style={styles.sectionHeader}>👨‍💼 Administration</Text>
                <View style={styles.schoolDetailItem}>
                  <Text style={styles.schoolDetailLabel}>Principal:</Text>
                  <Text style={styles.schoolDetailValue}>{schoolData.principalName}</Text>
                </View>
                <View style={styles.schoolDetailItem}>
                  <Text style={styles.schoolDetailLabel}>Phone:</Text>
                  <Text style={styles.schoolDetailValue}>{schoolData.principalPhone}</Text>
                </View>
                <View style={styles.schoolDetailItem}>
                  <Text style={styles.schoolDetailLabel}>Email:</Text>
                  <Text style={styles.schoolDetailValue}>{schoolData.principalEmail || "Not Available"}</Text>
                </View>
              </View>

              <View style={styles.schoolDetailSection}>
                <Text style={styles.sectionHeader}>📊 Statistics</Text>
                <View style={styles.schoolDetailItem}>
                  <Text style={styles.schoolDetailLabel}>Total Students:</Text>
                  <Text style={styles.schoolDetailValue}>{schoolData.totalStudents}</Text>
                </View>
                <View style={styles.schoolDetailItem}>
                  <Text style={styles.schoolDetailLabel}>Total Teachers:</Text>
                  <Text style={styles.schoolDetailValue}>{schoolData.totalTeachers}</Text>
                </View>
                <View style={styles.schoolDetailItem}>
                  <Text style={styles.schoolDetailLabel}>Classrooms:</Text>
                  <Text style={styles.schoolDetailValue}>{schoolData.infrastructure?.totalClassrooms}</Text>
                </View>
              </View>

              <View style={styles.schoolDetailSection}>
                <Text style={styles.sectionHeader}>🏗️ Infrastructure</Text>
                <View style={styles.schoolDetailItem}>
                  <Text style={styles.schoolDetailLabel}>Library:</Text>
                  <Text style={styles.schoolDetailValue}>{schoolData.infrastructure?.hasLibrary ? "Yes" : "No"}</Text>
                </View>
                <View style={styles.schoolDetailItem}>
                  <Text style={styles.schoolDetailLabel}>Computer Lab:</Text>
                  <Text style={styles.schoolDetailValue}>{schoolData.facilities?.computerLab ? "Yes" : "No"}</Text>
                </View>
                <View style={styles.schoolDetailItem}>
                  <Text style={styles.schoolDetailLabel}>Playground:</Text>
                  <Text style={styles.schoolDetailValue}>
                    {schoolData.infrastructure?.hasPlayground ? "Yes" : "No"}
                  </Text>
                </View>
                <View style={styles.schoolDetailItem}>
                  <Text style={styles.schoolDetailLabel}>Toilets:</Text>
                  <Text style={styles.schoolDetailValue}>
                    {schoolData.infrastructure?.hasToilets ? "Available" : "Not Available"}
                  </Text>
                </View>
              </View>

              {schoolData.lastInspectionDate && (
                <View style={styles.schoolDetailSection}>
                  <Text style={styles.sectionHeader}>📅 Last Inspection</Text>
                  <View style={styles.schoolDetailItem}>
                    <Text style={styles.schoolDetailLabel}>Date:</Text>
                    <Text style={styles.schoolDetailValue}>{schoolData.lastInspectionDate}</Text>
                  </View>
                </View>
              )}
            </View>

            <Text style={styles.autoFillText}>These details will be automatically filled in the inspection form</Text>

            <TouchableOpacity style={styles.proceedButton} onPress={handleProceedToPrincipalApproval}>
              <Ionicons name="mail" size={20} color={COLORS.white} />
              <Text style={styles.proceedButtonText}>Request Principal Approval</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    )
  }

  // Principal Approval Screen
  if (showPrincipalApproval) {
    return (
      <View style={styles.approvalContainer}>
        <ScrollView
          style={styles.approvalScrollView}
          contentContainerStyle={styles.approvalScrollContent}
          showsVerticalScrollIndicator={true}
        >
          <View style={styles.approvalContent}>
            <Ionicons
              name={approvalStatus.approved ? "checkmark-circle" : approvalStatus.emailSent ? "mail" : "mail-outline"}
              size={80}
              color={
                approvalStatus.approved ? COLORS.success : approvalStatus.emailSent ? COLORS.primary : COLORS.secondary
              }
            />
            <Text style={[styles.approvalTitle, approvalStatus.approved && { color: COLORS.success }]}>
              {approvalStatus.approved
                ? "Principal Approval Received! ✅"
                : approvalStatus.emailSent
                  ? "Professional Email Sent via SendGrid 📧"
                  : "Sending Approval Request..."}
            </Text>
            <Text style={styles.approvalText}>
              {approvalStatus.approved
                ? `Approval received at ${new Date(approvalStatus.approvalData?.approvedAt).toLocaleString()}. You can now proceed with the inspection.`
                : approvalStatus.emailSent}
            </Text>

            <View style={styles.approvalDetails}>
              <Text style={styles.approvalDetailTitle}>📧 SendGrid Email Details:</Text>
              <Text style={styles.approvalDetailText}>To: inspectiq5@gmail.com</Text>
              <Text style={styles.approvalDetailText}>
                Subject: 🚨 URGENT: School Inspection Approval Required - {schoolData?.name}
              </Text>
              <Text style={styles.approvalDetailText}>
                Inspector: {userData?.name} ({userData?.role?.toUpperCase()})
              </Text>
              <Text style={styles.approvalDetailText}>Date: {new Date().toLocaleDateString("en-IN")}</Text>
              <Text style={styles.approvalDetailText}>Format: Professional HTML + Plain Text</Text>
              <Text style={styles.approvalDetailText}>Provider: SendGrid API</Text>

              {approvalStatus.emailSent && (
                <View style={styles.emailSentIndicator}>
                  <Text style={styles.emailSentText}>✅ Professional email sent via SendGrid</Text>
                  <Text style={styles.emailSentTime}>Sent at: {new Date().toLocaleTimeString()}</Text>
                  <Text style={styles.emailSentTime}>Includes: HTML template, approval link, tracking</Text>
                </View>
              )}

              {approvalStatus.approved && (
                <View style={styles.approvalSuccess}>
                  <Text style={styles.approvalSuccessText}>
                    ✅ Approved by: {approvalStatus.approvalData?.approvedBy}
                  </Text>
                  <Text style={styles.approvalSuccessText}>
                    ✅ Approved at: {new Date(approvalStatus.approvalData?.approvedAt).toLocaleString()}
                  </Text>
                </View>
              )}

              {approvalStatus.error && (
                <View style={styles.approvalError}>
                  <Text style={styles.approvalErrorText}>❌ Error: {approvalStatus.error}</Text>
                </View>
              )}
            </View>

            {approvalLoading ? (
              <View style={styles.approvalLoading}>
                <ActivityIndicator size="large" color={COLORS.primary} />
                <Text style={styles.approvalLoadingText}>Sending via SendGrid...</Text>
              </View>
            ) : (
              <View style={styles.approvalActions}>
                {!approvalStatus.approved && approvalStatus.emailSent && (
                  <>
                    <View style={styles.approvalStatusContainer}>
                      {approvalStatus.checking ? (
                        <View style={styles.checkingStatus}>
                          <ActivityIndicator size="small" color={COLORS.primary} />
                          <Text style={styles.checkingStatusText}>Checking for approval...</Text>
                        </View>
                      ) : (
                        <Text style={styles.approvalWaitText}>
                          ⏳ Waiting for principal to click approval link in professional email...
                        </Text>
                      )}
                    </View>

                    <TouchableOpacity
                      style={styles.refreshButton}
                      onPress={checkApprovalStatusManually}
                      disabled={approvalStatus.checking}
                    >
                      <Ionicons name="refresh" size={16} color={COLORS.primary} />
                      <Text style={styles.refreshButtonText}>Check Approval Status</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.testButton} onPress={simulateApproval}>
                      <Ionicons name="flask" size={16} color={COLORS.secondary} />
                      <Text style={styles.testButtonText}>Test Approval (Dev Only)</Text>
                    </TouchableOpacity>
                  </>
                )}

                <TouchableOpacity
                  style={[styles.approvalButton, !approvalStatus.approved && styles.disabledApprovalButton]}
                  onPress={handlePrincipalApproval}
                  disabled={!approvalStatus.approved}
                >
                  <Ionicons
                    name={approvalStatus.approved ? "checkmark-circle" : "lock-closed"}
                    size={20}
                    color={COLORS.white}
                  />
                  <Text style={styles.approvalButtonText}>
                    {approvalStatus.approved ? "Continue to Inspection" : "Waiting for Email Approval"}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.cancelApprovalButton}
                  onPress={() => {
                    if (approvalListener) {
                      approvalListener()
                      setApprovalListener(null)
                    }
                    setShowPrincipalApproval(false)
                    setShowSchoolDetails(true)
                  }}
                >
                  <Text style={styles.cancelApprovalText}>Go Back</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </ScrollView>
      </View>
    )
  }

  if (!showInspectionForm) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Preparing inspection form...</Text>
      </View>
    )
  }

  const currentSectionIndex = sections.findIndex((s) => s.id === currentSection)
  const progress = ((currentSectionIndex + 1) / sections.length) * 100

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      <View style={styles.header}>
        <Text style={styles.title}>School Inspection Form</Text>
        <Text style={styles.subtitle}>{schoolData?.name || "School Inspection"}</Text>

        {/* Status Indicators */}
        <View style={styles.statusContainer}>
          <View style={styles.locationStatus}>
            <Ionicons name="location" size={16} color={COLORS.success} />
            <Text style={styles.locationStatusText}>Location Verified ✅</Text>
          </View>
          <View style={styles.approvalStatus}>
            <Ionicons name="checkmark-circle" size={16} color={COLORS.success} />
            <Text style={styles.approvalStatusText}>Principal Approved ✅</Text>
          </View>
        </View>
      </View>

      {/* Progress Bar */}
      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${progress}%` }]} />
        </View>
        <Text style={styles.progressText}>
          Section {currentSectionIndex + 1} of {sections.length} ({Math.round(progress)}%)
        </Text>
      </View>

      {/* Section Navigation */}
      <View style={styles.sectionNavigation}>
        {sections.map((section, index) => (
          <TouchableOpacity
            key={section.id}
            style={[styles.sectionTab, currentSection === section.id && styles.sectionTabActive]}
            onPress={() => setCurrentSection(section.id)}
          >
            <Text style={styles.sectionIcon}>{section.icon}</Text>
            <Text style={[styles.sectionTabText, currentSection === section.id && styles.sectionTabTextActive]}>
              {section.title}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Current Section Content */}
      <View style={styles.form}>
        <Text style={styles.sectionTitle}>{sections.find((s) => s.id === currentSection)?.title}</Text>
        {renderCurrentSection()}
      </View>

      {/* Navigation Buttons */}
      <View style={styles.navigationButtons}>
        {currentSectionIndex > 0 && (
          <TouchableOpacity style={styles.prevButton} onPress={previousSection}>
            <Ionicons name="chevron-back" size={20} color={COLORS.primary} />
            <Text style={styles.prevButtonText}>Previous</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[styles.nextButton, loading && styles.disabledButton]}
          onPress={currentSectionIndex === sections.length - 1 ? handleSubmit : nextSection}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={COLORS.white} />
          ) : (
            <>
              <Text style={styles.nextButtonText}>
                {currentSectionIndex === sections.length - 1 ? "Submit Inspection" : "Next"}
              </Text>
              {currentSectionIndex < sections.length - 1 && (
                <Ionicons name="chevron-forward" size={20} color={COLORS.white} />
              )}
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Confirmation Modal */}
      <Modal visible={showConfirmation} animationType="slide" transparent={true}>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Confirm Submission</Text>
            <Text style={styles.modalText}>
              Are you sure you want to submit this inspection report? Once submitted, it cannot be modified and will be
              forwarded to DEO and emailed to inspectiq5@gmail.com via SendGrid.
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.cancelModalButton} onPress={() => setShowConfirmation(false)}>
                <Text style={styles.cancelModalButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmButton} onPress={confirmSubmission}>
                <Text style={styles.confirmButtonText}>Confirm</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Signature Modal */}
      <Modal visible={showSignature} animationType="slide">
        <View style={styles.signatureContainer}>
          <Text style={styles.signatureTitle}>Digital Signature Required</Text>
          <Text style={styles.signatureSubtitle}>Please sign below to submit the report</Text>

          <View style={styles.signatureCanvas}>
            <SignatureScreen
              onOK={handleSignature}
              onEmpty={() => Alert.alert("Error", "Please provide signature")}
              descriptionText="Sign here"
              clearText="Clear"
              confirmText="Confirm"
              webStyle={`
                .m-signature-pad--footer {
                  display: flex;
                  justify-content: space-between;
                  margin-top: 10px;
                }
                .m-signature-pad--footer .button {
                  background-color: ${COLORS.primary};
                  color: white;
                  border: none;
                  padding: 10px 20px;
                  border-radius: 5px;
                }
              `}
            />
          </View>

          <TouchableOpacity style={styles.cancelSignatureButton} onPress={() => setShowSignature(false)}>
            <Text style={styles.cancelSignatureText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </ScrollView>
  )
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
    padding: 20,
  },
  loadingText: {
    fontSize: 18,
    color: COLORS.primary,
    marginTop: 20,
    fontWeight: "bold",
    textAlign: "center",
  },
  loadingSubtext: {
    fontSize: 14,
    color: COLORS.gray,
    marginTop: 10,
    textAlign: "center",
  },
  verificationContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.background,
    padding: 20,
  },
  verificationContent: {
    alignItems: "center",
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: 30,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  verificationTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: COLORS.primary,
    marginTop: 20,
    textAlign: "center",
  },
  verificationText: {
    fontSize: 16,
    color: COLORS.gray,
    textAlign: "center",
    marginTop: 15,
    lineHeight: 22,
  },
  verificationLoader: {
    marginTop: 20,
    marginBottom: 20,
  },
  verificationButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 30,
  },
  verificationButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: "bold",
  },
  schoolDetailsContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  schoolDetailsScrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 20,
  },
  schoolDetailsContent: {
    alignItems: "center",
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  schoolDetailsTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: COLORS.success,
    marginTop: 20,
    textAlign: "center",
  },
  schoolDetailsSubtitle: {
    fontSize: 16,
    color: COLORS.gray,
    textAlign: "center",
    marginTop: 5,
    marginBottom: 20,
  },
  schoolCard: {
    backgroundColor: COLORS.lightGray,
    borderRadius: 12,
    padding: 20,
    width: "100%",
    marginBottom: 20,
  },
  schoolCardTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: COLORS.primary,
    marginBottom: 20,
    textAlign: "center",
  },
  schoolDetailSection: {
    marginBottom: 20,
  },
  sectionHeader: {
    fontSize: 16,
    fontWeight: "bold",
    color: COLORS.secondary,
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
    paddingBottom: 5,
  },
  schoolDetailItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
    paddingHorizontal: 5,
  },
  schoolDetailLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.gray,
    flex: 1,
  },
  schoolDetailValue: {
    fontSize: 14,
    color: COLORS.black,
    flex: 1,
    textAlign: "right",
    fontWeight: "500",
  },
  autoFillText: {
    fontSize: 14,
    color: COLORS.primary,
    textAlign: "center",
    fontStyle: "italic",
    marginBottom: 20,
  },
  proceedButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    paddingVertical: 15,
    paddingHorizontal: 25,
  },
  proceedButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: "bold",
    marginLeft: 10,
  },
  approvalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.background,
    padding: 10,
    overflow: "visible"
  },
  approvalContent: {
    alignItems: "center",
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
    width: "100%",
    height: "100%",
  },
  approvalTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: COLORS.secondary,
    marginTop: 20,
    textAlign: "center",
  },
  approvalText: {
    fontSize: 16,
    color: COLORS.gray,
    textAlign: "center",
    marginTop: 15,
    lineHeight: 22,
    marginBottom: 20,
  },
  approvalDetails: {
    backgroundColor: COLORS.lightGray,
    borderRadius: 10,
    padding: 15,
    width: "100%",
    marginBottom: 20,
  },
  approvalDetailTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: COLORS.primary,
    marginBottom: 10,
  },
  approvalDetailText: {
    fontSize: 14,
    color: COLORS.gray,
    marginBottom: 5,
  },
  emailSentIndicator: {
    backgroundColor: COLORS.success + "20",
    borderRadius: 8,
    padding: 10,
    marginTop: 10,
  },
  emailSentText: {
    fontSize: 14,
    color: COLORS.success,
    fontWeight: "bold",
    marginBottom: 3,
  },
  emailSentTime: {
    fontSize: 12,
    color: COLORS.success,
  },
  approvalLoading: {
    alignItems: "center",
    marginTop: 20,
  },
  approvalLoadingText: {
    fontSize: 16,
    color: COLORS.primary,
    marginTop: 10,
  },
  approvalActions: {
    width: "100%",
    alignItems: "center",
  },
  approvalWaitText: {
    fontSize: 14,
    color: COLORS.gray,
    textAlign: "center",
    marginBottom: 20,
    fontStyle: "italic",
  },
  approvalButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.success,
    borderRadius: 10,
    paddingVertical: 15,
    paddingHorizontal: 25,
    marginBottom: 15,
  },
  approvalButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: "bold",
    marginLeft: 10,
  },
  cancelApprovalButton: {
    backgroundColor: COLORS.gray,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  cancelApprovalText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: "bold",
  },
  testButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.background,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderWidth: 1,
    borderColor: COLORS.secondary,
    marginBottom: 15,
  },
  testButtonText: {
    color: COLORS.secondary,
    fontSize: 14,
    fontWeight: "bold",
    marginLeft: 8,
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
  statusContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
  },
  locationStatus: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 6,
    padding: 8,
    flex: 1,
    marginRight: 5,
  },
  locationStatusText: {
    fontSize: 12,
    color: COLORS.white,
    marginLeft: 5,
  },
  approvalStatus: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 6,
    padding: 8,
    flex: 1,
    marginLeft: 5,
  },
  approvalStatusText: {
    fontSize: 12,
    color: COLORS.white,
    marginLeft: 5,
  },
  progressContainer: {
    padding: 20,
    backgroundColor: COLORS.white,
  },
  progressBar: {
    height: 6,
    backgroundColor: COLORS.lightGray,
    borderRadius: 3,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: COLORS.accent,
    borderRadius: 3,
  },
  progressText: {
    fontSize: 12,
    color: COLORS.gray,
    textAlign: "center",
    marginTop: 8,
  },
  sectionNavigation: {
    flexDirection: "row",
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
  },
  sectionTab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  sectionTabActive: {
    borderBottomColor: COLORS.primary,
  },
  sectionIcon: {
    fontSize: 16,
    marginBottom: 4,
  },
  sectionTabText: {
    fontSize: 10,
    color: COLORS.gray,
    textAlign: "center",
  },
  sectionTabTextActive: {
    color: COLORS.primary,
    fontWeight: "bold",
  },
  form: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: COLORS.primary,
    marginBottom: 20,
  },
  sectionContent: {
    marginBottom: 20,
  },
  schoolInfoSection: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 15,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  schoolInfoTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: COLORS.primary,
    marginBottom: 15,
  },
  schoolInfoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  infoItem: {
    width: "48%",
    marginBottom: 10,
  },
  infoLabel: {
    fontSize: 12,
    fontWeight: "bold",
    color: COLORS.gray,
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 14,
    color: COLORS.black,
  },
  questionContainer: {
    marginBottom: 20,
    backgroundColor: COLORS.white,
    borderRadius: 8,
    padding: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  questionText: {
    fontSize: 16,
    color: COLORS.black,
    marginBottom: 10,
    lineHeight: 22,
  },
  required: {
    color: COLORS.error,
    fontSize: 16,
  },
  radioGroup: {
    flexDirection: "row",
    alignItems: "center",
  },
  radioOption: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 20,
  },
  radioLabel: {
    fontSize: 16,
    color: COLORS.black,
    marginLeft: 8,
  },
  textInput: {
    backgroundColor: COLORS.white,
    marginTop: 5,
  },
  photoSection: {
    marginTop: 20,
  },
  photoSectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: COLORS.secondary,
    marginBottom: 15,
  },
  uploadSection: {
    marginBottom: 20,
  },
  uploadLabel: {
    fontSize: 14,
    fontWeight: "bold",
    color: COLORS.primary,
    marginBottom: 10,
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
    marginTop: 10,
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
    borderWidth: 1,
    borderColor: COLORS.success,
  },
  photoPreview: {
    width: "100%",
    height: 200,
    borderRadius: 8,
    marginBottom: 10,
  },
  photoInfoContainer: {
    marginBottom: 10,
  },
  photoInfo: {
    fontSize: 12,
    color: COLORS.gray,
    marginBottom: 3,
  },
  photoTime: {
    fontSize: 12,
    color: COLORS.gray,
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
  navigationButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 20,
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.lightGray,
  },
  prevButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.background,
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  prevButtonText: {
    color: COLORS.primary,
    fontWeight: "bold",
    marginLeft: 5,
  },
  nextButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    padding: 12,
    flex: 1,
    marginLeft: 10,
    justifyContent: "center",
  },
  nextButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: "bold",
    marginRight: 5,
  },
  disabledButton: {
    opacity: 0.6,
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
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: COLORS.primary,
    marginBottom: 15,
    textAlign: "center",
  },
  modalText: {
    fontSize: 16,
    color: COLORS.gray,
    textAlign: "center",
    marginBottom: 20,
    lineHeight: 22,
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  cancelModalButton: {
    flex: 1,
    backgroundColor: COLORS.gray,
    borderRadius: 8,
    padding: 15,
    alignItems: "center",
    marginRight: 10,
  },
  cancelModalButtonText: {
    color: COLORS.white,
    fontWeight: "bold",
  },
  confirmButton: {
    flex: 1,
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    padding: 15,
    alignItems: "center",
    marginLeft: 10,
  },
  confirmButtonText: {
    color: COLORS.white,
    fontWeight: "bold",
  },
  signatureContainer: {
    flex: 1,
    backgroundColor: COLORS.white,
    padding: 20,
  },
  signatureTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: COLORS.primary,
    textAlign: "center",
    marginTop: 40,
  },
  signatureSubtitle: {
    fontSize: 16,
    color: COLORS.gray,
    textAlign: "center",
    marginBottom: 30,
  },
  signatureCanvas: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
    borderRadius: 8,
    marginBottom: 20,
  },
  cancelSignatureButton: {
    backgroundColor: COLORS.error,
    borderRadius: 8,
    padding: 15,
    alignItems: "center",
  },
  cancelSignatureText: {
    color: COLORS.white,
    fontWeight: "bold",
    fontSize: 16,
  },
  approvalSuccess: {
    backgroundColor: COLORS.success + "20",
    borderRadius: 8,
    padding: 10,
    marginTop: 10,
  },
  approvalSuccessText: {
    fontSize: 14,
    color: COLORS.success,
    fontWeight: "bold",
    marginBottom: 3,
  },
  approvalStatusContainer: {
    marginBottom: 20,
    alignItems: "center",
  },
  checkingStatus: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.lightGray,
    borderRadius: 8,
    padding: 12,
  },
  checkingStatusText: {
    fontSize: 14,
    color: COLORS.primary,
    marginLeft: 8,
    fontWeight: "bold",
  },
  refreshButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.background,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderWidth: 1,
    borderColor: COLORS.primary,
    marginBottom: 15,
  },
  refreshButtonText: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: "bold",
    marginLeft: 8,
  },
  disabledApprovalButton: {
    backgroundColor: COLORS.gray,
    opacity: 0.6,
  },
  approvalError: {
    backgroundColor: COLORS.error + "20",
    borderRadius: 8,
    padding: 10,
    marginTop: 10,
  },
  approvalErrorText: {
    fontSize: 14,
    color: COLORS.error,
    fontWeight: "bold",
  },
})

export default EnhancedBEOInspectionForm
