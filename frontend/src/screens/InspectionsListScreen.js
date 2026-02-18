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
    const [activeTab, setActiveTab] = useState("assigned")
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

            const [assignmentsRes, reportsRes] = await Promise.all([
                api.get(`/assignments?assignedTo=${userId}&department=education`),
                api.get(`/inspections?userId=${userId}&department=education`)
            ])

            setAssignments(assignmentsRes.data.filter(a => a.status !== "completed"))
            setCompletedReports(reportsRes.data)
        } catch (error) {
            Alert.alert("Error", "Failed to load inspections")
        } finally {
            setLoading(false)
            setRefreshing(false)
        }
    }

    useFocusEffect(useCallback(() => { fetchData() }, [userData]))

    const onRefresh = () => {
        setRefreshing(true)
        fetchData()
    }

    const renderAssignmentItem = ({ item }) => {
        // EXACT MAPPING BASED ON YOUR LOG:
        // The school details are inside the 'schoolId' object
        const schoolName = item.schoolId?.name || "Unknown School";
        const schoolAddress = item.schoolId?.address || "No address available";
        const schoolType = item.schoolId?.schoolType || "";

        return (
            <View style={styles.card}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <View style={{ flex: 1, paddingRight: 10 }}>
                        <Text style={{ 
                            fontSize: 18, 
                            fontWeight: "bold", 
                            color: "#000000", // Forced Black
                            marginBottom: 4 
                        }}>
                            {schoolName}
                        </Text>
                        <Text style={{ 
                            fontSize: 13, 
                            color: "#555555", // Dark Gray
                            lineHeight: 18 
                        }}>
                            {schoolAddress}
                        </Text>
                        {schoolType ? (
                            <View style={{backgroundColor: '#E3F2FD', alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, marginTop: 6}}>
                                <Text style={{fontSize: 10, color: '#1976D2', fontWeight: 'bold'}}>{schoolType.toUpperCase()}</Text>
                            </View>
                        ) : null}
                    </View>
                    <View style={{ backgroundColor: '#F5F5F5', padding: 10, borderRadius: 12 }}>
                        <Ionicons name="school" size={24} color={COLORS.primary || "#2196F3"} />
                    </View>
                </View>

                <View style={{ height: 1, backgroundColor: '#F0F0F0', marginVertical: 15 }} />

                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Ionicons name="calendar-outline" size={16} color="#666" />
                        <Text style={{ fontSize: 13, color: '#444', marginLeft: 6 }}>
                            Deadline: {item.deadline ? new Date(item.deadline).toLocaleDateString() : 'N/A'}
                        </Text>
                    </View>
                    <View style={{ 
                        backgroundColor: item.priority === 'high' ? '#FFEBEE' : '#FFF3E0', 
                        paddingHorizontal: 8, 
                        paddingVertical: 4, 
                        borderRadius: 6 
                    }}>
                        <Text style={{ 
                            fontSize: 11, 
                            fontWeight: 'bold', 
                            color: item.priority === 'high' ? '#C62828' : '#EF6C00' 
                        }}>
                            {item.priority?.toUpperCase()}
                        </Text>
                    </View>
                </View>

                <TouchableOpacity
                    activeOpacity={0.8}
                    style={{ 
                        backgroundColor: COLORS.primary || "#2196F3", 
                        flexDirection: 'row', 
                        justifyContent: 'center', 
                        alignItems: 'center',
                        padding: 14, 
                        borderRadius: 10,
                        elevation: 2
                    }}
                    onPress={() => navigation.navigate("InspectionForm", { assignmentData: item })}
                >
                    <Text style={{ color: '#FFFFFF', fontWeight: 'bold', fontSize: 15, marginRight: 8 }}>
                        Start Inspection
                    </Text>
                    <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
                </TouchableOpacity>
            </View>
        );
    }

    const renderCompletedItem = ({ item }) => {
        const schoolName = item.schoolId?.name || item.schoolName || "Completed Report";
        return (
            <TouchableOpacity 
                style={styles.card} 
                onPress={() => {
                    setDownloadingReport(item._id);
                    PDFGenerator.generatePDF(item).then(res => {
                        if(res.success) PDFGenerator.downloadPDF(res.uri, res.fileName);
                    }).finally(() => setDownloadingReport(null));
                }}
            >
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 17, fontWeight: 'bold', color: '#000' }}>{schoolName}</Text>
                        <Text style={{ fontSize: 12, color: '#666', marginTop: 4 }}>
                            Submitted: {new Date(item.submittedAt || item.createdAt).toLocaleDateString()}
                        </Text>
                    </View>
                    <Ionicons name="checkmark-circle" size={26} color="#4CAF50" />
                </View>
                <View style={{ marginTop: 12, backgroundColor: '#E8F5E9', padding: 8, borderRadius: 6, alignItems: 'center' }}>
                    <Text style={{ fontSize: 11, color: '#2E7D32', fontWeight: 'bold' }}>
                        {downloadingReport === item._id ? "DOWNLOADING..." : "VIEW REPORT PDF"}
                    </Text>
                </View>
            </TouchableOpacity>
        )
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>My Inspections</Text>
                <Text style={styles.headerSub}>Active Assignments</Text>
            </View>

            <View style={styles.tabContainer}>
                <TouchableOpacity style={[styles.tab, activeTab === "assigned" && styles.activeTab]} onPress={() => setActiveTab("assigned")}>
                    <Text style={[styles.tabText, activeTab === "assigned" && styles.activeTabText]}>Assigned ({assignments.length})</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.tab, activeTab === "completed" && styles.activeTab]} onPress={() => setActiveTab("completed")}>
                    <Text style={[styles.tabText, activeTab === "completed" && styles.activeTabText]}>Completed ({completedReports.length})</Text>
                </TouchableOpacity>
            </View>

            {loading ? (
                <View style={styles.center}><ActivityIndicator size="large" color="#2196F3" /></View>
            ) : (
                <FlatList
                    data={activeTab === "assigned" ? assignments : completedReports}
                    renderItem={activeTab === "assigned" ? renderAssignmentItem : renderCompletedItem}
                    keyExtractor={(item) => item._id}
                    contentContainerStyle={{ padding: 16 }}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                    ListEmptyComponent={
                        <View style={{ alignItems: 'center', marginTop: 50 }}>
                            <Ionicons name="document-text-outline" size={60} color="#CCC" />
                            <Text style={{ color: '#999', marginTop: 10 }}>No inspections found</Text>
                        </View>
                    }
                />
            )}
        </View>
    )
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F5F7FA' },
    header: { backgroundColor: COLORS.primary || '#2196F3', padding: 20, paddingTop: 50 },
    headerTitle: { fontSize: 24, fontWeight: "bold", color: "#FFF" },
    headerSub: { color: 'rgba(255,255,255,0.7)', fontSize: 14 },
    tabContainer: { flexDirection: "row", backgroundColor: "#FFF", elevation: 4, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 4 },
    tab: { flex: 1, paddingVertical: 15, alignItems: "center" },
    activeTab: { borderBottomWidth: 3, borderBottomColor: '#2196F3' },
    tabText: { fontSize: 14, color: "#999", fontWeight: "bold" },
    activeTabText: { color: "#2196F3" },
    card: { backgroundColor: "#FFF", borderRadius: 16, padding: 16, marginBottom: 16, elevation: 3, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 8 },
    center: { flex: 1, justifyContent: "center", alignItems: "center" }
});

export default InspectionsListScreen;