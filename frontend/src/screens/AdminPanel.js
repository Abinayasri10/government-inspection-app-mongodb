"use client"

import { useState, useEffect } from "react"
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Modal, TextInput, Platform } from "react-native"
import { Picker } from "@react-native-picker/picker"
import { Ionicons } from "@expo/vector-icons"
import DateTimePicker from "@react-native-community/datetimepicker"
import { COLORS } from "../constants/colors"
import api from "../services/api"

const AdminPanel = () => {
  const [activeTab, setActiveTab] = useState("assignments")
  const [users, setUsers] = useState([])
  const [schools, setSchools] = useState([])
  const [assignments, setAssignments] = useState([])
  const [questions, setQuestions] = useState([])
  const [showAssignmentModal, setShowAssignmentModal] = useState(false)
  const [showQuestionModal, setShowQuestionModal] = useState(false)

  // Date Picker State
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [date, setDate] = useState(new Date())

  const [newAssignment, setNewAssignment] = useState({
    department: "education",
    schoolId: "",
    assignedTo: "",
    deadline: "",
    specialInstructions: "",
    priority: "medium",
  })

  const [questionData, setQuestionData] = useState({
    text: "",
    type: "yesno",
    required: false,
    section: "infrastructure",
    schoolLevel: "primary",
  })

  useEffect(() => {
    fetchUsers()
    fetchSchools()
    fetchAssignments()
    fetchQuestions()
  }, [])

  const fetchUsers = async () => {
    try {
      const response = await api.get("/users?department=education")
      setUsers(response.data || [])
    } catch (error) {
      console.error("Error fetching users:", error)
    }
  }

  const fetchSchools = async () => {
    try {
      const response = await api.get("/schools")
      setSchools(response.data || [])
    } catch (error) {
      console.error("Error fetching schools:", error)
    }
  }

  const fetchAssignments = async () => {
    try {
      const response = await api.get("/assignments")
      setAssignments(response.data || [])
    } catch (error) {
      console.error("Error fetching assignments:", error)
    }
  }

  const fetchQuestions = async () => {
    try {
      const response = await api.get("/questions?department=education")
      setQuestions(response.data || [])
    } catch (error) {
      console.error("Error fetching questions:", error)
    }
  }

  const onDateChange = (event, selectedDate) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setDate(selectedDate);
      setNewAssignment(prev => ({
        ...prev,
        deadline: selectedDate.toISOString().split('T')[0]
      }));
    }
  };

  const createAssignment = async () => {
    console.log("Creating assignment with:", newAssignment);

    if (!newAssignment.schoolId || !newAssignment.assignedTo || !newAssignment.deadline) {
      Alert.alert("Error", "Please fill all required fields")
      return
    }

    try {
      // Correctly identifying the school ID (handling _id vs id)
      const selectedSchoolData = schools.find((s) => s.id === newAssignment.schoolId || s._id === newAssignment.schoolId)

      if (!selectedSchoolData) {
        Alert.alert("Error", "Selected school not found");
        return;
      }

      const assignmentData = {
        ...newAssignment,
        locationName: selectedSchoolData.name, // Ensure location name is passed if needed
        address: selectedSchoolData.address
      }

      await api.post("/assignments", assignmentData)

      Alert.alert("Success", "Assignment created successfully")
      setShowAssignmentModal(false)
      resetAssignmentData()
      fetchAssignments()
    } catch (error) {
      console.error("Error creating assignment:", error)
      Alert.alert("Error", "Failed to create assignment")
    }
  }

  const addQuestion = async () => {
    if (!questionData.text) {
      Alert.alert("Error", "Please enter question text")
      return
    }

    try {
      await api.post("/questions", {
        ...questionData,
        department: "education",
        isDefault: false,
      })

      Alert.alert("Success", "Question added successfully")
      setShowQuestionModal(false)
      resetQuestionData()
      fetchQuestions()
    } catch (error) {
      console.error("Error adding question:", error)
      Alert.alert("Error", "Failed to add question")
    }
  }

  const deleteQuestion = async (questionId) => {
    Alert.alert("Delete Question", "Are you sure you want to delete this question?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await api.delete(`/questions/${questionId}`)
            Alert.alert("Success", "Question deleted successfully")
            fetchQuestions()
          } catch (error) {
            console.error("Error deleting question:", error)
            Alert.alert("Error", "Failed to delete question")
          }
        },
      },
    ])
  }

  const deleteAssignment = async (assignmentId) => {
    Alert.alert("Delete Assignment", "Are you sure you want to delete this assignment?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await api.delete(`/assignments/${assignmentId}`)
            Alert.alert("Success", "Assignment deleted successfully")
            fetchAssignments() // refresh list
          } catch (error) {
            console.error("Error deleting assignment:", error)
            Alert.alert("Error", "Failed to delete assignment")
          }
        },
      },
    ])
  }

  const resetAssignmentData = () => {
    setNewAssignment({
      department: "education",
      schoolId: "",
      assignedTo: "",
      deadline: "",
      specialInstructions: "",
      priority: "medium",
    })
    setDate(new Date());
  }

  const resetQuestionData = () => {
    setQuestionData({
      text: "",
      type: "yesno",
      required: false,
      section: "infrastructure",
      schoolLevel: "primary",
    })
  }

  const renderAssignments = () => (
    <View style={styles.tabContent}>
      <TouchableOpacity style={styles.addButton} onPress={() => setShowAssignmentModal(true)}>
        <Ionicons name="add" size={20} color={COLORS.white} />
        <Text style={styles.addButtonText}>Create New Assignment</Text>
      </TouchableOpacity>

      <ScrollView style={styles.assignmentsList}>
        {assignments.length === 0 ? (
          <Text style={styles.emptyText}>No assignments found.</Text>
        ) : assignments.map((assignment, index) => {
          // Fallback key if id is missing, though it shouldn't be
          const uniqueKey = assignment.id || assignment._id || `assign-${index}`;
          // Correctly resolve User object (handle populated vs ID string)
          const assignedUserObj = typeof assignment.assignedTo === 'object' && assignment.assignedTo !== null
            ? assignment.assignedTo
            : users.find((u) => u.uid === assignment.assignedTo || u._id === assignment.assignedTo);

          // Correctly resolve School object (handle populated vs ID string)
          const schoolObj = typeof assignment.schoolId === 'object' && assignment.schoolId !== null
            ? assignment.schoolId
            : schools.find((s) => s.id === assignment.schoolId || s._id === assignment.schoolId);

          const schoolName = schoolObj?.name || assignment.locationName || "Unknown School";
          const schoolAddress = schoolObj?.address || assignment.address || "No Address";
          const assignedUserName = assignedUserObj?.name || "Unknown";

          let currentStatus = assignment.status || "pending"
          let statusColor = COLORS.warning

          if (assignment.finalStatus === "completed" && assignment.ceoReviewed) {
            currentStatus = "completed"
            statusColor = COLORS.success
          } else if (assignment.status === "completed") {
            currentStatus = "under review"
            statusColor = COLORS.secondary
          }

          return (
            <View key={uniqueKey} style={styles.assignmentCard}>
              <View style={styles.cardHeader}>
                <Text style={styles.assignmentTitle}>{schoolName}</Text>
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <TouchableOpacity
                    style={styles.deleteAssignmentButton}
                    onPress={() => deleteAssignment(assignment.id || assignment._id)}
                  >
                    <Ionicons name="trash-outline" size={18} color={COLORS.error} />
                  </TouchableOpacity>
                  <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
                    <Text style={styles.statusText}>{currentStatus.toUpperCase()}</Text>
                  </View>
                </View>
              </View>

              <View style={styles.assignmentDetails}>
                <View style={styles.detailRow}>
                  <Ionicons name="location-outline" size={16} color={COLORS.gray} />
                  <Text style={styles.detailText}>{schoolAddress}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Ionicons name="person-outline" size={16} color={COLORS.gray} />
                  <Text style={styles.detailText}>Assigned to: {assignedUserName}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Ionicons name="calendar-outline" size={16} color={COLORS.gray} />
                  <Text style={styles.detailText}>Deadline: {assignment.deadline ? new Date(assignment.deadline).toLocaleDateString() : "N/A"}</Text>
                </View>
              </View>

              {assignment.specialInstructions ? (
                <View style={styles.instructionsContainer}>
                  <Text style={styles.instructionsLabel}>Special Instructions:</Text>
                  <Text style={styles.instructionsText}>{assignment.specialInstructions}</Text>
                </View>
              ) : null}
            </View>
          )
        })}
      </ScrollView>
    </View>
  )

  const renderQuestions = () => {
    const groupedQuestions = questions.reduce((acc, question) => {
      const key = `${question.schoolLevel}_${question.section}`
      if (!acc[key]) {
        acc[key] = []
      }
      acc[key].push(question)
      return acc
    }, {})

    return (
      <View style={styles.tabContent}>
        <TouchableOpacity style={styles.addButton} onPress={() => setShowQuestionModal(true)}>
          <Ionicons name="add" size={20} color={COLORS.white} />
          <Text style={styles.addButtonText}>Add New Question</Text>
        </TouchableOpacity>

        <ScrollView style={styles.questionsList}>
          {Object.entries(groupedQuestions).length === 0 ? (
            <Text style={styles.emptyText}>No questions found.</Text>
          ) : Object.entries(groupedQuestions).map(([key, questionGroup]) => {
            const [level, section] = key.split("_")
            return (
              <View key={key} style={styles.questionGroup}>
                <Text style={styles.questionGroupTitle}>
                  {level.toUpperCase()} - {section.toUpperCase()}
                </Text>
                {questionGroup.map((question, index) => (
                  <View key={question.id || question._id || `q-${index}`} style={styles.questionCard}>
                    <View style={styles.questionHeader}>
                      <Text style={styles.questionText}>{question.text}</Text>
                      <View style={styles.questionActions}>
                        <TouchableOpacity
                          style={styles.deleteQuestionButton}
                          onPress={() => deleteQuestion(question.id || question._id)}
                        >
                          <Ionicons name="trash-outline" size={16} color={COLORS.error} />
                        </TouchableOpacity>
                      </View>
                    </View>
                    <View style={styles.questionMeta}>
                      <Text style={styles.questionType}>Type: {question.type}</Text>
                      <Text style={styles.questionRequired}>{question.required ? "Required" : "Optional"}</Text>
                      {question.isDefault && <Text style={styles.defaultBadge}>DEFAULT</Text>}
                    </View>
                  </View>
                ))}
              </View>
            )
          })}
        </ScrollView>
      </View>
    )
  }

  const renderSchools = () => (
    <View style={styles.tabContent}>
      <ScrollView style={styles.schoolsList}>
        {schools.length === 0 ? (
          <Text style={styles.emptyText}>No schools found. Please add schools via backend/seed.</Text>
        ) : schools.map((school, index) => (
          <View key={school.id || school._id || `school-${index}`} style={styles.schoolCard}>
            <View style={styles.schoolHeader}>
              <Text style={styles.schoolName}>{school.name}</Text>
              <View style={[styles.levelBadge, { backgroundColor: COLORS.accent }]}>
                <Text style={styles.levelText}>{school.level ? school.level.toUpperCase() : "N/A"}</Text>
              </View>
            </View>

            <Text style={styles.schoolAddress}>{school.address}</Text>

            <View style={styles.schoolStats}>
              <View style={styles.statItem}>
                <Ionicons name="people-outline" size={16} color={COLORS.primary} />
                <Text style={styles.statText}>{school.totalStudents} Students</Text>
              </View>
              <View style={styles.statItem}>
                <Ionicons name="person-outline" size={16} color={COLORS.primary} />
                <Text style={styles.statText}>{school.totalTeachers} Teachers</Text>
              </View>
              <View style={styles.statItem}>
                <Ionicons name="business-outline" size={16} color={COLORS.primary} />
                <Text style={styles.statText}>{school.infrastructure?.totalClassrooms || 0} Classrooms</Text>
              </View>
            </View>

            <View style={styles.schoolDetails}>
              <Text style={styles.principalName}>Principal: {school.principalName}</Text>
              <Text style={styles.lastInspection}>
                Last Inspection: {school.lastInspectionDate ? new Date(school.lastInspectionDate).toLocaleDateString() : "Never"}
              </Text>
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  )

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Admin Panel</Text>
        <Text style={styles.subtitle}>Education Department Management</Text>
      </View>

      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === "assignments" && styles.activeTab]}
          onPress={() => setActiveTab("assignments")}
        >
          <Text style={[styles.tabText, activeTab === "assignments" && styles.activeTabText]}>Assignments</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === "schools" && styles.activeTab]}
          onPress={() => setActiveTab("schools")}
        >
          <Text style={[styles.tabText, activeTab === "schools" && styles.activeTabText]}>Schools</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === "questions" && styles.activeTab]}
          onPress={() => setActiveTab("questions")}
        >
          <Text style={[styles.tabText, activeTab === "questions" && styles.activeTabText]}>Questions</Text>
        </TouchableOpacity>
      </View>

      {activeTab === "assignments" && renderAssignments()}
      {activeTab === "schools" && renderSchools()}
      {activeTab === "questions" && renderQuestions()}

      {/* Assignment Modal */}
      <Modal visible={showAssignmentModal} animationType="slide" transparent={true}>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Create New Assignment</Text>

            <ScrollView style={styles.modalBody}>
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Select School *</Text>
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={newAssignment.schoolId}
                    onValueChange={(value) => setNewAssignment((prev) => ({ ...prev, schoolId: value }))}
                  >
                    <Picker.Item label="Select School..." value="" />
                    {schools.map((school, index) => (
                      <Picker.Item
                        key={school.id || school._id || `picker-s-${index}`}
                        label={`${school.name} (${school.level})`}
                        value={school.id || school._id}
                      />
                    ))}
                  </Picker>
                </View>
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Assign To *</Text>
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={newAssignment.assignedTo}
                    onValueChange={(value) => setNewAssignment((prev) => ({ ...prev, assignedTo: value }))}
                  >
                    <Picker.Item label="Select BEO..." value="" />
                    {users
                      .filter((user) => user.role === "beo")
                      .map((user, index) => (
                        <Picker.Item
                          key={user.id || user.uid || user._id || `picker-u-${index}`}
                          label={user.name}
                          value={user.uid || user._id}
                        />
                      ))}
                  </Picker>
                </View>
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Deadline *</Text>
                <TouchableOpacity onPress={() => setShowDatePicker(true)} style={styles.datePickerButton}>
                  <Text style={styles.datePickerText}>{newAssignment.deadline || "Select Date"}</Text>
                  <Ionicons name="calendar-outline" size={20} color={COLORS.gray} />
                </TouchableOpacity>
                {showDatePicker && (
                  <DateTimePicker
                    testID="dateTimePicker"
                    value={date}
                    mode="date"
                    display="default"
                    onChange={onDateChange}
                  />
                )}
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Priority</Text>
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={newAssignment.priority}
                    onValueChange={(value) => setNewAssignment((prev) => ({ ...prev, priority: value }))}
                  >
                    <Picker.Item label="Low" value="low" />
                    <Picker.Item label="Medium" value="medium" />
                    <Picker.Item label="High" value="high" />
                  </Picker>
                </View>
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Special Instructions</Text>
                <TextInput
                  style={[styles.textInput, styles.textArea]}
                  placeholder="Any special instructions..."
                  value={newAssignment.specialInstructions}
                  onChangeText={(text) => setNewAssignment((prev) => ({ ...prev, specialInstructions: text }))}
                  multiline
                  numberOfLines={3}
                />
              </View>
            </ScrollView>

            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setShowAssignmentModal(false)}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.createButton} onPress={createAssignment}>
                <Text style={styles.createButtonText}>Create</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Question Modal */}
      <Modal visible={showQuestionModal} animationType="slide" transparent={true}>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add New Question</Text>

            <ScrollView style={styles.modalBody}>
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Question Text *</Text>
                <TextInput
                  style={[styles.textInput, styles.textArea]}
                  placeholder="Enter question text"
                  value={questionData.text}
                  onChangeText={(text) => setQuestionData((prev) => ({ ...prev, text }))}
                  multiline
                  numberOfLines={2}
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>School Level *</Text>
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={questionData.schoolLevel}
                    onValueChange={(value) => setQuestionData((prev) => ({ ...prev, schoolLevel: value }))}
                  >
                    <Picker.Item label="Primary" value="primary" />
                    <Picker.Item label="Secondary" value="secondary" />
                    <Picker.Item label="Higher Secondary" value="higher_secondary" />
                  </Picker>
                </View>
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Question Type *</Text>
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={questionData.type}
                    onValueChange={(value) => setQuestionData((prev) => ({ ...prev, type: value }))}
                  >
                    <Picker.Item label="Yes/No" value="yesno" />
                    <Picker.Item label="Text Input" value="text" />
                    <Picker.Item label="Number" value="number" />
                  </Picker>
                </View>
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Section *</Text>
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={questionData.section}
                    onValueChange={(value) => setQuestionData((prev) => ({ ...prev, section: value }))}
                  >
                    <Picker.Item label="Infrastructure" value="infrastructure" />
                    <Picker.Item label="Teaching" value="teaching" />
                    <Picker.Item label="Welfare" value="welfare" />
                    <Picker.Item label="Observations" value="observations" />
                  </Picker>
                </View>
              </View>

              <View style={styles.checkboxContainer}>
                <TouchableOpacity
                  style={styles.checkbox}
                  onPress={() => setQuestionData((prev) => ({ ...prev, required: !prev.required }))}
                >
                  <Ionicons
                    name={questionData.required ? "checkbox" : "checkbox-outline"}
                    size={20}
                    color={COLORS.primary}
                  />
                  <Text style={styles.checkboxLabel}>Required Question</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>

            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setShowQuestionModal(false)}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.createButton} onPress={addQuestion}>
                <Text style={styles.createButtonText}>Add Question</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    paddingTop: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: COLORS.white,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.background,
    marginTop: 5,
  },
  tabContainer: {
    flexDirection: "row",
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
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
    fontSize: 14,
    color: COLORS.gray,
  },
  activeTabText: {
    color: COLORS.primary,
    fontWeight: "bold",
  },
  tabContent: {
    flex: 1,
    padding: 20,
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.accent,
    borderRadius: 8,
    padding: 15,
    marginBottom: 20,
    justifyContent: "center",
  },
  addButtonText: {
    color: COLORS.white,
    fontWeight: "bold",
    marginLeft: 8,
  },
  assignmentsList: {
    flex: 1,
  },
  assignmentCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 10,
  },
  assignmentTitle: {
    fontSize: 16,
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
    fontSize: 10,
    color: COLORS.white,
    fontWeight: "bold",
  },
  assignmentDetails: {
    marginBottom: 10,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 5,
  },
  detailText: {
    fontSize: 12,
    color: COLORS.gray,
    marginLeft: 8,
    flex: 1,
  },
  instructionsContainer: {
    backgroundColor: COLORS.background,
    padding: 10,
    borderRadius: 8,
    marginBottom: 10,
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
  schoolsList: {
    flex: 1,
  },
  schoolCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  schoolHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  schoolName: {
    fontSize: 16,
    fontWeight: "bold",
    color: COLORS.primary,
    flex: 1,
  },
  levelBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  levelText: {
    fontSize: 10,
    color: COLORS.white,
    fontWeight: "bold",
  },
  schoolAddress: {
    fontSize: 12,
    color: COLORS.gray,
    marginBottom: 10,
  },
  schoolStats: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  statItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  statText: {
    fontSize: 11,
    color: COLORS.gray,
    marginLeft: 4,
  },
  schoolDetails: {
    borderTopWidth: 1,
    borderTopColor: COLORS.lightGray,
    marginTop: 10,
    paddingTop: 10,
  },
  principalName: {
    fontSize: 12,
    color: COLORS.primary,
    marginBottom: 2,
  },
  lastInspection: {
    fontSize: 11,
    color: COLORS.gray,
    fontStyle: "italic",
  },
  questionsList: {
    flex: 1,
  },
  questionGroup: {
    marginBottom: 20,
  },
  questionGroupTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: COLORS.gray,
    marginBottom: 10,
    backgroundColor: COLORS.lightGray,
    padding: 8,
    borderRadius: 5,
  },
  questionCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.secondary,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2.22,
    elevation: 3,
  },
  questionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  questionText: {
    fontSize: 14,
    color: COLORS.text,
    flex: 1,
    marginRight: 10,
    fontWeight: "500",
  },
  questionActions: {
    flexDirection: "row",
  },
  deleteQuestionButton: {
    padding: 5,
  },
  questionMeta: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 5,
  },
  questionType: {
    fontSize: 10,
    color: COLORS.white,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: 8,
  },
  questionRequired: {
    fontSize: 10,
    color: COLORS.white,
    backgroundColor: COLORS.warning,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: 8,
  },
  defaultBadge: {
    fontSize: 10,
    color: COLORS.white,
    backgroundColor: COLORS.gray,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    padding: 20,
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: 20,
    maxHeight: "80%",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: COLORS.primary,
    marginBottom: 20,
    textAlign: "center",
  },
  modalBody: {
    maxHeight: 400,
  },
  inputContainer: {
    marginBottom: 15,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.primary,
    marginBottom: 8,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: COLORS.gray,
    borderRadius: 8,
    backgroundColor: COLORS.white,
    overflow: "hidden", // Important for border radius
  },
  textInput: {
    borderWidth: 1,
    borderColor: COLORS.gray,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    backgroundColor: COLORS.white,
  },
  textArea: {
    height: 80,
    textAlignVertical: "top",
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 20,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: COLORS.background,
    padding: 15,
    borderRadius: 8,
    marginRight: 10,
    alignItems: "center",
  },
  cancelButtonText: {
    color: COLORS.gray,
    fontWeight: "bold",
  },
  createButton: {
    flex: 1,
    backgroundColor: COLORS.primary,
    padding: 15,
    borderRadius: 8,
    marginLeft: 10,
    alignItems: "center",
  },
  createButtonText: {
    color: COLORS.white,
    fontWeight: "bold",
  },
  checkboxContainer: {
    marginBottom: 20,
  },
  checkbox: {
    flexDirection: "row",
    alignItems: "center",
  },
  checkboxLabel: {
    marginLeft: 10,
    color: COLORS.text,
    fontSize: 14,
  },
  emptyText: {
    textAlign: 'center',
    margin: 20,
    color: COLORS.gray,
    fontSize: 16
  },
  datePickerButton: {
    borderWidth: 1,
    borderColor: COLORS.gray,
    borderRadius: 8,
    padding: 12,
    backgroundColor: COLORS.white,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  datePickerText: {
    fontSize: 14,
    color: COLORS.text,
  }
})

export default AdminPanel
