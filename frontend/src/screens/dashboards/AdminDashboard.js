"use client"

import { useState, useEffect } from "react"
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Alert } from "react-native"
import { Card, Title, Paragraph } from "react-native-paper"
import { Ionicons } from "@expo/vector-icons"
import { COLORS } from "../../constants/colors"
import api from "../../services/api"

const AdminDashboard = ({ userData, navigation }) => {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalAssignments: 0,
    pendingInspections: 0,
    completedInspections: 0,
  })
  const [recentActivity, setRecentActivity] = useState([])
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      // We can parallelize these calls or create a dashboard endpoint
      // For now, parallelize individual calls
      const [usersRes, assignmentsRes, inspectionsRes] = await Promise.all([
        api.get("/users"),
        api.get("/assignments"),
        api.get("/inspections")
      ])

      const totalUsers = usersRes.data.length
      const totalAssignments = assignmentsRes.data.length

      const inspections = inspectionsRes.data
      let pendingInspections = 0
      let completedInspections = 0

      inspections.forEach((insp) => {
        // Consider approved, rejected, or completed status as 'completed'
        if (['approved', 'rejected', 'completed'].includes(insp.status) ||
          ['approved', 'rejected'].includes(insp.deoStatus)) {
          completedInspections++
        } else {
          pendingInspections++
        }
      })

      setStats({
        totalUsers,
        totalAssignments,
        pendingInspections,
        completedInspections,
      })

      // Recent Activity - already sorted by backend
      setRecentActivity(inspections.slice(0, 5))
    } catch (error) {
      console.error("Error fetching dashboard data:", error)
      Alert.alert("Error", "Failed to fetch dashboard data")
    }
  }

  const onRefresh = async () => {
    setRefreshing(true)
    await fetchDashboardData()
    setRefreshing(false)
  }

  const quickActions = [
    {
      title: "Create Assignment",
      icon: "add-circle-outline",
      color: COLORS.primary,
      action: () => navigation.navigate("AdminPanel", { initialTab: 'assignments' }),
    },
    {
      title: "Manage Users",
      icon: "people-outline",
      color: COLORS.secondary,
      action: () => navigation.navigate("AdminPanel", { initialTab: 'users' }),
    },
    {
      title: "Reports",
      icon: "document-text-outline",
      color: COLORS.accent,
      action: () => navigation.navigate("Reports"),
    },
    {
      title: "Settings",
      icon: "settings-outline",
      color: COLORS.warning,
      action: () => navigation.navigate("AdminPanel", { initialTab: 'users' }),
    },
  ]

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={styles.header}>
        <Text style={styles.welcomeText}>Admin Dashboard</Text>
        <Text style={styles.roleText}>System Administrator</Text>
      </View>

      <View style={styles.statsContainer}>
        <View style={[styles.statCard, { backgroundColor: COLORS.primary }]}>
          <Text style={styles.statNumber}>{stats.totalUsers}</Text>
          <Text style={styles.statLabel}>Total Users</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: COLORS.secondary }]}>
          <Text style={styles.statNumber}>{stats.totalAssignments}</Text>
          <Text style={styles.statLabel}>Assignments</Text>
        </View>
      </View>

      <View style={styles.statsContainer}>
        <View style={[styles.statCard, { backgroundColor: COLORS.warning }]}>
          <Text style={styles.statNumber}>{stats.pendingInspections}</Text>
          <Text style={styles.statLabel}>Pending</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: COLORS.success }]}>
          <Text style={styles.statNumber}>{stats.completedInspections}</Text>
          <Text style={styles.statLabel}>Completed</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Quick Actions</Text>
      <View style={styles.quickActionsContainer}>
        {quickActions.map((action, index) => (
          <TouchableOpacity key={index} style={styles.quickActionCard} onPress={action.action}>
            <Ionicons name={action.icon} size={32} color={action.color} />
            <Text style={styles.quickActionText}>{action.title}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.sectionTitle}>Recent Activity</Text>
      {recentActivity.map((activity, idx) => (
        <Card key={activity._id || activity.id || idx} style={styles.activityCard}>
          <Card.Content>
            <View style={styles.activityHeader}>
              <Title style={styles.activityTitle}>Inspection Submitted</Title>
              <Text style={styles.activityTime}>
                {activity.submittedAt ? new Date(activity.submittedAt).toLocaleDateString() : "N/A"}
              </Text>
            </View>
            <Paragraph style={styles.activityDescription}>
              {activity.userName} submitted inspection for {activity.department} department
            </Paragraph>
            <View style={styles.activityStatus}>
              <View style={[styles.statusBadge, { backgroundColor: activity.deoStatus === 'reschedule_requested' ? COLORS.warning : COLORS.success }]}>
                <Text style={styles.statusText}>
                  {activity.deoStatus === 'reschedule_requested' ? 'RESCHEDULE REQ' : (activity.status || 'SUBMITTED').toUpperCase()}
                </Text>
              </View>
            </View>
          </Card.Content>
        </Card>
      ))}

      {recentActivity.length === 0 && (
        <View style={styles.emptyState}>
          <Ionicons name="document-outline" size={64} color={COLORS.gray} />
          <Text style={styles.emptyText}>No recent activity</Text>
          <Text style={styles.emptySubtext}>Activity will appear here as users submit inspections</Text>
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
    backgroundColor: COLORS.primary,
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
    paddingHorizontal: 20,
    paddingVertical: 10,
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
    marginTop: 20,
    marginBottom: 15,
  },
  quickActionsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 20,
    justifyContent: "space-between",
  },
  quickActionCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 20,
    alignItems: "center",
    width: "48%",
    marginBottom: 15,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  quickActionText: {
    fontSize: 14,
    fontWeight: "bold",
    color: COLORS.black,
    marginTop: 10,
    textAlign: "center",
  },
  activityCard: {
    marginHorizontal: 20,
    marginBottom: 15,
    borderRadius: 15,
    backgroundColor: '#FFFFFF',
    elevation: 4,
  },
  activityHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 5,
  },
  activityTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: COLORS.primary,
  },
  activityTime: {
    fontSize: 12,
    color: COLORS.gray,
  },
  activityDescription: {
    fontSize: 14,
    color: COLORS.gray,
    marginBottom: 10,
  },
  activityStatus: {
    alignItems: "flex-start",
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
    textAlign: "center",
  },
})

export default AdminDashboard
