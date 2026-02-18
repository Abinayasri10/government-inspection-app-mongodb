"use client"

import { useState, useEffect } from "react"
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Alert } from "react-native"
import { Card, Title, Paragraph } from "react-native-paper"
import { Ionicons } from "@expo/vector-icons"
import { COLORS } from "../../constants/colors"
import api from "../../services/api"

const ConstructionDashboard = ({ userData }) => {
  const [assignments, setAssignments] = useState([])
  const [stats, setStats] = useState({
    pending: 0,
    completed: 0,
    overdue: 0,
  })
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    fetchAssignments()
  }, [])

  const fetchAssignments = async () => {
    try {
      const userId = userData.id || userData._id
      const response = await api.get(`/assignments?assignedTo=${userId}&department=construction`)
      const assignmentsList = response.data

      let pending = 0,
        completed = 0,
        overdue = 0

      assignmentsList.forEach((data) => {
        if (data.status === "completed") {
          completed++
        } else if (new Date(data.deadline) < new Date()) {
          overdue++
        } else {
          pending++
        }
      })

      setAssignments(assignmentsList)
      setStats({ pending, completed, overdue })
    } catch (error) {
      console.error("Error fetching assignments:", error)
      Alert.alert("Error", "Failed to fetch assignments")
    }
  }

  const onRefresh = async () => {
    setRefreshing(true)
    await fetchAssignments()
    setRefreshing(false)
  }

  const getStatusColor = (status, deadline) => {
    if (status === "completed") return COLORS.success
    if (new Date(deadline) < new Date()) return COLORS.error
    return COLORS.warning
  }

  const getStatusText = (status, deadline) => {
    if (status === "completed") return "Completed"
    if (new Date(deadline) < new Date()) return "Overdue"
    return "Pending"
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={styles.header}>
        <Text style={styles.welcomeText}>Welcome, {userData.name}</Text>
        <Text style={styles.roleText}>{userData.role.toUpperCase()} - Construction Department</Text>
      </View>

      <View style={styles.statsContainer}>
        <View style={[styles.statCard, { backgroundColor: COLORS.warning }]}>
          <Text style={styles.statNumber}>{stats.pending}</Text>
          <Text style={styles.statLabel}>Pending</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: COLORS.success }]}>
          <Text style={styles.statNumber}>{stats.completed}</Text>
          <Text style={styles.statLabel}>Completed</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: COLORS.error }]}>
          <Text style={styles.statNumber}>{stats.overdue}</Text>
          <Text style={styles.statLabel}>Overdue</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Assigned Construction Sites</Text>

      {assignments.map((assignment) => (
        <Card key={assignment._id || assignment.id} style={styles.assignmentCard}>
          <Card.Content>
            <View style={styles.cardHeader}>
              <Title style={styles.siteName}>{assignment.locationName}</Title>
              <View
                style={[
                  styles.statusBadge,
                  { backgroundColor: getStatusColor(assignment.status, assignment.deadline) },
                ]}
              >
                <Text style={styles.statusText}>{getStatusText(assignment.status, assignment.deadline)}</Text>
              </View>
            </View>

            <Paragraph style={styles.address}>{assignment.address}</Paragraph>

            <View style={styles.detailsRow}>
              <View style={styles.detailItem}>
                <Ionicons name="calendar-outline" size={16} color={COLORS.gray} />
                <Text style={styles.detailText}>Deadline: {new Date(assignment.deadline).toLocaleDateString()}</Text>
              </View>
            </View>

            <View style={styles.detailsRow}>
              <View style={styles.detailItem}>
                <Ionicons name="location-outline" size={16} color={COLORS.gray} />
                <Text style={styles.detailText}>Distance: {assignment.distance || "N/A"} km</Text>
              </View>
            </View>

            <View style={styles.checklistContainer}>
              <Text style={styles.checklistTitle}>Construction Audit Checklist:</Text>
              <Text style={styles.checklistItem}>• Work progress assessment</Text>
              <Text style={styles.checklistItem}>• Material quality verification</Text>
              <Text style={styles.checklistItem}>• Budget utilization review</Text>
              <Text style={styles.checklistItem}>• Safety compliance check</Text>
              <Text style={styles.checklistItem}>• Timeline adherence</Text>
            </View>

            {assignment.specialInstructions && (
              <View style={styles.instructionsContainer}>
                <Text style={styles.instructionsLabel}>Special Instructions:</Text>
                <Text style={styles.instructionsText}>{assignment.specialInstructions}</Text>
              </View>
            )}

            <TouchableOpacity
              style={[styles.actionButton, assignment.status === "completed" && styles.disabledButton]}
              disabled={assignment.status === "completed"}
            >
              <Text style={styles.actionButtonText}>
                {assignment.status === "completed" ? "Completed" : "Start Construction Audit"}
              </Text>
            </TouchableOpacity>
          </Card.Content>
        </Card>
      ))}

      {assignments.length === 0 && (
        <View style={styles.emptyState}>
          <Ionicons name="construct-outline" size={64} color={COLORS.gray} />
          <Text style={styles.emptyText}>No construction site assignments found</Text>
          <Text style={styles.emptySubtext}>Pull down to refresh</Text>
        </View>
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
    backgroundColor: COLORS.secondary,
    padding: 20,
    paddingTop: 40,
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
  statsContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    padding: 20,
    marginTop: -20,
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
    fontSize: 24,
    fontWeight: "bold",
    color: COLORS.white,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.white,
    marginTop: 5,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: COLORS.primary,
    marginHorizontal: 20,
    marginBottom: 15,
  },
  assignmentCard: {
    marginHorizontal: 20,
    marginBottom: 15,
    borderRadius: 12,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 10,
  },
  siteName: {
    fontSize: 18,
    fontWeight: "bold",
    color: COLORS.primary,
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    color: COLORS.white,
    fontWeight: "bold",
  },
  address: {
    fontSize: 14,
    color: COLORS.gray,
    marginBottom: 10,
  },
  detailsRow: {
    flexDirection: "row",
    marginBottom: 5,
  },
  detailItem: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  detailText: {
    fontSize: 14,
    color: COLORS.gray,
    marginLeft: 5,
  },
  checklistContainer: {
    backgroundColor: COLORS.background,
    padding: 10,
    borderRadius: 8,
    marginTop: 10,
  },
  checklistTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: COLORS.primary,
    marginBottom: 5,
  },
  checklistItem: {
    fontSize: 12,
    color: COLORS.gray,
    marginBottom: 2,
  },
  instructionsContainer: {
    backgroundColor: COLORS.background,
    padding: 10,
    borderRadius: 8,
    marginTop: 10,
  },
  instructionsLabel: {
    fontSize: 12,
    fontWeight: "bold",
    color: COLORS.primary,
    marginBottom: 5,
  },
  instructionsText: {
    fontSize: 12,
    color: COLORS.gray,
  },
  actionButton: {
    backgroundColor: COLORS.secondary,
    borderRadius: 8,
    padding: 12,
    alignItems: "center",
    marginTop: 15,
  },
  disabledButton: {
    backgroundColor: COLORS.gray,
  },
  actionButtonText: {
    color: COLORS.white,
    fontWeight: "bold",
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
})

export default ConstructionDashboard
