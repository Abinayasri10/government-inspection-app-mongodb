"use client"

import { useState, useEffect } from "react"
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Alert } from "react-native"
import { Card, Title } from "react-native-paper"
import { Ionicons } from "@expo/vector-icons"
import { COLORS } from "../../constants/colors"
import api from "../../services/api"
import PDFGenerator from "../../services/PDFGenerator"
import { useFocusEffect } from "@react-navigation/native"
import { useCallback } from "react"

const EducationDashboard = ({ userData, navigation, route }) => {
  const [assignments, setAssignments] = useState([])
  const [completedReports, setCompletedReports] = useState([])
  const [stats, setStats] = useState({
    pending: 0,
    completed: 0,
    overdue: 0,
    totalReports: 0,
  })
  const [refreshing, setRefreshing] = useState(false)
  const [downloadingReport, setDownloadingReport] = useState(null)

  useFocusEffect(
    useCallback(() => {
      fetchAssignments()
      fetchCompletedReports()

      // Check if we need to refresh due to form submission
      if (route?.params?.refresh) {
        console.log("🔄 Refreshing dashboard due to form submission")
        // Clear the refresh param to prevent infinite refreshes
        navigation.setParams({ refresh: false })
      }
    }, [route?.params?.refresh]),
  )

  useEffect(() => {
    fetchAssignments()
    fetchCompletedReports()
  }, [])

  const fetchAssignments = async () => {
    try {
      const userId = userData.id || userData.uid || userData._id
      console.log("📋 Fetching assignments for user:", userId)

      const response = await api.get(`/assignments?assignedTo=${userId}&department=education`)
      const assignmentsList = response.data

      let pending = 0,
        completed = 0,
        overdue = 0

      assignmentsList.forEach((data) => {
        // Updated status counting logic
        if (data.status === "completed") {
          completed++
        } else if (new Date(data.deadline) < new Date() && data.status !== "completed") {
          overdue++
        } else if (data.status !== "completed") {
          pending++
        }
      })

      console.log("📊 Assignment stats - Pending:", pending, "Completed:", completed, "Overdue:", overdue)
      setAssignments(assignmentsList)
      setStats((prev) => ({ ...prev, pending, completed, overdue }))
    } catch (error) {
      console.error("❌ Error fetching assignments:", error)
      Alert.alert("Error", "Failed to fetch assignments")
    }
  }

  const fetchCompletedReports = async () => {
    try {
      const userId = userData.id || userData.uid || userData._id
      const response = await api.get(`/inspections?userId=${userId}&department=education`)

      const reportsList = response.data

      setCompletedReports(reportsList)
      setStats((prev) => ({ ...prev, totalReports: reportsList.length }))
    } catch (error) {
      console.error("Error fetching reports:", error)
    }
  }

  const onRefresh = async () => {
    setRefreshing(true)
    await fetchAssignments()
    await fetchCompletedReports()
    setRefreshing(false)
  }

  const getStatusColor = (status, deadline) => {
    if (status === "completed") return COLORS.success
    if (new Date(deadline) < new Date() && status !== "completed") return COLORS.error
    return COLORS.warning
  }

  const getStatusText = (status, deadline) => {
    if (status === "completed") return "Completed"
    if (new Date(deadline) < new Date() && status !== "completed") return "Overdue"
    return "Pending"
  }

  const handleStartInspection = (assignment) => {
    if (assignment.status === "completed") {
      Alert.alert("Already Completed", "This inspection has already been completed.")
      return
    }

    console.log("🚀 Starting inspection for assignment:", assignment)

    if (!assignment.id && !assignment._id) {
      Alert.alert("Error", "Assignment ID is missing. Cannot start inspection.")
      return
    }

    navigation.navigate("Inspections", {
      screen: "InspectionForm",
      params: { assignmentData: assignment }
    })
  }

  const downloadReport = async (report) => {
    try {
      const reportId = report._id || report.id;
      console.log("Starting download for report:", reportId)
      setDownloadingReport(reportId)

      // Generate PDF from the inspection data
      const pdfResult = await PDFGenerator.generatePDF(report)

      if (pdfResult.success) {
        console.log("PDF generated successfully:", pdfResult.uri)

        // Automatically download to device
        const downloadResult = await PDFGenerator.downloadPDF(pdfResult.uri, pdfResult.fileName)

        if (downloadResult.success) {
          console.log("PDF download completed successfully")
        } else {
          throw new Error(downloadResult.error || "Failed to download PDF")
        }
      } else {
        throw new Error(pdfResult.error || "Failed to generate PDF")
      }
    } catch (error) {
      console.error("Error downloading report:", error)
      Alert.alert("Download Error", `Failed to download report: ${error.message}`, [
        { text: "OK" },
        { text: "Retry", onPress: () => downloadReport(report) },
      ])
    } finally {
      setDownloadingReport(null)
    }
  }

  const isDeadlinePassed = (deadline) => {
    return new Date(deadline) < new Date()
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={styles.header}>
        <View style={styles.welcomeSection}>
          <Text style={styles.welcomeText}>Welcome, {userData.name}</Text>
          <Text style={styles.roleText}>{userData.role.toUpperCase()} - Education Department</Text>
        </View>
        <View style={styles.headerIcon}>
          <Ionicons name="school" size={40} color={COLORS.white} />
        </View>
      </View>

      <View style={styles.statsContainer}>
        <View style={[styles.statCard, { backgroundColor: COLORS.warning }]}>
          <Ionicons name="time-outline" size={24} color={COLORS.white} />
          <Text style={styles.statNumber}>{stats.pending}</Text>
          <Text style={styles.statLabel}>Pending</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: COLORS.success }]}>
          <Ionicons name="checkmark-circle-outline" size={24} color={COLORS.white} />
          <Text style={styles.statNumber}>{stats.completed}</Text>
          <Text style={styles.statLabel}>Completed</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: COLORS.error }]}>
          <Ionicons name="alert-circle-outline" size={24} color={COLORS.white} />
          <Text style={styles.statNumber}>{stats.overdue}</Text>
          <Text style={styles.statLabel}>Overdue</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: COLORS.secondary }]}>
          <Ionicons name="document-text-outline" size={24} color={COLORS.white} />
          <Text style={styles.statNumber}>{stats.totalReports}</Text>
          <Text style={styles.statLabel}>Reports</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>📋 Assigned Schools</Text>

      {assignments.map((assignment) => (
        <Card key={assignment._id || assignment.id} style={styles.assignmentCard}>
          <Card.Content>
            <View style={styles.cardHeader}>
              <View style={styles.schoolInfo}>
                <Text style={styles.schoolName}>{assignment.schoolId?.name || "Unknown School"}</Text>
                <Text style={styles.schoolAddress}>{assignment.schoolId?.address || "Address not available"}</Text>
              </View>
              <View
                style={[
                  styles.statusBadge,
                  { backgroundColor: getStatusColor(assignment.status, assignment.deadline) },
                ]}
              >
                <Text style={styles.statusText}>{getStatusText(assignment.status, assignment.deadline)}</Text>
              </View>
            </View>

            <View style={styles.cardDetails}>
              <View style={styles.detailItem}>
                <Ionicons name="calendar-outline" size={16} color={COLORS.gray} />
                <Text style={styles.detailText}>
                  Deadline: {new Date(assignment.deadline).toLocaleDateString()}
                </Text>
              </View>
              {assignment.priority && (
                <View style={styles.detailItem}>
                  <Ionicons
                    name="alert-circle-outline"
                    size={16}
                    color={
                      assignment.priority === "high"
                        ? COLORS.error
                        : assignment.priority === "medium"
                          ? COLORS.warning
                          : COLORS.success
                    }
                  />
                  <Text
                    style={[
                      styles.detailText,
                      {
                        color:
                          assignment.priority === "high"
                            ? COLORS.error
                            : assignment.priority === "medium"
                              ? COLORS.warning
                              : COLORS.success,
                        fontWeight: "bold",
                      },
                    ]}
                  >
                    {assignment.priority.toUpperCase()} Priority
                  </Text>
                </View>
              )}
            </View>

            {assignment.specialInstructions && (
              <View style={styles.instructionsContainer}>
                <Text style={styles.instructionsTitle}>Special Instructions:</Text>
                <Text style={styles.instructionsText}>{assignment.specialInstructions}</Text>
              </View>
            )}

            <TouchableOpacity
              style={[
                styles.actionButton,
                assignment.status === "completed" && styles.completedButton,
                isDeadlinePassed(assignment.deadline) &&
                assignment.status !== "completed" &&
                styles.overdueButton,
              ]}
              onPress={() => handleStartInspection(assignment)}
              disabled={assignment.status === "completed"}
            >
              <Text style={styles.actionButtonText}>
                {assignment.status === "completed"
                  ? "Inspection Completed"
                  : isDeadlinePassed(assignment.deadline)
                    ? "Start Overdue Inspection"
                    : "Start Inspection"}
              </Text>
              {assignment.status !== "completed" && (
                <Ionicons name="arrow-forward" size={20} color={COLORS.white} />
              )}
            </TouchableOpacity>
          </Card.Content>
        </Card>
      ))}

      {assignments.length === 0 && (
        <View style={styles.emptyState}>
          <Ionicons name="school-outline" size={64} color={COLORS.gray} />
          <Text style={styles.emptyText}>No school assignments found</Text>
          <Text style={styles.emptySubtext}>New assignments will appear here</Text>
        </View>
      )}

      {/* Completed Reports Section */}
      {completedReports.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>📄 Completed Reports</Text>
          {completedReports.slice(0, 5).map((report) => (
            <Card key={report._id || report.id} style={styles.reportCard}>
              <Card.Content>
                <View style={styles.reportHeader}>
                  <View style={styles.reportTitleContainer}>
                    <Text style={styles.reportTitle}>{report.schoolName}</Text>
                    <Text style={styles.reportDate}>{new Date(report.submittedAt).toLocaleDateString("en-IN")}</Text>
                  </View>
                  <Text style={styles.reportId}>ID: {(report._id || report.id) ? (report._id || report.id).substring(0, 8) : 'N/A'}</Text>
                </View>

                <View style={styles.reportDetails}>
                  <View style={styles.reportDetailItem}>
                    <Ionicons name="person-outline" size={14} color={COLORS.gray} />
                    <Text style={styles.reportDetailText}>Inspector: {report.inspectorName}</Text>
                  </View>
                  <View style={styles.reportDetailItem}>
                    <Ionicons name="calendar-outline" size={14} color={COLORS.gray} />
                    <Text style={styles.reportDetailText}>Date: {report.inspectionDate}</Text>
                  </View>
                </View>

                <View style={styles.reportStatus}>
                  <View style={[styles.statusBadge, { backgroundColor: COLORS.success }]}>
                    <Text style={styles.statusText}>SUBMITTED TO DEO</Text>
                  </View>
                  <TouchableOpacity
                    style={[styles.downloadButton, downloadingReport === (report._id || report.id) && styles.downloadingButton]}
                    onPress={() => downloadReport(report)}
                    disabled={downloadingReport === (report._id || report.id)}
                  >
                    {downloadingReport === (report._id || report.id) ? (
                      <>
                        <Ionicons name="hourglass-outline" size={16} color={COLORS.primary} />
                        <Text style={styles.downloadText}>Downloading...</Text>
                      </>
                    ) : (
                      <>
                        <Ionicons name="download-outline" size={16} color={COLORS.primary} />
                        <Text style={styles.downloadText}>Download PDF</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </Card.Content>
            </Card>
          ))}

          {completedReports.length > 5 && (
            <TouchableOpacity style={styles.viewAllButton} onPress={() => navigation.navigate("Reports")}>
              <Text style={styles.viewAllText}>View All Reports ({completedReports.length})</Text>
              <Ionicons name="arrow-forward" size={16} color={COLORS.primary} />
            </TouchableOpacity>
          )}
        </>
      )}
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
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  welcomeSection: {
    flex: 1,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: "bold",
    color: COLORS.white,
  },
  roleText: {
    fontSize: 14,
    color: COLORS.background,
    marginTop: 5,
  },
  headerIcon: {
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 25,
    padding: 10,
  },
  statsContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    padding: 15,
    marginTop: 20,
  },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 12,
    alignItems: "center",
    marginHorizontal: 3,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: "bold",
    color: COLORS.white,
    marginTop: 5,
  },
  statLabel: {
    fontSize: 10,
    color: COLORS.white,
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: COLORS.primary,
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: 15,
  },
  assignmentCard: {
    marginHorizontal: 20,
    marginBottom: 15,
    borderRadius: 15,
    backgroundColor: '#FFFFFF',
    elevation: 4,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 10,
  },
  schoolInfo: {
    flex: 1,
  },
  schoolName: {
    fontSize: 18,
    fontWeight: "bold",
    color: COLORS.primary,
    marginBottom: 5,
  },
  schoolType: {
    flexDirection: "row",
    alignItems: "center",
  },
  schoolTypeText: {
    fontSize: 12,
    color: COLORS.gray,
    marginLeft: 5,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 10,
    color: COLORS.white,
    fontWeight: "bold",
  },
  addressContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 15,
  },
  address: {
    fontSize: 14,
    color: COLORS.gray,
    marginLeft: 5,
    flex: 1,
  },
  detailsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 15,
  },
  detailItem: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  detailText: {
    fontSize: 12,
    color: COLORS.gray,
    marginLeft: 5,
  },
  instructionsContainer: {
    backgroundColor: COLORS.background,
    padding: 10,
    borderRadius: 8,
    marginBottom: 15,
  },
  instructionsLabel: {
    fontSize: 12,
    fontWeight: "bold",
    color: COLORS.secondary,
    marginLeft: 20,
    marginBottom: 5,
  },
  instructionsText: {
    fontSize: 12,
    color: COLORS.gray,
    marginLeft: 20,
  },
  actionContainer: {
    marginTop: 10,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
    padding: 12,
    backgroundColor: COLORS.primary,
  },
  primaryButton: {
    backgroundColor: COLORS.accent,
  },
  disabledButton: {
    backgroundColor: COLORS.gray,
  },
  actionButtonText: {
    color: COLORS.white,
    fontWeight: "bold",
    marginLeft: 8,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
  },
  emptyText: {
    fontSize: 18,
    color: COLORS.gray,
    marginTop: 15,
  },
  emptySubtext: {
    fontSize: 14,
    color: COLORS.gray,
    marginTop: 5,
  },
  reportCard: {
    marginHorizontal: 20,
    marginBottom: 15,
    borderRadius: 15,
    backgroundColor: '#FFFFFF',
    elevation: 4,
  },
  reportHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 10,
  },
  reportTitleContainer: {
    flex: 1,
  },
  reportTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: COLORS.primary,
    marginBottom: 2,
  },
  reportDate: {
    fontSize: 12,
    color: COLORS.gray,
  },
  reportId: {
    fontSize: 10,
    color: COLORS.gray,
    backgroundColor: COLORS.lightGray,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  reportDetails: {
    marginBottom: 10,
  },
  reportDetailItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  reportDetailText: {
    fontSize: 12,
    color: COLORS.gray,
    marginLeft: 6,
  },
  reportStatus: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  downloadButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.background,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  downloadingButton: {
    opacity: 0.7,
    backgroundColor: COLORS.lightGray,
  },
  downloadText: {
    fontSize: 12,
    color: COLORS.primary,
    marginLeft: 5,
    fontWeight: "600",
  },
  viewAllButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 15,
    backgroundColor: COLORS.white,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  viewAllText: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: "600",
    marginRight: 8,
  },
  completedButton: {
    backgroundColor: COLORS.success,
  },
  overdueButton: {
    backgroundColor: COLORS.error,
  },
})

export default EducationDashboard