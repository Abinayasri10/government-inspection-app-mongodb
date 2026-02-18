import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/colors';
import { useAuth } from '../context/AuthContext';
import api from "../services/api"
import PDFGenerator from '../services/PDFGenerator';

const ReportsScreen = ({ navigation }) => {
  const { userProfile } = useAuth();
  const [reports, setReports] = useState([]);
  const [savedReports, setSavedReports] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('submitted'); // submitted, saved

  useEffect(() => {
    if (userProfile) {
      fetchReports();
      fetchSavedReports();
    }
  }, [userProfile]);

  const fetchReports = async () => {
    if (!userProfile) return;

    try {
      setLoading(true);
      // Backend expects userId for filtering or checks token
      // We pass userId as query param as per our routes, unless admin
      const userId = userProfile.uid || userProfile._id;

      let endpoint = `/inspections`;
      if (userProfile.role !== 'admin' && userId) {
        endpoint += `?userId=${userId}`;
      }

      const response = await api.get(endpoint);
      setReports(response.data);
    } catch (error) {
      console.error('Error fetching reports:', error);
      Alert.alert('Error', 'Failed to fetch reports');
    } finally {
      setLoading(false);
    }
  };

  const fetchSavedReports = async () => {
    try {
      const savedReportsList = await PDFGenerator.getAllReports();
      setSavedReports(savedReportsList);
    } catch (error) {
      console.error('Error fetching saved reports:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchReports();
    await fetchSavedReports();
    setRefreshing(false);
  };

  const generatePDFReport = async (reportData) => {
    try {
      Alert.alert(
        'Generate Report',
        'Do you want to generate a PDF report for this inspection?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Generate',
            onPress: async () => {
              setLoading(true);
              const result = await PDFGenerator.generatePDF(reportData);

              if (result.success) {
                Alert.alert(
                  'Success',
                  'PDF report generated successfully!',
                  [
                    { text: 'OK' },
                    {
                      text: 'Share',
                      onPress: () => PDFGenerator.sharePDF(result.uri, result.fileName)
                    }
                  ]
                );
                fetchSavedReports(); // Refresh saved reports list
              } else {
                Alert.alert('Error', 'Failed to generate PDF report');
              }
              setLoading(false);
            }
          }
        ]
      );
    } catch (error) {
      console.error('Error generating PDF:', error);
      Alert.alert('Error', 'Failed to generate PDF report');
    }
  };

  const shareSavedReport = async (report) => {
    try {
      await PDFGenerator.sharePDF(report.filePath, report.fileName);
    } catch (error) {
      console.error('Error sharing report:', error);
      Alert.alert('Error', 'Failed to share report');
    }
  };

  const deleteSavedReport = async (report) => {
    Alert.alert(
      'Delete Report',
      'Are you sure you want to delete this report?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const success = await PDFGenerator.deleteReport(report.filePath);
            if (success) {
              Alert.alert('Success', 'Report deleted successfully');
              fetchSavedReports();
            } else {
              Alert.alert('Error', 'Failed to delete report');
            }
          }
        }
      ]
    );
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'submitted':
        return COLORS.warning;
      case 'reviewed':
        return COLORS.success;
      case 'approved':
        return COLORS.success;
      case 'rejected':
        return COLORS.error;
      default:
        return COLORS.gray;
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'submitted':
        return 'SUBMITTED';
      case 'reviewed':
        return 'REVIEWED';
      case 'approved':
        return 'APPROVED';
      case 'rejected':
        return 'REJECTED';
      default:
        return 'UNKNOWN';
    }
  };

  const renderSubmittedReports = () => (
    <ScrollView
      style={styles.reportsList}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {reports.map((report) => (
        <View key={report._id || report.id} style={styles.reportCard}>
          <View style={styles.reportHeader}>
            <View style={styles.reportInfo}>
              <Text style={styles.reportTitle}>{report.schoolName}</Text>
              <Text style={styles.reportDate}>
                {new Date(report.submittedAt).toLocaleDateString('en-IN')}
              </Text>
              <Text style={styles.reportAddress}>{report.address}</Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(report.status) }]}>
              <Text style={styles.statusText}>{getStatusText(report.status)}</Text>
            </View>
          </View>

          <View style={styles.reportDetails}>
            <View style={styles.detailItem}>
              <Ionicons name="school-outline" size={16} color={COLORS.gray} />
              <Text style={styles.detailText}>Type: {report.schoolType}</Text>
            </View>
            <View style={styles.detailItem}>
              <Ionicons name="people-outline" size={16} color={COLORS.gray} />
              <Text style={styles.detailText}>Students: {report.studentsEnrolled || 'N/A'}</Text>
            </View>
            <View style={styles.detailItem}>
              <Ionicons name="person-outline" size={16} color={COLORS.gray} />
              <Text style={styles.detailText}>Inspector: {report.userName}</Text>
            </View>
          </View>

          <View style={styles.reportActions}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => navigation.navigate('ReportDetails', { report })}
            >
              <Ionicons name="eye-outline" size={16} color={COLORS.primary} />
              <Text style={styles.actionButtonText}>View Details</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => generatePDFReport(report)}
              disabled={loading}
            >
              <Ionicons name="download-outline" size={16} color={COLORS.secondary} />
              <Text style={styles.actionButtonText}>Generate PDF</Text>
            </TouchableOpacity>
          </View>
        </View>
      ))}

      {reports.length === 0 && !loading && (
        <View style={styles.emptyState}>
          <Ionicons name="document-outline" size={64} color={COLORS.gray} />
          <Text style={styles.emptyText}>No reports found</Text>
          <Text style={styles.emptySubtext}>Your submitted inspection reports will appear here</Text>
        </View>
      )}
    </ScrollView>
  );

  const renderSavedReports = () => (
    <ScrollView
      style={styles.reportsList}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {savedReports.map((report, index) => (
        <View key={index} style={styles.reportCard}>
          <View style={styles.reportHeader}>
            <View style={styles.reportInfo}>
              <Text style={styles.reportTitle}>{report.fileName}</Text>
              <Text style={styles.reportDate}>{report.createdAt}</Text>
              <Text style={styles.reportSize}>
                Size: {(report.size / 1024).toFixed(1)} KB
              </Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: COLORS.success }]}>
              <Text style={styles.statusText}>SAVED</Text>
            </View>
          </View>

          <View style={styles.reportActions}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => shareSavedReport(report)}
            >
              <Ionicons name="share-outline" size={16} color={COLORS.primary} />
              <Text style={styles.actionButtonText}>Share</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, styles.deleteButton]}
              onPress={() => deleteSavedReport(report)}
            >
              <Ionicons name="trash-outline" size={16} color={COLORS.error} />
              <Text style={[styles.actionButtonText, { color: COLORS.error }]}>Delete</Text>
            </TouchableOpacity>
          </View>
        </View>
      ))}

      {savedReports.length === 0 && !loading && (
        <View style={styles.emptyState}>
          <Ionicons name="folder-outline" size={64} color={COLORS.gray} />
          <Text style={styles.emptyText}>No saved reports</Text>
          <Text style={styles.emptySubtext}>Generated PDF reports will be saved here</Text>
        </View>
      )}
    </ScrollView>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Reports</Text>
        <Text style={styles.subtitle}>View and manage your inspection reports</Text>
      </View>

      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'submitted' && styles.activeTab]}
          onPress={() => setActiveTab('submitted')}
        >
          <Text style={[styles.tabText, activeTab === 'submitted' && styles.activeTabText]}>
            Submitted Reports
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'saved' && styles.activeTab]}
          onPress={() => setActiveTab('saved')}
        >
          <Text style={[styles.tabText, activeTab === 'saved' && styles.activeTabText]}>
            Saved PDFs
          </Text>
        </TouchableOpacity>
      </View>

      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading reports...</Text>
        </View>
      )}

      {!loading && (
        activeTab === 'submitted' ? renderSubmittedReports() : renderSavedReports()
      )}
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
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
  },
  tab: {
    flex: 1,
    paddingVertical: 15,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: COLORS.primary,
  },
  tabText: {
    fontSize: 16,
    color: COLORS.gray,
  },
  activeTabText: {
    color: COLORS.primary,
    fontWeight: 'bold',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: COLORS.gray,
  },
  reportsList: {
    flex: 1,
    padding: 20,
  },
  reportCard: {
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
  reportHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 15,
  },
  reportInfo: {
    flex: 1,
  },
  reportTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginBottom: 5,
  },
  reportDate: {
    fontSize: 14,
    color: COLORS.gray,
    marginBottom: 3,
  },
  reportAddress: {
    fontSize: 12,
    color: COLORS.gray,
  },
  reportSize: {
    fontSize: 12,
    color: COLORS.gray,
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
  reportDetails: {
    marginBottom: 15,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  detailText: {
    fontSize: 14,
    color: COLORS.gray,
    marginLeft: 8,
  },
  reportActions: {
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
    textAlign: 'center',
  },
});

export default ReportsScreen;
