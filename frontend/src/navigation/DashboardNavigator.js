import { createBottomTabNavigator } from "@react-navigation/bottom-tabs"
import { createStackNavigator } from "@react-navigation/stack"
import { Ionicons } from "@expo/vector-icons"
import { COLORS } from "../constants/colors"
import { TouchableOpacity } from "react-native"

// Dashboard screens
import EducationDashboard from "../screens/dashboards/EducationDashboard"
import HealthCareDashboard from "../screens/dashboards/HealthCareDashboard"
import FoodDashboard from "../screens/dashboards/FoodDashboard"
import ConstructionDashboard from "../screens/dashboards/ConstructionDashboard"
import AdminDashboard from "../screens/dashboards/AdminDashboard"
import DEODashboard from "../screens/dashboards/DEODashboard"
import CEODashboard from "../screens/dashboards/CEODashboard"
import ProfileScreen from "../screens/ProfileScreen"
import EnhancedBEOInspectionForm from "../screens/EnhancedBEOInspectionForm"
import HealthcareInspectionForm from "../screens/HealthcareInspectionForm"

import InspectionsListScreen from "../screens/InspectionsListScreen"
import ReportsScreen from "../screens/ReportsScreen"
import FormBuilderScreen from "../screens/FormBuilderScreen"

const Tab = createBottomTabNavigator()
const Stack = createStackNavigator()

// Stack navigator for inspection forms
// Stack navigator for inspection forms
const InspectionStack = () => (
  <Stack.Navigator>
    <Stack.Screen name="InspectionsList" component={InspectionsListScreen} options={{ headerShown: false }} />
    <Stack.Screen name="InspectionForm" component={EnhancedBEOInspectionForm} options={{ headerShown: false }} />
  </Stack.Navigator>
)

const HealthcareInspectionStack = () => (
  <Stack.Navigator>
    <Stack.Screen
      name="HealthcareInspectionForm"
      component={HealthcareInspectionForm}
      options={{ headerShown: false }}
    />
  </Stack.Navigator>
)

// Stack navigator for reports
const ReportsStack = () => (
  <Stack.Navigator>
    <Stack.Screen name="ReportsList" component={ReportsScreen} options={{ headerShown: false }} />
  </Stack.Navigator>
)

// Stack navigator for admin features
const AdminStack = () => (
  <Stack.Navigator>
    <Stack.Screen name="AdminHome" component={AdminDashboard} options={{ headerShown: false }} />
    <Stack.Screen name="FormBuilder" component={FormBuilderScreen} options={{ title: "Form Builder" }} />
  </Stack.Navigator>
)

const DashboardNavigator = ({ route }) => {
  const { department, role, userData } = route.params

  const getDashboardComponent = () => {
    if (department === "education") {
      switch (role) {
        case "beo":
          return EducationDashboard
        case "deo":
          return DEODashboard
        case "ceo":
          return CEODashboard
        default:
          return EducationDashboard
      }
    }

    switch (department) {
      case "health":
        return HealthCareDashboard
      case "food":
        return FoodDashboard
      case "construction":
        return ConstructionDashboard
      case "admin":
        return AdminStack
      default:
        return EducationDashboard
    }
  }

  const shouldShowInspectionTab = () => {
    return (
      (department === "education" && role === "beo") ||
      (department === "health" && (role === "officer" || role === "bmo"))
    )
  }

  const shouldShowReportsTab = () => {
    return true // All users can view reports
  }

  const DashboardComponent = getDashboardComponent()

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName

          if (route.name === "Home") {
            iconName = focused ? "home" : "home-outline"
          } else if (route.name === "Inspections") {
            iconName = focused ? "clipboard" : "clipboard-outline"
          } else if (route.name === "HealthcareInspections") {
            iconName = focused ? "medical" : "medical-outline"
          } else if (route.name === "Reports") {
            iconName = focused ? "document-text" : "document-text-outline"
          } else if (route.name === "Profile") {
            iconName = focused ? "person" : "person-outline"
          }

          return <Ionicons name={iconName} size={size} color={color} />
        },
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.gray,
        tabBarStyle: {
          backgroundColor: COLORS.white,
          borderTopColor: COLORS.lightGray,
        },
        headerStyle: {
          backgroundColor: COLORS.primary,
        },
        headerTintColor: COLORS.white,
        headerTitleStyle: {
          fontWeight: "bold",
        },
        tabBarButton: (props) => {
          return <TouchableOpacity {...props} />
        },
      })}
      backBehavior="none"
    >
      <Tab.Screen name="Home" options={{ title: "Dashboard" }}>
        {(props) => <DashboardComponent {...props} userData={userData} />}
      </Tab.Screen>

      {shouldShowInspectionTab() && department === "education" && (
        <Tab.Screen name="Inspections" options={{ title: "Inspections" }}>
          {(props) => <InspectionStack {...props} userData={userData} />}
        </Tab.Screen>
      )}

      {shouldShowInspectionTab() && department === "health" && (
        <Tab.Screen name="HealthcareInspections" options={{ title: "Healthcare Inspections" }}>
          {(props) => <HealthcareInspectionStack {...props} userData={userData} />}
        </Tab.Screen>
      )}

      {shouldShowReportsTab() && (
        <Tab.Screen name="Reports" options={{ title: "Reports" }}>
          {(props) => <ReportsStack {...props} userData={userData} />}
        </Tab.Screen>
      )}

      <Tab.Screen name="Profile" options={{ title: "Profile" }}>
        {(props) => <ProfileScreen {...props} userData={userData} />}
      </Tab.Screen>
    </Tab.Navigator>
  )
}

export default DashboardNavigator
