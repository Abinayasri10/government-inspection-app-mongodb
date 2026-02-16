import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, Dimensions } from "react-native"
import { LinearGradient } from "expo-linear-gradient"
import { COLORS } from "../constants/colors"

const { width, height } = Dimensions.get("window")

const WelcomeScreen = ({ navigation }) => {
  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={[COLORS.primary, COLORS.secondary]} style={styles.gradient}>
        <View style={styles.content}>
          <View style={styles.logoContainer}>
            <View style={styles.logoCircle}>
              <Text style={styles.logoText}>🏛️</Text>
            </View>
            <Text style={styles.appTitle}>Government Inspection App</Text>
   
            <Text style={styles.subtitle}>Digital inspection solution for government departments</Text>
          </View>

         

          <TouchableOpacity style={styles.getStartedButton} onPress={() => navigation.navigate("DepartmentSelection")}>
            <Text style={styles.buttonText}>Get Started</Text>
          </TouchableOpacity>

          <Text style={styles.versionText}>Version 1.0.0</Text>
        </View>
      </LinearGradient>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 30,
  },
  logoContainer: {
    alignItems: "center",
    marginBottom: 60,
  },
  logoCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: COLORS.white,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
  },
  logoText: {
    fontSize: 50,
  },
  appTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: COLORS.white,
    textAlign: "center",
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.background,
    textAlign: "center",
    lineHeight: 22,
  },
  featuresContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-around",
    width: "100%",
    marginBottom: 50,
  },
  feature: {
    alignItems: "center",
    width: "45%",
    marginBottom: 20,
  },
  featureIcon: {
    fontSize: 30,
    marginBottom: 8,
  },
  featureText: {
    color: COLORS.white,
    fontSize: 14,
    textAlign: "center",
  },
  getStartedButton: {
    backgroundColor: COLORS.accent,
    paddingHorizontal: 50,
    paddingVertical: 15,
    borderRadius: 25,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  buttonText: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: "bold",
  },
  versionText: {
    color: COLORS.background,
    fontSize: 12,
    marginTop: 30,
  },
})

export default WelcomeScreen
