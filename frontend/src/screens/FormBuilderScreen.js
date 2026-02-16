import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import { COLORS } from '../constants/colors';
import { DEPARTMENTS } from '../constants/departments';
import api from '../services/api';

const FormBuilderScreen = ({ navigation }) => {
  const [forms, setForms] = useState([]);
  const [showFormModal, setShowFormModal] = useState(false);
  const [showQuestionModal, setShowQuestionModal] = useState(false);
  const [selectedForm, setSelectedForm] = useState(null);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    department: '',
    schoolLevel: '',
    description: '',
    version: 1,
    active: true,
  });

  const [questionData, setQuestionData] = useState({
    text: '',
    type: 'yesno',
    required: false,
    section: 'infrastructure',
    placeholder: '',
    options: [],
  });

  const [currentFormQuestions, setCurrentFormQuestions] = useState([]);

  const questionTypes = [
    { value: 'yesno', label: 'Yes/No Question' },
    { value: 'text', label: 'Text Input' },
    { value: 'number', label: 'Number Input' },
    { value: 'multipleChoice', label: 'Multiple Choice' },
    { value: 'photo', label: 'Photo Upload' },
    { value: 'date', label: 'Date Picker' },
  ];

  const sections = [
    { value: 'infrastructure', label: 'Infrastructure' },
    { value: 'teaching', label: 'Teaching & Learning' },
    { value: 'welfare', label: 'Student Welfare' },
    { value: 'safety', label: 'Safety & Hygiene' },
    { value: 'administration', label: 'Administration' },
  ];

  const schoolLevels = [
    { value: 'primary', label: 'Primary School' },
    { value: 'secondary', label: 'Secondary School' },
    { value: 'higher_secondary', label: 'Higher Secondary School' },
  ];

  useEffect(() => {
    fetchForms();
  }, []);

  const fetchForms = async () => {
    try {
      setLoading(true);
      const response = await api.get('/forms');
      setForms(response.data);
    } catch (error) {
      console.error('Error fetching forms:', error);
      Alert.alert('Error', 'Failed to fetch forms');
    } finally {
      setLoading(false);
    }
  };

  const fetchFormQuestions = async (formId) => {
    try {
      const q = query(
        collection(db, 'form_questions'),
        where('formId', '==', formId)
      );

      const querySnapshot = await getDocs(q);
      const questions = [];

      querySnapshot.forEach((doc) => {
        questions.push({
          id: doc.id,
          ...doc.data(),
        });
      });

      setCurrentFormQuestions(questions);
    } catch (error) {
      console.error('Error fetching form questions:', error);
    }
  };

  const createForm = async () => {
    if (!formData.title || !formData.department || !formData.schoolLevel) {
      Alert.alert('Error', 'Please fill all required fields');
      return;
    }

    try {
      const newForm = {
        ...formData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        questionCount: 0,
      };

      const docRef = await addDoc(collection(db, 'inspection_forms'), newForm);

      Alert.alert('Success', 'Form created successfully');
      setShowFormModal(false);
      resetFormData();
      fetchForms();
    } catch (error) {
      console.error('Error creating form:', error);
      Alert.alert('Error', 'Failed to create form');
    }
  };

  const addQuestion = async () => {
    if (!questionData.text || !selectedForm) {
      Alert.alert('Error', 'Please fill all required fields');
      return;
    }

    try {
      const newQuestion = {
        ...questionData,
        formId: selectedForm.id,
        createdAt: new Date().toISOString(),
        order: currentFormQuestions.length + 1,
      };

      await addDoc(collection(db, 'form_questions'), newQuestion);

      // Update form question count
      await updateDoc(doc(db, 'inspection_forms', selectedForm.id), {
        questionCount: currentFormQuestions.length + 1,
        updatedAt: new Date().toISOString(),
      });

      Alert.alert('Success', 'Question added successfully');
      setShowQuestionModal(false);
      resetQuestionData();
      fetchFormQuestions(selectedForm.id);
      fetchForms();
    } catch (error) {
      console.error('Error adding question:', error);
      Alert.alert('Error', 'Failed to add question');
    }
  };

  const deleteForm = async (formId) => {
    Alert.alert(
      'Delete Form',
      'Are you sure you want to delete this form? This will also delete all associated questions.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              // Delete form questions first
              const q = query(
                collection(db, 'form_questions'),
                where('formId', '==', formId)
              );

              const querySnapshot = await getDocs(q);
              const deletePromises = [];

              querySnapshot.forEach((docSnapshot) => {
                deletePromises.push(deleteDoc(doc(db, 'form_questions', docSnapshot.id)));
              });

              await Promise.all(deletePromises);

              // Delete the form
              await deleteDoc(doc(db, 'inspection_forms', formId));

              Alert.alert('Success', 'Form deleted successfully');
              fetchForms();
            } catch (error) {
              console.error('Error deleting form:', error);
              Alert.alert('Error', 'Failed to delete form');
            }
          },
        },
      ]
    );
  };

  const resetFormData = () => {
    setFormData({
      title: '',
      department: '',
      schoolLevel: '',
      description: '',
      version: 1,
      active: true,
    });
  };

  const resetQuestionData = () => {
    setQuestionData({
      text: '',
      type: 'yesno',
      required: false,
      section: 'infrastructure',
      placeholder: '',
      options: [],
    });
  };

  const editForm = (form) => {
    setSelectedForm(form);
    fetchFormQuestions(form.id);
    navigation.navigate('FormEditor', { form });
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Form Builder</Text>
        <Text style={styles.subtitle}>Create and manage inspection forms</Text>
      </View>

      <View style={styles.actionBar}>
        <TouchableOpacity
          style={styles.createButton}
          onPress={() => setShowFormModal(true)}
        >
          <Ionicons name="add" size={20} color={COLORS.white} />
          <Text style={styles.createButtonText}>Create New Form</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.formsList}>
        {forms.map((form) => (
          <View key={form.id} style={styles.formCard}>
            <View style={styles.formHeader}>
              <View style={styles.formInfo}>
                <Text style={styles.formTitle}>{form.title}</Text>
                <Text style={styles.formMeta}>
                  {DEPARTMENTS[form.department]?.name} • {form.schoolLevel} • v{form.version}
                </Text>
                <Text style={styles.formDescription}>{form.description}</Text>
              </View>
              <View style={styles.formActions}>
                <View style={[
                  styles.statusBadge,
                  { backgroundColor: form.active ? COLORS.success : COLORS.gray }
                ]}>
                  <Text style={styles.statusText}>
                    {form.active ? 'ACTIVE' : 'INACTIVE'}
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.formStats}>
              <View style={styles.statItem}>
                <Ionicons name="help-circle-outline" size={16} color={COLORS.primary} />
                <Text style={styles.statText}>{form.questionCount || 0} Questions</Text>
              </View>
              <View style={styles.statItem}>
                <Ionicons name="calendar-outline" size={16} color={COLORS.primary} />
                <Text style={styles.statText}>
                  {new Date(form.createdAt).toLocaleDateString()}
                </Text>
              </View>
            </View>

            <View style={styles.formActionButtons}>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => editForm(form)}
              >
                <Ionicons name="create-outline" size={16} color={COLORS.primary} />
                <Text style={styles.actionButtonText}>Edit</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => {
                  setSelectedForm(form);
                  fetchFormQuestions(form.id);
                  setShowQuestionModal(true);
                }}
              >
                <Ionicons name="add-circle-outline" size={16} color={COLORS.secondary} />
                <Text style={styles.actionButtonText}>Add Question</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionButton, styles.deleteButton]}
                onPress={() => deleteForm(form.id)}
              >
                <Ionicons name="trash-outline" size={16} color={COLORS.error} />
                <Text style={[styles.actionButtonText, { color: COLORS.error }]}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}

        {forms.length === 0 && !loading && (
          <View style={styles.emptyState}>
            <Ionicons name="document-outline" size={64} color={COLORS.gray} />
            <Text style={styles.emptyText}>No forms created yet</Text>
            <Text style={styles.emptySubtext}>Create your first inspection form</Text>
          </View>
        )}
      </ScrollView>

      {/* Create Form Modal */}
      <Modal visible={showFormModal} animationType="slide" transparent={true}>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Create New Form</Text>
              <TouchableOpacity onPress={() => setShowFormModal(false)}>
                <Ionicons name="close" size={24} color={COLORS.gray} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Form Title *</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Enter form title"
                  value={formData.title}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, title: text }))}
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Department *</Text>
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={formData.department}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, department: value }))}
                  >
                    <Picker.Item label="Select Department..." value="" />
                    {Object.values(DEPARTMENTS).map((dept) => (
                      <Picker.Item key={dept.id} label={dept.name} value={dept.id} />
                    ))}
                  </Picker>
                </View>
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>School Level *</Text>
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={formData.schoolLevel}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, schoolLevel: value }))}
                  >
                    <Picker.Item label="Select School Level..." value="" />
                    {schoolLevels.map((level) => (
                      <Picker.Item key={level.value} label={level.label} value={level.value} />
                    ))}
                  </Picker>
                </View>
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Description</Text>
                <TextInput
                  style={[styles.textInput, styles.textArea]}
                  placeholder="Enter form description"
                  value={formData.description}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, description: text }))}
                  multiline
                  numberOfLines={3}
                />
              </View>

              <View style={styles.switchContainer}>
                <Text style={styles.inputLabel}>Active Form</Text>
                <Switch
                  value={formData.active}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, active: value }))}
                  trackColor={{ false: COLORS.lightGray, true: COLORS.accent }}
                  thumbColor={formData.active ? COLORS.primary : COLORS.gray}
                />
              </View>
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowFormModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveButton}
                onPress={createForm}
              >
                <Text style={styles.saveButtonText}>Create Form</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Add Question Modal */}
      <Modal visible={showQuestionModal} animationType="slide" transparent={true}>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Question</Text>
              <TouchableOpacity onPress={() => setShowQuestionModal(false)}>
                <Ionicons name="close" size={24} color={COLORS.gray} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Question Text *</Text>
                <TextInput
                  style={[styles.textInput, styles.textArea]}
                  placeholder="Enter question text"
                  value={questionData.text}
                  onChangeText={(text) => setQuestionData(prev => ({ ...prev, text }))}
                  multiline
                  numberOfLines={2}
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Question Type *</Text>
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={questionData.type}
                    onValueChange={(value) => setQuestionData(prev => ({ ...prev, type: value }))}
                  >
                    {questionTypes.map((type) => (
                      <Picker.Item key={type.value} label={type.label} value={type.value} />
                    ))}
                  </Picker>
                </View>
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Section *</Text>
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={questionData.section}
                    onValueChange={(value) => setQuestionData(prev => ({ ...prev, section: value }))}
                  >
                    {sections.map((section) => (
                      <Picker.Item key={section.value} label={section.label} value={section.value} />
                    ))}
                  </Picker>
                </View>
              </View>

              {(questionData.type === 'text' || questionData.type === 'number') && (
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Placeholder Text</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="Enter placeholder text"
                    value={questionData.placeholder}
                    onChangeText={(text) => setQuestionData(prev => ({ ...prev, placeholder: text }))}
                  />
                </View>
              )}

              <View style={styles.switchContainer}>
                <Text style={styles.inputLabel}>Required Question</Text>
                <Switch
                  value={questionData.required}
                  onValueChange={(value) => setQuestionData(prev => ({ ...prev, required: value }))}
                  trackColor={{ false: COLORS.lightGray, true: COLORS.accent }}
                  thumbColor={questionData.required ? COLORS.primary : COLORS.gray}
                />
              </View>
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowQuestionModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveButton}
                onPress={addQuestion}
              >
                <Text style={styles.saveButtonText}>Add Question</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

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
    fontWeight: 'bold',
    color: COLORS.white,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.background,
    marginTop: 5,
  },
  actionBar: {
    padding: 20,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.accent,
    borderRadius: 8,
    padding: 12,
    justifyContent: 'center',
  },
  createButtonText: {
    color: COLORS.white,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  formsList: {
    flex: 1,
    padding: 20,
  },
  formCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  formHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  formInfo: {
    flex: 1,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginBottom: 5,
  },
  formMeta: {
    fontSize: 12,
    color: COLORS.gray,
    marginBottom: 5,
  },
  formDescription: {
    fontSize: 14,
    color: COLORS.black,
  },
  formActions: {
    alignItems: 'flex-end',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 10,
    color: COLORS.white,
    fontWeight: 'bold',
  },
  formStats: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 20,
  },
  statText: {
    fontSize: 12,
    color: COLORS.gray,
    marginLeft: 5,
  },
  formActionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: 6,
    padding: 8,
    flex: 1,
    marginHorizontal: 2,
    justifyContent: 'center',
  },
  deleteButton: {
    backgroundColor: '#ffebee',
  },
  actionButtonText: {
    fontSize: 12,
    color: COLORS.primary,
    marginLeft: 4,
    fontWeight: 'bold',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
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
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    width: '90%',
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  modalBody: {
    flex: 1,
    padding: 20,
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: COLORS.lightGray,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: COLORS.white,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: COLORS.lightGray,
    borderRadius: 8,
    backgroundColor: COLORS.white,
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: COLORS.lightGray,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: COLORS.gray,
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
    marginRight: 10,
  },
  cancelButtonText: {
    color: COLORS.white,
    fontWeight: 'bold',
  },
  saveButton: {
    flex: 1,
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
    marginLeft: 10,
  },
  saveButtonText: {
    color: COLORS.white,
    fontWeight: 'bold',
  },
});

export default FormBuilderScreen;
