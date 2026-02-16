"use client"

import { useState, useEffect } from "react"
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Alert, Modal } from "react-native"
import { Card, Title } from "react-native-paper"
import { Ionicons } from "@expo/vector-icons"
import { COLORS } from "../../constants/colors"
import api from "../../services/api"


const CEODashboard = ({ userData }) => {
  const [reports, setReports] = useState([])
  const [filteredReports, setFilteredReports] = useState([])
  const [filter, setFilter] = useState("all") // all, pending, completed
  const [stats, setStats] = useState({
    pending: 0,
    completed: 0,
    total: 0,
  })
  const [refreshing, setRefreshing] = useState(false)
  const [selectedReport, setSelectedReport] = useState(null)
  const [showReportModal, setShowReportModal] = useState(false)

  useEffect(() => {
    fetchReports()
  }, [])

  useEffect(() => {
    filterReports()
  }, [reports, filter])

  const fetchReports = async () => {
    try {
      // Fetch inspections forwarded to CEO and approved by DEO
      const response = await api.get("/inspections?forwardedTo=ceo&department=education&deoStatus=approved")
      const reportsList = response.data

      let pending = 0,
        completed = 0

      reportsList.forEach((data) => {
        if (data.ceoStatus === "reviewed") {
          completed++
        } else {
          pending++
        }
      })

      setReports(reportsList)
      setStats({
        pending,
        completed,
        total: reportsList.length,
      })
    } catch (error) {
      console.error("Error fetching reports:", error)
      Alert.alert("Error", "Failed to fetch reports")
    }
  }

  const filterReports = () => {
    let filtered = reports
    if (filter === "pending") {
      filtered = reports.filter((report) => !report.ceoStatus || report.ceoStatus === "pending")
    } else if (filter === "completed") {
      filtered = reports.filter((report) => report.ceoStatus === "reviewed")
    }
    setFilteredReports(filtered)
  }

  const onRefresh = async () => {
    setRefreshing(true)
    await fetchReports()
    setRefreshing(false)
  }

  const viewReport = (report) => {
    setSelectedReport(report)
    setShowReportModal(true)
  }

  const handleReportReview = async (decision) => {
    if (!selectedReport) return

    try {
      const updateData = {
        ceoStatus: "reviewed",
        ceoDecision: decision,
        ceoReviewedAt: new Date().toISOString(),
        ceoReviewedBy: userData.name,
        finalStatus: "completed", // Mark as finally completed
      }

      await api.put(`/inspections/${selectedReport.id || selectedReport._id}`, updateData)

      // Update the original assignment to reflect final completion
      if (selectedReport.assignmentId) {
        try {
          await api.put(`/assignments/${selectedReport.assignmentId}`, {
            finalStatus: "completed",
            ceoReviewed: true,
            ceoReviewedAt: new Date().toISOString(),
            ceoDecision: decision,
          })
        } catch (assignmentError) {
          console.error("Error updating assignment final status:", assignmentError)
        }
      }

      Alert.alert(
        "Success",
        `Report marked as ${decision === "good" ? "satisfactory" : "needs improvement"} and BEO has been notified.`,
      )

      setShowReportModal(false)
      setSelectedReport(null)
      fetchReports()
    } catch (error) {
      console.error("Error updating report:", error)
      Alert.alert("Error", "Failed to update report")
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case "reviewed":
        return COLORS.success
      default:
        return COLORS.warning
    }
  }

  const getStatusText = (status) => {
    switch (status) {
      case "reviewed":
        return "REVIEWED"
      default:
        return "PENDING REVIEW"
    }
  }

  const getDecisionColor = (decision) => {
    switch (decision) {
      case "good":
        return COLORS.success
      case "bad":
        return COLORS.error
      default:
        return COLORS.gray
    }
  }

  const getDecisionText = (decision) => {
    switch (decision) {
      case "good":
        return "SATISFACTORY"
      case "bad":
        return "NEEDS IMPROVEMENT"
      default:
        return "NOT REVIEWED"
    }
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={styles.header}>
        <View style={styles.welcomeSection}>
          <Text style={styles.welcomeText}>Welcome, {userData.name}</Text>
          <Text style={styles.roleText}>CEO - Education Department</Text>
        </View>
        <View style={styles.headerIcon}>
          <Ionicons name="ribbon" size={40} color={COLORS.white} />
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
          <Text style={styles.statLabel}>Reviewed</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: COLORS.primary }]}>
          <Ionicons name="document-outline" size={24} color={COLORS.white} />
          <Text style={styles.statNumber}>{stats.total}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
      </View>

      {/* Filter Buttons */}
      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[styles.filterButton, filter === "all" && styles.activeFilter]}
          onPress={() => setFilter("all")}
        >
          <Text style={[styles.filterText, filter === "all" && styles.activeFilterText]}>All</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterButton, filter === "pending" && styles.activeFilter]}
          onPress={() => setFilter("pending")}
        >
          <Text style={[styles.filterText, filter === "pending" && styles.activeFilterText]}>Pending</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterButton, filter === "completed" && styles.activeFilter]}
          onPress={() => setFilter("completed")}
        >
          <Text style={[styles.filterText, filter === "completed" && styles.activeFilterText]}>Reviewed</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionTitle}>📋 DEO Approved Reports</Text>

      {filteredReports.map((report) => (
        <Card key={report.id} style={styles.reportCard}>
          <Card.Content>
            <View style={styles.cardHeader}>
              <View style={styles.reportInfo}>
                <Title style={styles.schoolName}>{report.schoolName}</Title>
                <Text style={styles.beoName}>BEO: {report.userName}</Text>
                <Text style={styles.deoName}>Approved by DEO: {report.deoSignedBy}</Text>
                <Text style={styles.submissionDate}>
                  DEO Approved: {new Date(report.deoSignedAt).toLocaleDateString("en-IN")}
                </Text>
              </View>
              <View style={styles.statusContainer}>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(report.ceoStatus) }]}>
                  <Text style={styles.statusText}>{getStatusText(report.ceoStatus)}</Text>
                </View>
                {report.ceoDecision && (
                  <View style={[styles.decisionBadge, { backgroundColor: getDecisionColor(report.ceoDecision) }]}>
                    <Text style={styles.decisionText}>{getDecisionText(report.ceoDecision)}</Text>
                  </View>
                )}
              </View>
            </View>

            <View style={styles.reportDetails}>
              <View style={styles.detailItem}>
                <Ionicons name="location-outline" size={16} color={COLORS.gray} />
                <Text style={styles.detailText}>{report.address}</Text>
              </View>
              <View style={styles.detailItem}>
                <Ionicons name="school-outline" size={16} color={COLORS.gray} />
                <Text style={styles.detailText}>Type: {report.schoolType}</Text>
              </View>
              <View style={styles.detailItem}>
                <Ionicons name="people-outline" size={16} color={COLORS.gray} />
                <Text style={styles.detailText}>Students: {report.studentsEnrolled}</Text>
              </View>
            </View>

            <View style={styles.actionContainer}>
              <TouchableOpacity style={styles.viewButton} onPress={() => viewReport(report)}>
                <Ionicons name="eye-outline" size={16} color={COLORS.primary} />
                <Text style={styles.viewButtonText}>View Full Report</Text>
              </TouchableOpacity>

              {(!report.ceoStatus || report.ceoStatus === "pending") && (
                <View style={styles.decisionButtons}>
                  <TouchableOpacity style={styles.goodButton} onPress={() => handleReportReview("good")}>
                    <Ionicons name="thumbs-up" size={16} color={COLORS.white} />
                    <Text style={styles.goodButtonText}>Satisfactory</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.badButton} onPress={() => handleReportReview("bad")}>
                    <Ionicons name="thumbs-down" size={16} color={COLORS.white} />
                    <Text style={styles.badButtonText}>Needs Improvement</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </Card.Content>
        </Card>
      ))}

      {filteredReports.length === 0 && (
        <View style={styles.emptyState}>
          <Ionicons name="document-outline" size={64} color={COLORS.gray} />
          <Text style={styles.emptyText}>No reports found</Text>
          <Text style={styles.emptySubtext}>
            {filter === "pending"
              ? "No pending reports"
              : filter === "completed"
                ? "No reviewed reports"
                : "No reports available"}
          </Text>
        </View>
      )}

      {/* Report Detail Modal */}
      <Modal visible={showReportModal} animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Final Review - CEO</Text>
            <TouchableOpacity onPress={() => setShowReportModal(false)}>
              <Ionicons name="close" size={24} color={COLORS.gray} />
            </TouchableOpacity>
          </View>

          {selectedReport && (
            <ScrollView style={styles.modalContent}>
              <View style={styles.reportSection}>
                <Text style={styles.reportSectionTitle}>School Information</Text>
                <Text style={styles.reportField}>School: {selectedReport.schoolName}</Text>
                <Text style={styles.reportField}>Address: {selectedReport.address}</Text>
                <Text style={styles.reportField}>Type: {selectedReport.schoolType}</Text>
                <Text style={styles.reportField}>Principal: {selectedReport.principalName}</Text>
              </View>

              <View style={styles.reportSection}>
                <Text style={styles.reportSectionTitle}>Infrastructure Assessment</Text>
                <Text style={styles.reportField}>Building Safe: {selectedReport.buildingSafe}</Text>
                <Text style={styles.reportField}>Drinking Water: {selectedReport.drinkingWater}</Text>
                <Text style={styles.reportField}>Separate Toilets: {selectedReport.separateToilets}</Text>
              </View>

              <View style={styles.reportSection}>
                <Text style={styles.reportSectionTitle}>Student Welfare</Text>
                <Text style={styles.reportField}>Total Students: {selectedReport.studentsEnrolled}</Text>
                <Text style={styles.reportField}>Mid-Day Meal: {selectedReport.midDayMeal}</Text>
                <Text style={styles.reportField}>Meal Quality: {selectedReport.mealQuality}</Text>
              </View>

              <View style={styles.reportSection}>
                <Text style={styles.reportSectionTitle}>BEO Observations</Text>
                <Text style={styles.reportField}>Strengths: {selectedReport.strengths}</Text>
                <Text style={styles.reportField}>Improvements: {selectedReport.improvements}</Text>
                <Text style={styles.reportField}>Recommendations: {selectedReport.recommendations}</Text>
              </View>

              <View style={styles.reportSection}>
                <Text style={styles.reportSectionTitle}>Approval Chain</Text>
                <Text style={styles.reportField}>Submitted by BEO: {selectedReport.userName}</Text>
                <Text style={styles.reportField}>
                  Submission Date: {new Date(selectedReport.submittedAt).toLocaleString()}
                </Text>
                <Text style={styles.reportField}>Approved by DEO: {selectedReport.deoSignedBy}</Text>
                <Text style={styles.reportField}>
                  DEO Approval Date: {new Date(selectedReport.deoSignedAt).toLocaleString()}
                </Text>
              </View>
            </ScrollView>
          )}

          {selectedReport && (!selectedReport.ceoStatus || selectedReport.ceoStatus === "pending") && (
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalGoodButton} onPress={() => handleReportReview("good")}>
                <Text style={styles.modalGoodText}>Mark as Satisfactory</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalBadButton} onPress={() => handleReportReview("bad")}>
                <Text style={styles.modalBadText}>Mark as Needs Improvement</Text>
              </TouchableOpacity>
            </View>
          )}
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
    padding: 15,
    alignItems: "center",
    marginHorizontal: 5,
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
    fontSize: 12,
    color: COLORS.white,
    marginTop: 2,
  },
  filterContainer: {
    flexDirection: "row",
    paddingHorizontal: 20,
    marginTop: 20,
    marginBottom: 10,
  },
  filterButton: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: 8,
    padding: 10,
    alignItems: "center",
    marginHorizontal: 5,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
  },
  activeFilter: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  filterText: {
    fontSize: 14,
    color: COLORS.gray,
    fontWeight: "bold",
  },
  activeFilterText: {
    color: COLORS.white,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: COLORS.primary,
    marginHorizontal: 20,
    marginTop: 10,
    marginBottom: 15,
  },
  reportCard: {
    marginHorizontal: 20,
    marginBottom: 15,
    borderRadius: 12,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 15,
  },
  reportInfo: {
    flex: 1,
  },
  schoolName: {
    fontSize: 18,
    fontWeight: "bold",
    color: COLORS.primary,
    marginBottom: 5,
  },
  beoName: {
    fontSize: 14,
    color: COLORS.secondary,
    marginBottom: 3,
  },
  deoName: {
    fontSize: 14,
    color: COLORS.accent,
    marginBottom: 3,
  },
  submissionDate: {
    fontSize: 12,
    color: COLORS.gray,
  },
  statusContainer: {
    alignItems: "flex-end",
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 5,
  },
  statusText: {
    fontSize: 10,
    color: COLORS.white,
    fontWeight: "bold",
  },
  decisionBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  decisionText: {
    fontSize: 10,
    color: COLORS.white,
    fontWeight: "bold",
  },
  reportDetails: {
    marginBottom: 15,
  },
  detailItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 5,
  },
  detailText: {
    fontSize: 14,
    color: COLORS.gray,
    marginLeft: 8,
  },
  actionContainer: {
    marginTop: 10,
  },
  viewButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.background,
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
  },
  viewButtonText: {
    color: COLORS.primary,
    fontWeight: "bold",
    marginLeft: 5,
  },
  decisionButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  goodButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.success,
    borderRadius: 8,
    padding: 10,
    marginRight: 5,
  },
  goodButtonText: {
    color: COLORS.white,
    fontWeight: "bold",
    marginLeft: 5,
  },
  badButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.error,
    borderRadius: 8,
    padding: 10,
    marginLeft: 5,
  },
  badButtonText: {
    color: COLORS.white,
    fontWeight: "bold",
    marginLeft: 5,
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
  modalContainer: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    paddingTop: 40,
    backgroundColor: COLORS.primary,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: COLORS.white,
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  reportSection: {
    marginBottom: 20,
    backgroundColor: COLORS.background,
    padding: 15,
    borderRadius: 8,
  },
  reportSectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: COLORS.primary,
    marginBottom: 10,
  },
  reportField: {
    fontSize: 14,
    color: COLORS.black,
    marginBottom: 5,
    lineHeight: 20,
  },
  modalActions: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: COLORS.lightGray,
  },
  modalGoodButton: {
    backgroundColor: COLORS.success,
    borderRadius: 8,
    padding: 15,
    alignItems: "center",
    marginBottom: 10,
  },
  modalGoodText: {
    color: COLORS.white,
    fontWeight: "bold",
    fontSize: 16,
  },
  modalBadButton: {
    backgroundColor: COLORS.error,
    borderRadius: 8,
    padding: 15,
    alignItems: "center",
  },
  modalBadText: {
    color: COLORS.white,
    fontWeight: "bold",
    fontSize: 16,
  },
})

export default CEODashboard
