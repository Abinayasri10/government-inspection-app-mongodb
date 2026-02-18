"use client"

import { useState, useEffect } from "react"
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Alert, Modal } from "react-native"
import { Card, Title } from "react-native-paper"
import { Ionicons } from "@expo/vector-icons"
import SignatureScreen from "react-native-signature-canvas"
import { COLORS } from "../../constants/colors"
import api from "../../services/api"

const DEODashboard = ({ userData }) => {
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
  const [showSignature, setShowSignature] = useState(false)
  const [reportDecision, setReportDecision] = useState("")

  useEffect(() => {
    fetchReports()
  }, [])

  useEffect(() => {
    filterReports()
  }, [reports, filter])

  const fetchReports = async () => {
    try {
      const response = await api.get("/inspections?department=education")
      const reportsList = response.data

      let pending = 0,
        completed = 0

      reportsList.forEach((data) => {
        // Count as completed if DEO has taken action
        if (data.deoStatus === "approved" || data.deoStatus === "rejected") {
          completed++
        } else if (data.forwardedTo === 'deo') {
          // Count as pending only if it is currently forwarded to DEO
          pending++
        }
      })

      setReports(reportsList)
      setStats({
        pending,
        completed,
        total: pending + completed,
      })
    } catch (error) {
      console.error("Error fetching reports:", error)
      Alert.alert("Error", "Failed to fetch reports")
    }
  }

  const filterReports = () => {
    let filtered = reports
    if (filter === "pending") {
      filtered = reports.filter((report) => report.forwardedTo === 'deo' && (!report.deoStatus || report.deoStatus === "pending"))
    } else if (filter === "completed") {
      filtered = reports.filter((report) => report.deoStatus === "approved" || report.deoStatus === "rejected")
    } else {
      // For 'all', we probably want to see both pending and completed, but exclude others?
      // Or show everything fetched? 
      // Current fetch gets ALL education reports. 
      // We should probably show only those relevant to DEO (either pending for DEO or processed by DEO)
      filtered = reports.filter(report =>
        report.forwardedTo === 'deo' ||
        report.deoStatus === 'approved' ||
        report.deoStatus === 'rejected'
      )
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

  const handleReportDecision = (decision) => {
    setReportDecision(decision)
    setShowReportModal(false)
    setShowSignature(true)
  }

  const handleSignature = async (signature) => {
    if (!selectedReport) return

    try {
      const updateData = {
        deoStatus: reportDecision,
        deoSignature: signature,
        deoSignedAt: new Date().toISOString(),
        deoSignedBy: userData.name,
        forwardedTo: reportDecision === "approved" ? "ceo" : null,
      }

      const reportId = selectedReport._id || selectedReport.id;
      await api.put(`/inspections/${reportId}`, updateData)

      Alert.alert(
        "Success",
        `Report ${reportDecision} successfully and ${reportDecision === "approved" ? "forwarded to CEO" : "sent back to BEO"}`,
      )

      setShowSignature(false)
      setSelectedReport(null)
      setReportDecision("")
      fetchReports()
    } catch (error) {
      console.error("Error updating report:", error)
      Alert.alert("Error", "Failed to update report")
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case "approved":
        return COLORS.success
      case "rejected":
        return COLORS.error
      default:
        return COLORS.warning
    }
  }

  const getStatusText = (status) => {
    switch (status) {
      case "approved":
        return "APPROVED"
      case "rejected":
        return "REJECTED"
      case "reschedule_requested":
        return "RESCHEDULE REQ"
      default:
        return "PENDING REVIEW"
    }
  }

  const getAiFlagColor = (flag) => {
    switch (flag) {
      case "Green": return COLORS.success;
      case "Yellow": return COLORS.warning;
      case "Red": return COLORS.error;
      default: return COLORS.gray;
    }
  }

  const handleRescheduleRequest = async () => {
    if (!selectedReport) return;
    try {
      const reportId = selectedReport._id || selectedReport.id;
      await api.put(`/inspections/${reportId}`, {
        deoStatus: 'reschedule_requested',
        remarks: 'Reschedule requested by DEO based on AI Analysis.'
      });
      Alert.alert("Success", "Reschedule request sent to Admin.");
      setShowReportModal(false);
      fetchReports();
    } catch (err) {
      Alert.alert("Error", "Failed to send request.");
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
          <Text style={styles.roleText}>DEO - Education Department</Text>
        </View>
        <View style={styles.headerIcon}>
          <Ionicons name="document-text" size={40} color={COLORS.white} />
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
          <Text style={[styles.filterText, filter === "completed" && styles.activeFilterText]}>Completed</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionTitle}>📋 BEO Reports for Review</Text>

      {filteredReports.map((report) => (
        <Card key={report._id || report.id} style={styles.reportCard}>
          <Card.Content>
            <View style={styles.cardHeader}>
              <View style={styles.reportInfo}>
                <Title style={styles.schoolName}>{report.schoolName}</Title>
                <Text style={styles.beoName}>Submitted by: {report.userName}</Text>
                <Text style={styles.submissionDate}>{new Date(report.submittedAt).toLocaleDateString("en-IN")}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(report.deoStatus), marginBottom: 5 }]}>
                  <Text style={styles.statusText}>{getStatusText(report.deoStatus)}</Text>
                </View>
                {report.aiAnalysis && (
                  <View style={[styles.statusBadge, { backgroundColor: getAiFlagColor(report.aiAnalysis.flag) }]}>
                    <Text style={styles.statusText}>AI: {report.aiAnalysis.flag.toUpperCase()}</Text>
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
                <Text style={styles.viewButtonText}>View Report</Text>
              </TouchableOpacity>

              {(!report.deoStatus || report.deoStatus === "pending") && (
                <View style={styles.decisionButtons}>
                  <TouchableOpacity style={styles.approveButton} onPress={() => handleReportDecision("approved")}>
                    <Ionicons name="checkmark" size={16} color={COLORS.white} />
                    <Text style={styles.approveButtonText}>Approve</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.rejectButton} onPress={() => handleReportDecision("rejected")}>
                    <Ionicons name="close" size={16} color={COLORS.white} />
                    <Text style={styles.rejectButtonText}>Reject</Text>
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
                ? "No completed reports"
                : "No reports available"}
          </Text>
        </View>
      )}

      {/* Report Detail Modal */}
      <Modal visible={showReportModal} animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Inspection Report</Text>
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
                <Text style={styles.reportSectionTitle}>Infrastructure</Text>
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
                <Text style={styles.reportSectionTitle}>Observations</Text>
                <Text style={styles.reportField}>Strengths: {selectedReport.strengths}</Text>
                <Text style={styles.reportField}>Improvements: {selectedReport.improvements}</Text>
                <Text style={styles.reportField}>Recommendations: {selectedReport.recommendations}</Text>
              </View>

              <View style={styles.reportSection}>
                <Text style={styles.reportSectionTitle}>Submitted by</Text>
                <Text style={styles.reportField}>BEO: {selectedReport.userName}</Text>
                <Text style={styles.reportField}>Date: {new Date(selectedReport.submittedAt).toLocaleString()}</Text>
              </View>

              {selectedReport.aiAnalysis && (
                <View style={[styles.reportSection, { borderColor: getAiFlagColor(selectedReport.aiAnalysis.flag), borderWidth: 1 }]}>
                  <Text style={[styles.reportSectionTitle, { color: getAiFlagColor(selectedReport.aiAnalysis.flag) }]}>
                    AI Analysis Result: {selectedReport.aiAnalysis.flag} Flag
                  </Text>

                  {selectedReport.aiAnalysis.issues && selectedReport.aiAnalysis.issues.length > 0 ? (
                    <View>
                      <Text style={[styles.reportField, { fontWeight: 'bold', color: COLORS.error }]}>Issues Detected:</Text>
                      {selectedReport.aiAnalysis.issues.map((issue, idx) => (
                        <Text key={idx} style={styles.reportField}>• {issue}</Text>
                      ))}
                    </View>
                  ) : (
                    <Text style={[styles.reportField, { color: COLORS.success }]}>No issues detected. Report looks good.</Text>
                  )}

                  {selectedReport.aiAnalysis.summary && selectedReport.aiAnalysis.summary.length > 0 && (
                    <View style={{ marginTop: 10 }}>
                      <Text style={[styles.reportField, { fontWeight: 'bold' }]}>Summary:</Text>
                      {selectedReport.aiAnalysis.summary.map((line, idx) => (
                        <Text key={idx} style={styles.reportField}>• {line}</Text>
                      ))}
                    </View>
                  )}
                </View>
              )}
            </ScrollView>
          )}

          {selectedReport && (!selectedReport.deoStatus || selectedReport.deoStatus === "pending") && (
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalApproveButton} onPress={() => handleReportDecision("approved")}>
                <Text style={styles.modalApproveText}>Approve & Forward to CEO</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.modalRejectButton} onPress={() => handleReportDecision("rejected")}>
                <Text style={styles.modalRejectText}>Reject & Send Back</Text>
              </TouchableOpacity>

              {selectedReport.aiAnalysis && (selectedReport.aiAnalysis.flag === 'Red' || selectedReport.aiAnalysis.flag === 'Yellow') && (
                <TouchableOpacity
                  style={[styles.modalRejectButton, { backgroundColor: COLORS.warning, marginTop: 10 }]}
                  onPress={handleRescheduleRequest}
                >
                  <Text style={styles.modalRejectText}>Request Reschedule (Admin)</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
      </Modal>

      {/* Signature Modal */}
      <Modal visible={showSignature} animationType="slide">
        <View style={styles.signatureContainer}>
          <Text style={styles.signatureTitle}>Digital Signature Required</Text>
          <Text style={styles.signatureSubtitle}>
            Please sign to {reportDecision === "approved" ? "approve and forward" : "reject"} this report
          </Text>

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
                  line-height: 1.2; /* keeps text centered inside button */
    display: flex;
    align-items: center; /* centers text inside button */
                  
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
    marginTop: 30,
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
    marginTop: 9,
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
  submissionDate: {
    fontSize: 12,
    color: COLORS.gray,
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
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
  },
  viewButtonText: {
    color: COLORS.white,
    fontWeight: "bold",
    marginLeft: 5,
  },
  decisionButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  approveButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.success,
    borderRadius: 8,
    padding: 10,
    marginRight: 5,
  },
  approveButtonText: {
    color: COLORS.white,
    fontWeight: "bold",
    marginLeft: 5,
  },
  rejectButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.error,
    borderRadius: 8,
    padding: 10,
    marginLeft: 5,
  },
  rejectButtonText: {
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
  modalApproveButton: {
    backgroundColor: COLORS.success,
    borderRadius: 8,
    padding: 15,
    alignItems: "center",
    marginBottom: 10,
  },
  modalApproveText: {
    color: COLORS.white,
    fontWeight: "bold",
    fontSize: 16,
  },
  modalRejectButton: {
    backgroundColor: COLORS.error,
    borderRadius: 8,
    padding: 15,
    alignItems: "center",
  },
  modalRejectText: {
    color: COLORS.white,
    fontWeight: "bold",
    fontSize: 16,
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
})

export default DEODashboard
