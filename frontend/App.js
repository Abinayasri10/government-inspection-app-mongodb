import { NavigationContainer } from "@react-navigation/native"
import { createStackNavigator } from "@react-navigation/stack"
import { StatusBar } from "expo-status-bar"
import { Provider as PaperProvider } from "react-native-paper"
import { AuthProvider } from "./src/context/AuthContext"
import { COLORS } from "./src/constants/colors"

// Screens
import WelcomeScreen from "./src/screens/WelcomeScreen"
import DepartmentSelectionScreen from "./src/screens/DepartmentSelectionScreen"
import EnhancedLoginScreen from "./src/screens/LoginScreen"
import DashboardNavigator from "./src/navigation/DashboardNavigator"
import AdminPanel from "./src/screens/AdminPanel"
import FormBuilderScreen from "./src/screens/FormBuilderScreen"

const Stack = createStackNavigator()

const theme = {
  colors: {
    primary: COLORS.primary,
    accent: COLORS.accent,
    background: COLORS.background,
    surface: COLORS.white,
    text: COLORS.black,
  },
}

export default function App() {
  return (
    <PaperProvider theme={theme}>
      <AuthProvider>
        <NavigationContainer>
          <StatusBar style="light" />
          <Stack.Navigator
            initialRouteName="Welcome"
            screenOptions={{
              headerStyle: {
                backgroundColor: COLORS.primary,
              },
              headerTintColor: COLORS.white,
              headerTitleStyle: {
                fontWeight: "bold",
              },
            }}
          >
            <Stack.Screen name="Welcome" component={WelcomeScreen} options={{ headerShown: false }} />
            <Stack.Screen
              name="DepartmentSelection"
              component={DepartmentSelectionScreen}
              options={{ title: "Select Department" }}
            />
            <Stack.Screen
              name="Login"
              component={EnhancedLoginScreen}
              options={({ route }) => ({
                title: `${route.params?.departmentName || "Department"} Login`,
              })}
            />
            <Stack.Screen name="Dashboard" component={DashboardNavigator} options={{ headerShown: false }} />
            <Stack.Screen name="AdminPanel" component={AdminPanel} options={{ title: "Admin Panel" }} />
            <Stack.Screen name="FormBuilder" component={FormBuilderScreen} options={{ title: "Form Builder" }} />
          </Stack.Navigator>
        </NavigationContainer>
      </AuthProvider>
    </PaperProvider>
  )
}
