import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, ScrollView, Dimensions } from "react-native"
import { COLORS } from "../constants/colors"
import { DEPARTMENTS } from "../constants/departments"

const { width } = Dimensions.get("window")

const DepartmentSelectionScreen = ({ navigation }) => {
  const handleDepartmentSelect = (department) => {
    navigation.navigate("Login", {
      departmentId: department.id,
      departmentName: department.name,
      departmentRoles: department.roles,
    })
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        contentContainerStyle={styles.scrollContent} 
        showsVerticalScrollIndicator={true} 
      >
        <Text style={styles.title}>Select Your Department</Text>
        <Text style={styles.subtitle}>Choose the department you belong to</Text>

        <View style={styles.departmentsGrid}>
          {Object.values(DEPARTMENTS).map((department) => (
            <TouchableOpacity
              key={department.id}
              style={[styles.departmentCard, { borderLeftColor: department.color }]}
              onPress={() => handleDepartmentSelect(department)}
            >
              <View style={styles.cardHeader}>
                <Text style={styles.departmentIcon}>{department.icon}</Text>
                <Text style={styles.departmentName}>{department.name}</Text>
              </View>
              <Text style={styles.departmentDescription}>{department.description}</Text>
              <View style={styles.rolesContainer}>
                <Text style={styles.rolesLabel}>Available Roles:</Text>
                {department.roles.slice(0, 2).map((role) => (
                  <Text key={role.id} style={styles.roleText}>
                    • {role.name}
                  </Text>
                ))}
                {department.roles.length > 2 && (
                  <Text style={styles.moreRoles}>+{department.roles.length - 2} more</Text>
                )}
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    
  },
  scrollContent: {
    flexGrow: 1, // ✅ important for web scrolling
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: COLORS.primary,
    textAlign: "center",
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.gray,
    textAlign: "center",
    marginBottom: 30,
  },
  departmentsGrid: {
    gap: 15,
  },
  departmentCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 20,
    borderLeftWidth: 4,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  departmentIcon: {
    fontSize: 30,
    marginRight: 15,
  },
  departmentName: {
    fontSize: 18,
    fontWeight: "bold",
    color: COLORS.primary,
    flex: 1,
  },
  departmentDescription: {
    fontSize: 14,
    color: COLORS.gray,
    marginBottom: 15,
    lineHeight: 20,
  },
  rolesContainer: {
    backgroundColor: COLORS.background,
    padding: 10,
    borderRadius: 8,
  },
  rolesLabel: {
    fontSize: 12,
    fontWeight: "bold",
    color: COLORS.primary,
    marginBottom: 5,
  },
  roleText: {
    fontSize: 12,
    color: COLORS.gray,
    marginBottom: 2,
  },
  moreRoles: {
    fontSize: 12,
    color: COLORS.secondary,
    fontStyle: "italic",
  },
})

export default DepartmentSelectionScreen
