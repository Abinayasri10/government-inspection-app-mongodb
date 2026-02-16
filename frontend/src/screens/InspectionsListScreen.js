import React, { useState, useEffect, useCallback } from "react"
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, ActivityIndicator, Alert } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { COLORS } from "../constants/colors"
import api from "../services/api"
import { useAuth } from "../context/AuthContext"
import { useFocusEffect } from "@react-navigation/native"
import PDFGenerator from "../services/PDFGenerator"

const InspectionsListScreen = ({ navigation }) => {
    const { userProfile: userData } = useAuth()
    const [activeTab, setActiveTab] = useState("assigned") // 'assigned' or 'completed'
    const [assignments, setAssignments] = useState([])
    const [completedReports, setCompletedReports] = useState([])
    const [loading, setLoading] = useState(true)
    const [refreshing, setRefreshing] = useState(false)
    const [downloadingReport, setDownloadingReport] = useState(null)

    const fetchData = async () => {
        try {
            if (!userData) return

            const userId = userData.id || userData.uid || userData._id
            setLoading(true)

            // Fetch pending assignments
            const assignmentsResponse = await api.get(`/assignments?assignedTo=${userId}&department=education`)
            const allAssignments = assignmentsResponse.data

            // Filter for active/pending assignments
            const pending = allAssignments.filter(a => a.status !== "completed")
            setAssignments(pending)

            // Fetch completed inspections/reports
            const reportsResponse = await api.get(`/inspections?userId=${userId}&department=education`)
            setCompletedReports(reportsResponse.data)

        } catch (error) {
            console.error("Error fetching inspections:", error)
            Alert.alert("Error", "Failed to load inspections")
        } finally {
            setLoading(false)
            setRefreshing(false)
        }
    }

    useFocusEffect(
        useCallback(() => {
            fetchData()
        }, [userData])
    )

    const onRefresh = () => {
        setRefreshing(true)
        fetchData()
    }

    const handleStartInspection = (assignment) => {
        if (!assignment.id && !assignment._id) {
            Alert.alert("Error", "Invalid assignment ID")
            return
        }
        navigation.navigate("InspectionForm", { assignmentData: assignment })
    }

    const handleDownloadReport = async (report) => {
        try {
            console.log("Starting download for report:", report.id)
            setDownloadingReport(report.id)

            // Generate PDF from the inspection data
            const pdfResult = await PDFGenerator.generatePDF(report)

            if (pdfResult.success) {
                console.log("PDF generated successfully:", pdfResult.uri)

                // Automatically download to device
                const downloadResult = await PDFGenerator.downloadPDF(pdfResult.uri, pdfResult.fileName)

                if (downloadResult.success) {
                    Alert.alert("Success", "Report downloaded successfully")
                } else {
                    throw new Error(downloadResult.error || "Failed to download PDF")
                }
            } else {
                throw new Error(pdfResult.error || "Failed to generate PDF")
            }
        } catch (error) {
            console.error("Error downloading report:", error)
            Alert.alert("Download Error", `Failed to download report: ${error.message}`)
        } finally {
            setDownloadingReport(null)
        }
    }

    const renderAssignmentItem = ({ item }) => (
        <View style={styles.card}>
            <View style={styles.cardHeader}>
                <View>
                    <Text style={styles.schoolName}>{item.locationName || item.schoolName}</Text>
                    <Text style={styles.address}>{item.address}</Text>
                </View>
                <Ionicons name="school-outline" size={24} color={COLORS.primary} />
            </View>

            <View style={styles.cardDetails}>
                <Text style={styles.detailText}>📅 Deadline: {new Date(item.deadline).toLocaleDateString()}</Text>
                <Text style={styles.detailText}>
                    🔥 Priority: <Text style={{ fontWeight: 'bold', color: item.priority === 'high' ? COLORS.error : COLORS.warning }}>{item.priority?.toUpperCase() || 'NORMAL'}</Text>
                </Text>
            </View>

            <TouchableOpacity
                style={styles.actionButton}
                onPress={() => handleStartInspection(item)}
            >
                <Text style={styles.actionButtonText}>Start Inspection</Text>
                <Ionicons name="arrow-forward" size={20} color={COLORS.white} />
            </TouchableOpacity>
        </View>
    )

    const renderCompletedItem = ({ item }) => (
        <TouchableOpacity style={styles.card} onPress={() => handleDownloadReport(item)} disabled={downloadingReport === item.id}>
            <View style={styles.cardHeader}>
                <View>
                    <Text style={styles.schoolName}>{item.schoolName}</Text>
                    <Text style={styles.address}>Completed on: {new Date(item.submittedAt).toLocaleDateString()}</Text>
                </View>
                <Ionicons name="checkmark-circle" size={24} color={COLORS.success} />
            </View>
            <View style={styles.statusBadge}>
                {downloadingReport === item.id ? (
                    <Text style={styles.statusText}>DOWNLOADING...</Text>
                ) : (
                    <Text style={styles.statusText}>SUBMITTED (TAP TO DOWNLOAD)</Text>
                )}
            </View>
        </TouchableOpacity>
    )

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.paddingTitle}>My Inspections</Text>
            </View>

            <View style={styles.tabContainer}>
                <TouchableOpacity
                    style={[styles.tab, activeTab === "assigned" && styles.activeTab]}
                    onPress={() => setActiveTab("assigned")}
                >
                    <Text style={[styles.tabText, activeTab === "assigned" && styles.activeTabText]}>
                        Assigned ({assignments.length})
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tab, activeTab === "completed" && styles.activeTab]}
                    onPress={() => setActiveTab("completed")}
                >
                    <Text style={[styles.tabText, activeTab === "completed" && styles.activeTabText]}>
                        Completed ({completedReports.length})
                    </Text>
                </TouchableOpacity>
            </View>

            {loading ? (
                <View style={styles.centerContainer}>
                    <ActivityIndicator size="large" color={COLORS.primary} />
                </View>
            ) : (
                <FlatList
                    data={activeTab === "assigned" ? assignments : completedReports}
                    renderItem={activeTab === "assigned" ? renderAssignmentItem : renderCompletedItem}
                    keyExtractor={(item) => item.id || item._id}
                    contentContainerStyle={styles.listContent}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                    ListEmptyComponent={
                        <View style={styles.emptyState}>
                            <Ionicons name="document-text-outline" size={50} color={COLORS.gray} />
                            <Text style={styles.emptyText}>No {activeTab} inspections found</Text>
                        </View>
                    }
                />
            )}
        </View>
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
        paddingTop: 50,
    },
    paddingTitle: {
        fontSize: 24,
        fontWeight: "bold",
        color: COLORS.white,
    },
    tabContainer: {
        flexDirection: "row",
        backgroundColor: COLORS.white,
        elevation: 2,
    },
    tab: {
        flex: 1,
        paddingVertical: 15,
        alignItems: "center",
        borderBottomWidth: 2,
        borderBottomColor: "transparent",
    },
    activeTab: {
        borderBottomColor: COLORS.primary,
    },
    tabText: {
        fontSize: 16,
        color: COLORS.gray,
        fontWeight: "600",
    },
    activeTabText: {
        color: COLORS.primary,
    },
    listContent: {
        padding: 15,
    },
    card: {
        backgroundColor: COLORS.white,
        borderRadius: 12,
        padding: 15,
        marginBottom: 15,
        elevation: 3,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    cardHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-start",
        marginBottom: 10,
    },
    schoolName: {
        fontSize: 18,
        fontWeight: "bold",
        color: COLORS.text,
        marginBottom: 5,
    },
    address: {
        fontSize: 14,
        color: COLORS.gray,
        marginBottom: 8,
    },
    cardDetails: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: 15,
        paddingBottom: 15,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.lightGray,
    },
    detailText: {
        fontSize: 14,
        color: COLORS.text,
    },
    actionButton: {
        backgroundColor: COLORS.primary,
        flexDirection: "row",
        justifyContent: "center",
        alignItems: "center",
        padding: 12,
        borderRadius: 8,
    },
    actionButtonText: {
        color: COLORS.white,
        fontWeight: "bold",
        marginRight: 8,
        fontSize: 16,
    },
    statusBadge: {
        backgroundColor: COLORS.success + "20",
        paddingVertical: 5,
        paddingHorizontal: 10,
        borderRadius: 5,
        alignSelf: "flex-start",
    },
    statusText: {
        color: COLORS.success,
        fontWeight: "bold",
        fontSize: 12,
    },
    centerContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },
    emptyState: {
        alignItems: "center",
        marginTop: 50,
    },
    emptyText: {
        color: COLORS.gray,
        fontSize: 16,
        marginTop: 10,
    },
})

export default InspectionsListScreen
