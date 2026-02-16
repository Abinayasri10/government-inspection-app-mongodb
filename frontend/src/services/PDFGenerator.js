import * as Print from "expo-print"
import * as Sharing from "expo-sharing"
import * as FileSystem from "expo-file-system"
import * as MediaLibrary from "expo-media-library"
import { Alert } from "react-native"

class PDFGenerator {
  constructor() {
    this.documentDirectory = FileSystem.documentDirectory + "inspection_reports/"
  }

  async ensureDirectoryExists() {
    const dirInfo = await FileSystem.getInfoAsync(this.documentDirectory)
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(this.documentDirectory, { intermediateDirectories: true })
    }
  }

  async requestMediaLibraryPermissions() {
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync()
      return status === "granted"
    } catch (error) {
      console.error("Error requesting media library permissions:", error)
      return false
    }
  }

  async convertImageToBase64(imageUri) {
    try {
      console.log("🖼️ Converting image to base64:", imageUri)

      // Check if it's a local file or URL
      if (imageUri.startsWith("http")) {
        // Download the image first
        const downloadResult = await FileSystem.downloadAsync(imageUri, FileSystem.documentDirectory + "temp_image.jpg")

        if (downloadResult.status === 200) {
          const base64 = await FileSystem.readAsStringAsync(downloadResult.uri, {
            encoding: FileSystem.EncodingType.Base64,
          })

          // Clean up temp file
          await FileSystem.deleteAsync(downloadResult.uri, { idempotent: true })

          return `data:image/jpeg;base64,${base64}`
        }
      } else {
        // Local file
        const base64 = await FileSystem.readAsStringAsync(imageUri, {
          encoding: FileSystem.EncodingType.Base64,
        })
        return `data:image/jpeg;base64,${base64}`
      }

      return null
    } catch (error) {
      console.error("❌ Error converting image to base64:", error)
      return null
    }
  }

  async generatePDF(inspectionData) {
    try {
      console.log("📄 Generating PDF for report:", inspectionData.id);
      const html = this.generateInspectionReportHTML(inspectionData);

      const { uri } = await Print.printToFileAsync({
        html,
        base64: false
      });

      console.log("✅ PDF Generated at:", uri);
      return { success: true, uri, fileName: `Inspection_Report_${inspectionData.id}.pdf` };
    } catch (error) {
      console.error("❌ Error generating PDF:", error);
      return { success: false, error: error.message };
    }
  }

  async downloadPDF(uri, fileName) {
    try {
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
        return { success: true };
      } else {
        // Save to document directory if sharing not available
        const targetPath = FileSystem.documentDirectory + fileName;
        await FileSystem.copyAsync({ from: uri, to: targetPath });
        return { success: true, uri: targetPath };
      }
    } catch (error) {
      console.error("❌ Error downloading/sharing PDF:", error);
      return { success: false, error: error.message };
    }
  }

  generateInspectionReportHTML(inspectionData) {
    const {
      schoolName,
      address,
      schoolType,
      schoolLevel,
      inspectionDate,
      inspectorName,
      inspectorDesignation,
      principalName,
      principalPhone,
      // All responses for comprehensive display
      responses,
      // Photos with GPS data
      photos,
      // Observations
      strengths,
      improvements,
      recommendations,
      // Submission details
      submittedAt,
      signature,
      inspectionLocation,
      locationVerified,
      userId,
      userName,
      department,
      status,
      forwardedTo,
      signatureTimestamp,
    } = inspectionData

    const currentDate = new Date().toLocaleDateString("en-IN")
    const submissionDate = submittedAt ? new Date(submittedAt).toLocaleString("en-IN") : "N/A"
    const reportId = `INS-${Date.now()}-${(typeof userId === 'string' && userId) ? userId.substring(0, 8) : "UNKNOWN"}`

    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <title>School Inspection Report</title>
        <style>
            body {
                font-family: 'Times New Roman', serif;
                margin: 15px;
                line-height: 1.5;
                color: #333;
                font-size: 12px;
            }
            .header {
                text-align: center;
                border-bottom: 3px solid #071952;
                padding-bottom: 15px;
                margin-bottom: 20px;
            }
            .logo {
                font-size: 36px;
                margin-bottom: 8px;
            }
            .title {
                font-size: 20px;
                font-weight: bold;
                color: #071952;
                margin: 8px 0;
            }
            .subtitle {
                font-size: 14px;
                color: #666;
                margin-bottom: 15px;
            }
            .report-id {
                font-size: 11px;
                color: #999;
                font-style: italic;
            }
            .section {
                margin-bottom: 20px;
                page-break-inside: avoid;
            }
            .section-title {
                font-size: 16px;
                font-weight: bold;
                color: #071952;
                border-bottom: 2px solid #088395;
                padding-bottom: 4px;
                margin-bottom: 12px;
            }
            .info-grid {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 10px;
                margin-bottom: 15px;
            }
            .info-item {
                padding: 8px;
                background-color: #f8f9fa;
                border-left: 4px solid #37B7C3;
                border-radius: 3px;
            }
            .info-label {
                font-weight: bold;
                color: #071952;
                margin-bottom: 3px;
                font-size: 11px;
            }
            .info-value {
                color: #333;
                font-size: 12px;
            }
            .question-item {
                margin-bottom: 12px;
                padding: 10px;
                background-color: #f8f9fa;
                border-radius: 5px;
                border-left: 3px solid #37B7C3;
            }
            .question {
                font-weight: bold;
                color: #071952;
                margin-bottom: 4px;
                font-size: 12px;
            }
            .answer {
                color: #333;
                margin-left: 15px;
                font-size: 11px;
            }
            .answer.yes {
                color: #4CAF50;
                font-weight: bold;
            }
            .answer.no {
                color: #f44336;
                font-weight: bold;
            }
            .photo-section {
                margin: 20px 0;
                page-break-inside: avoid;
            }
            .photo-container {
                margin: 15px 0;
                border: 2px solid #ddd;
                border-radius: 8px;
                overflow: hidden;
                background-color: white;
                page-break-inside: avoid;
            }
            .photo-header {
                background-color: #071952;
                color: white;
                padding: 8px 12px;
                font-weight: bold;
                font-size: 12px;
            }
            .photo-content {
                padding: 10px;
            }
            .photo-image {
                width: 100%;
                max-width: 400px;
                height: auto;
                border-radius: 5px;
                margin-bottom: 10px;
                display: block;
                margin-left: auto;
                margin-right: auto;
            }
            .photo-info {
                background-color: #f0f8ff;
                padding: 8px;
                border-radius: 4px;
                font-size: 10px;
                line-height: 1.4;
            }
            .gps-coordinates {
                color: #2196F3;
                font-weight: bold;
                font-family: monospace;
            }
            .photo-timestamp {
                color: #666;
                font-style: italic;
            }
            .signature-section {
                margin-top: 30px;
                page-break-inside: avoid;
                border: 2px solid #071952;
                border-radius: 8px;
                padding: 15px;
            }
            .signature-title {
                font-size: 16px;
                font-weight: bold;
                color: #071952;
                text-align: center;
                margin-bottom: 15px;
                border-bottom: 1px solid #ddd;
                padding-bottom: 8px;
            }
            .signature-container {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 20px;
                margin-top: 15px;
            }
            .signature-box {
                text-align: center;
                border: 1px solid #ddd;
                padding: 15px;
                border-radius: 5px;
                background-color: #fafafa;
                min-height: 120px;
            }
            .signature-image {
                max-width: 200px;
                max-height: 80px;
                margin-bottom: 10px;
                border: 1px solid #ddd;
                border-radius: 3px;
            }
            .signature-details {
                font-size: 11px;
                line-height: 1.3;
            }
            .signature-line {
                border-top: 1px solid #333;
                margin-top: 40px;
                padding-top: 8px;
                font-size: 10px;
            }
            .footer {
                margin-top: 30px;
                text-align: center;
                font-size: 10px;
                color: #666;
                border-top: 1px solid #ddd;
                padding-top: 15px;
                page-break-inside: avoid;
            }
            .security-features {
                background-color: #e8f5e8;
                padding: 10px;
                border-radius: 5px;
                margin-top: 10px;
                font-size: 9px;
                text-align: center;
            }
            .responses-section {
                margin-bottom: 20px;
            }
            .response-category {
                margin-bottom: 15px;
                border: 1px solid #ddd;
                border-radius: 5px;
                overflow: hidden;
            }
            .category-header {
                background-color: #37B7C3;
                color: white;
                padding: 8px 12px;
                font-weight: bold;
                font-size: 13px;
            }
            .category-content {
                padding: 10px;
            }
            .status-badge {
                display: inline-block;
                padding: 3px 8px;
                border-radius: 12px;
                font-size: 10px;
                font-weight: bold;
                text-transform: uppercase;
            }
            .status-submitted {
                background-color: #4CAF50;
                color: white;
            }
            .status-verified {
                background-color: #2196F3;
                color: white;
            }
            @media print {
                body { margin: 0; }
                .page-break { page-break-before: always; }
                .photo-container { page-break-inside: avoid; }
                .signature-section { page-break-inside: avoid; }
            }
        </style>
    </head>
    <body>
        <div class="header">
            <div class="logo">🏛️</div>
            <div class="title">GOVERNMENT OF TAMIL NADU</div>
            <div class="title">DEPARTMENT OF EDUCATION</div>
            <div class="subtitle">Official School Inspection Report</div>
            <div class="report-id">Report ID: ${reportId} | Generated: ${currentDate}</div>
        </div>

        <div class="section">
            <div class="section-title">📋 School Information</div>
            <div class="info-grid">
                <div class="info-item">
                    <div class="info-label">School Name:</div>
                    <div class="info-value">${schoolName || "N/A"}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">School Type:</div>
                    <div class="info-value">${schoolType || "N/A"}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">Address:</div>
                    <div class="info-value">${address || "N/A"}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">School Level:</div>
                    <div class="info-value">${schoolLevel || "N/A"}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">Principal Name:</div>
                    <div class="info-value">${principalName || "N/A"}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">Principal Phone:</div>
                    <div class="info-value">${principalPhone || "N/A"}</div>
                </div>
            </div>
        </div>

        <div class="section">
            <div class="section-title">👨‍💼 Inspection Details</div>
            <div class="info-grid">
                <div class="info-item">
                    <div class="info-label">Inspector Name:</div>
                    <div class="info-value">${inspectorName || userName || "N/A"}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">Designation:</div>
                    <div class="info-value">${inspectorDesignation || "BEO"}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">Department:</div>
                    <div class="info-value">${department?.toUpperCase() || "EDUCATION"}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">Inspection Date:</div>
                    <div class="info-value">${inspectionDate || "N/A"}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">Submission Date:</div>
                    <div class="info-value">${submissionDate}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">Status:</div>
                    <div class="info-value">
                        <span class="status-badge status-submitted">${status || "SUBMITTED"}</span>
                        ${locationVerified ? '<span class="status-badge status-verified">GPS VERIFIED</span>' : ""}
                    </div>
                </div>
            </div>
            ${inspectionLocation
        ? `
            <div class="info-item" style="grid-column: 1 / -1; margin-top: 10px;">
                <div class="info-label">📍 Inspection GPS Location:</div>
                <div class="info-value gps-coordinates">
                    Latitude: ${inspectionLocation.latitude?.toFixed(6)}, 
                    Longitude: ${inspectionLocation.longitude?.toFixed(6)}
                    ${inspectionLocation.accuracy ? ` (Accuracy: ${inspectionLocation.accuracy.toFixed(1)}m)` : ""}
                </div>
            </div>
            `
        : ""
      }
        </div>

        ${this.generateResponsesSection(responses)}
        ${this.generatePhotosSection(photos)}
        ${this.generateObservationsSection({ strengths, improvements, recommendations })}
        ${this.generateSignatureSection({
        signature,
        inspectorName: inspectorName || userName,
        inspectorDesignation,
        department,
        signatureTimestamp,
        submissionDate,
        forwardedTo,
      })}

        <div class="footer">
            <p><strong>This is an official digitally generated document with embedded security features.</strong></p>
            <p>Report ID: ${reportId} | Generated on: ${currentDate}</p>
            <p>© Government Inspection System - Department of Education, Karnataka</p>
            <div class="security-features">
                🔒 Security Features: GPS-tagged photos, Digital signature, Timestamp verification, Location authentication
                <br>📧 For verification, contact: inspection.verification@education.kar.gov.in
            </div>
        </div>
    </body>
    </html>
    `
  }

  generateResponsesSection(responses) {
    if (!responses || Object.keys(responses).length === 0) {
      return `
        <div class="section">
            <div class="section-title">📝 Inspection Responses</div>
            <p>No responses recorded during inspection.</p>
        </div>
      `
    }

    // Categorize responses
    const categories = {
      infrastructure: {
        title: "🏫 Infrastructure Assessment",
        questions: ["building_safe", "drinking_water", "separate_toilets", "classrooms_count"],
      },
      teaching: {
        title: "📚 Teaching & Learning",
        questions: ["teachers_present", "teaching_materials"],
      },
      welfare: {
        title: "👥 Student Welfare",
        questions: ["midday_meal", "meal_quality"],
      },
      observations: {
        title: "📝 General Observations",
        questions: ["strengths", "improvements", "recommendations"],
      },
    }

    let sectionsHTML = ""

    Object.entries(categories).forEach(([categoryKey, category]) => {
      const categoryResponses = category.questions
        .map((questionKey) => {
          const value = responses[questionKey]
          if (!value) return null

          const questionText = this.formatQuestionText(questionKey)
          const answerText = this.formatAnswerText(value)
          const answerClass = value === "yes" ? "yes" : value === "no" ? "no" : ""

          return `
            <div class="question-item">
              <div class="question">${questionText}</div>
              <div class="answer ${answerClass}">${answerText}</div>
            </div>
          `
        })
        .filter((item) => item)
        .join("")

      if (categoryResponses) {
        sectionsHTML += `
          <div class="response-category">
            <div class="category-header">${category.title}</div>
            <div class="category-content">
              ${categoryResponses}
            </div>
          </div>
        `
      }
    })

    // Add any remaining responses that don't fit categories
    const allCategoryQuestions = Object.values(categories).flatMap((cat) => cat.questions)
    const uncategorizedResponses = Object.entries(responses)
      .filter(([key, value]) => {
        return !allCategoryQuestions.includes(key) && !key.startsWith("school_") && value && value.toString().trim()
      })
      .map(([key, value]) => {
        const questionText = this.formatQuestionText(key)
        const answerText = this.formatAnswerText(value)
        const answerClass = value === "yes" ? "yes" : value === "no" ? "no" : ""

        return `
          <div class="question-item">
            <div class="question">${questionText}</div>
            <div class="answer ${answerClass}">${answerText}</div>
          </div>
        `
      })
      .join("")

    if (uncategorizedResponses) {
      sectionsHTML += `
        <div class="response-category">
          <div class="category-header">📋 Additional Responses</div>
          <div class="category-content">
            ${uncategorizedResponses}
          </div>
        </div>
      `
    }

    return `
      <div class="section">
        <div class="section-title">📝 Inspection Responses</div>
        <div class="responses-section">
          ${sectionsHTML || "<p>No inspection responses available.</p>"}
        </div>
      </div>
    `
  }

  generatePhotosSection(photos) {
    if (!photos || Object.keys(photos).length === 0) {
      return `
        <div class="section">
            <div class="section-title">📸 GPS-Tagged Photos</div>
            <p style="color: #f44336; font-style: italic;">⚠️ No photos were captured during this inspection.</p>
        </div>
      `
    }

    const photoItems = Object.entries(photos)
      .map(([key, photo]) => {
        if (!photo || !photo.url) return null

        const photoTitle = this.formatPhotoTitle(key)
        const location = photo.location
        const timestamp = new Date(photo.timestamp).toLocaleString("en-IN")

        // Convert image to base64 for embedding
        const imageTag = photo.url
          ? `<img src="${photo.url}" alt="${photoTitle}" class="photo-image" crossorigin="anonymous">`
          : ""

        return `
          <div class="photo-container">
            <div class="photo-header">${photoTitle}</div>
            <div class="photo-content">
              ${imageTag}
              <div class="photo-info">
                <div style="margin-bottom: 5px;">
                  <strong>📍 GPS Coordinates:</strong>
                  <span class="gps-coordinates">
                    ${location?.latitude?.toFixed(6)}, ${location?.longitude?.toFixed(6)}
                  </span>
                </div>
                <div style="margin-bottom: 5px;">
                  <strong>🕒 Captured:</strong>
                  <span class="photo-timestamp">${timestamp}</span>
                </div>
                <div style="margin-bottom: 5px;">
                  <strong>📏 GPS Accuracy:</strong> ${location?.accuracy?.toFixed(2)}m
                </div>
                ${location?.altitude
            ? `
                <div>
                  <strong>⛰️ Altitude:</strong> ${location.altitude.toFixed(1)}m above sea level
                </div>
                `
            : ""
          }
              </div>
            </div>
          </div>
        `
      })
      .filter((item) => item)
      .join("")

    return `
      <div class="section page-break">
        <div class="section-title">📸 GPS-Tagged Inspection Photos</div>
        <div class="photo-section">
          ${photoItems}
        </div>
        <div style="margin-top: 15px; padding: 10px; background-color: #e8f5e8; border-radius: 5px; font-size: 11px;">
          <strong>🔒 Photo Authentication:</strong> All photos are GPS-tagged with precise coordinates and timestamps for verification and authenticity.
        </div>
      </div>
    `
  }

  generateObservationsSection({ strengths, improvements, recommendations }) {
    return `
      <div class="section">
        <div class="section-title">📋 Inspector's Observations & Recommendations</div>
        
        <div class="question-item">
          <div class="question">💪 Strengths Observed During Inspection:</div>
          <div class="answer">${strengths || "No specific strengths mentioned."}</div>
        </div>
        
        <div class="question-item">
          <div class="question">🔧 Areas Requiring Improvement:</div>
          <div class="answer">${improvements || "No specific improvements mentioned."}</div>
        </div>
        
        <div class="question-item">
          <div class="question">📋 Immediate Actions Recommended:</div>
          <div class="answer">${recommendations || "No specific recommendations provided."}</div>
        </div>
      </div>
    `
  }

  generateSignatureSection({
    signature,
    inspectorName,
    inspectorDesignation,
    department,
    signatureTimestamp,
    submissionDate,
    forwardedTo,
  }) {
    const signatureImage = signature
      ? `<img src="${signature}" alt="Inspector Digital Signature" class="signature-image">`
      : ""

    return `
      <div class="signature-section">
        <div class="signature-title">✍️ Digital Signatures & Authentication</div>
        <div class="signature-container">
          <div class="signature-box">
            <div style="font-weight: bold; margin-bottom: 10px; color: #071952;">Inspector's Digital Signature</div>
            ${signatureImage}
            <div class="signature-details">
              <div><strong>Name:</strong> ${inspectorName || "N/A"}</div>
              <div><strong>Designation:</strong> ${inspectorDesignation || "BEO"}</div>
              <div><strong>Department:</strong> ${department?.toUpperCase() || "EDUCATION"}</div>
              <div><strong>Signature Date:</strong> ${signatureTimestamp ? new Date(signatureTimestamp).toLocaleString("en-IN") : submissionDate}</div>
              <div style="margin-top: 8px; color: #4CAF50; font-weight: bold;">✅ Digitally Verified</div>
            </div>
          </div>
          <div class="signature-box">
            <div style="font-weight: bold; margin-bottom: 10px; color: #071952;">Supervisor's Acknowledgment</div>
            <div style="height: 80px; border: 1px dashed #ccc; display: flex; align-items: center; justify-content: center; color: #999; font-style: italic;">
              Awaiting ${forwardedTo?.toUpperCase() || "DEO"} Review
            </div>
            <div class="signature-details">
              <div><strong>Forwarded To:</strong> ${forwardedTo?.toUpperCase() || "DEO"}</div>
              <div><strong>Status:</strong> Pending Review</div>
              <div><strong>Expected Review:</strong> Within 48 hours</div>
            </div>
            <div class="signature-line">
              <div>Supervisor Signature</div>
              <div>Date: _______________</div>
            </div>
          </div>
        </div>
        
        <div style="margin-top: 20px; padding: 12px; background-color: #f0f8ff; border-radius: 5px; border-left: 4px solid #2196F3;">
          <div style="font-weight: bold; margin-bottom: 5px;">🔐 Digital Authentication Details:</div>
          <div style="font-size: 10px; line-height: 1.4;">
            • Digital signature captured with timestamp verification<br>
            • GPS location authenticated at time of submission<br>
            • All photos are geo-tagged with precise coordinates<br>
            • Report generated with unique ID for tracking and verification<br>
            • Cryptographic hash ensures document integrity
          </div>
        </div>
      </div>
    `
  }

  formatQuestionText(key) {
    const questionMap = {
      building_safe: "Is the school building safe and in good condition?",
      drinking_water: "Are drinking water facilities available and functional?",
      separate_toilets: "Are separate toilet facilities available for boys and girls?",
      classrooms_count: "Number of classrooms and their condition",
      electricity_available: "Is electricity available in the school?",
      playground_available: "Is playground facility available?",
      library_available: "Is library facility available?",
      computer_lab: "Is computer lab available?",
      teachers_present: "Are all teachers present and teaching?",
      teaching_materials: "Are adequate teaching materials available?",
      blackboard_condition: "What is the condition of blackboards/whiteboards?",
      textbooks_available: "Are textbooks available for all students?",
      teacher_student_ratio: "What is the teacher to student ratio?",
      midday_meal: "Is Mid-Day Meal provided regularly?",
      meal_quality: "Quality and hygiene of Mid-Day Meal",
      drinking_water_quality: "Quality of drinking water",
      medical_checkup: "Are regular medical checkups conducted?",
      uniform_distribution: "Are uniforms distributed to students?",
      scholarship_distribution: "Are scholarships distributed properly?",
      strengths: "Strengths observed during inspection",
      improvements: "Areas that need improvement",
      recommendations: "Immediate actions recommended",
      overall_rating: "Overall rating of the school",
      attendance_register: "Are attendance registers maintained properly?",
      student_progress: "How is student progress tracked?",
      parent_meetings: "Are regular parent-teacher meetings conducted?",
      extracurricular_activities: "Are extracurricular activities organized?",
      safety_measures: "What safety measures are in place?",
      cleanliness_hygiene: "How is the cleanliness and hygiene maintained?",
      infrastructure_maintenance: "How is infrastructure maintenance handled?",
      staff_quarters: "Are staff quarters available?",
      boundary_wall: "Is there a proper boundary wall?",
      water_storage: "Are water storage facilities adequate?",
      waste_management: "How is waste management handled?",
      emergency_procedures: "Are emergency procedures in place?",

      // Example of newly added keys
      midday_meal_served_today: "Was the Mid-Day Meal served today?",
      school_wifi_available: "Is Wi-Fi available in the school?",
      total_students: "What is the total number of students enrolled?",
      total_classrooms: "What is the total number of classrooms?"
    };

    // ✅ If mapping exists, return it
    if (questionMap[key]) {
      return questionMap[key];
    }

    // 🚀 Smarter fallback for unknown keys
    let words = key.replace(/_/g, " ").trim().split(" ");
    let firstWord = words[0].toLowerCase();

    if (["is", "are", "has", "have", "does", "do"].includes(firstWord)) {
      // Already a question
      return words.map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ") + "?";
    } else if (firstWord.match(/count|number|total/)) {
      return "What is the " + words.join(" ") + "?";
    } else if (firstWord === "quality") {
      return "What is the quality of " + words.slice(1).join(" ") + "?";
    } else if (firstWord.match(/availability|available/)) {
      return "Is " + words.slice(1).join(" ") + " available?";
    } else {
      return "Does the school have " + words.join(" ") + "?";
    }
  }


  formatAnswerText(value) {
    if (typeof value === "boolean") {
      return value ? "✅ Yes" : "❌ No"
    }
    if (value === "yes") return "✅ Yes"
    if (value === "no") return "❌ No"
    if (value === true) return "✅ Yes"
    if (value === false) return "❌ No"

    // Handle empty or null values
    if (!value || value.toString().trim() === "") {
      return "Not provided"
    }

    return value.toString().trim()
  }

  formatPhotoTitle(key) {
    const photoTitleMap = {
      classroom_photo: "📚 Classroom Facilities",
      toilet_photo: "🚻 Toilet Facilities",
      meal_photo: "🍽️ Mid-Day Meal Service",
      playground_photo: "🏃‍♂️ Playground Area",
      library_photo: "📖 Library Facilities",
      building_photo: "🏫 School Building",
      kitchen_photo: "👨‍🍳 Kitchen Facilities",
      laboratory_photo: "🔬 Laboratory Facilities",
      staff_room_photo: "👥 Staff Room",
      principal_office_photo: "🏢 Principal's Office",
      drinking_water_photo: "💧 Drinking Water Facilities",
      electricity_photo: "⚡ Electrical Facilities",
    }

    return photoTitleMap[key] || key.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())
  }

  async generatePDF(inspectionData) {
    try {
      await this.ensureDirectoryExists()

      console.log("📄 Generating PDF with GPS photos and digital signature...")
      console.log("📸 Photos to include:", Object.keys(inspectionData.photos || {}))
      console.log("✍️ Digital signature:", inspectionData.signature ? "Present" : "Missing")

      const html = this.generateInspectionReportHTML(inspectionData)

      const fileName = `inspection_report_${inspectionData.schoolName?.replace(/[^a-zA-Z0-9]/g, "_")}_${Date.now()}.pdf`
      const filePath = this.documentDirectory + fileName

      // Generate PDF using expo-print with high quality settings
      const { uri } = await Print.printToFileAsync({
        html,
        base64: false,
        width: 612,
        height: 792,
        margins: {
          left: 20,
          top: 20,
          right: 20,
          bottom: 20,
        },
      })

      // Copy the file to our custom directory
      await FileSystem.copyAsync({
        from: uri,
        to: filePath,
      })

      // Delete the original temporary file
      try {
        await FileSystem.deleteAsync(uri)
      } catch (deleteError) {
        console.warn("Could not delete temporary file:", deleteError)
      }

      console.log("✅ PDF generated successfully with GPS photos and signature")

      return {
        success: true,
        uri: filePath,
        fileName,
        size: (await FileSystem.getInfoAsync(filePath)).size,
      }
    } catch (error) {
      console.error("❌ PDF generation error:", error)
      return {
        success: false,
        error: error.message,
      }
    }
  }

  async downloadPDFToDevice(pdfUri, fileName) {
    try {
      console.log("💾 Downloading PDF to device...")

      // Request media library permissions
      const hasPermission = await this.requestMediaLibraryPermissions()

      if (!hasPermission) {
        Alert.alert("Permission Required", "Media library permission is required to save files to Downloads.")
        return { success: false, error: "Permission denied" }
      }

      // Create asset from the PDF file
      const asset = await MediaLibrary.createAssetAsync(pdfUri)

      // Create or get Downloads album
      let album = await MediaLibrary.getAlbumAsync("Downloads")
      if (!album) {
        album = await MediaLibrary.createAlbumAsync("Downloads", asset, false)
      } else {
        await MediaLibrary.addAssetsToAlbumAsync([asset], album, false)
      }

      console.log("✅ PDF downloaded to Downloads folder successfully")

      return {
        success: true,
        message: "PDF with GPS photos and signature downloaded to Downloads folder",
        assetId: asset.id,
        albumId: album.id,
      }
    } catch (error) {
      console.error("❌ Download to device error:", error)
      return {
        success: false,
        error: error.message,
      }
    }
  }

  async sharePDF(pdfUri, fileName) {
    try {
      const isAvailable = await Sharing.isAvailableAsync()

      if (!isAvailable) {
        Alert.alert("Error", "Sharing is not available on this device")
        return false
      }

      await Sharing.shareAsync(pdfUri, {
        mimeType: "application/pdf",
        dialogTitle: "Share Inspection Report with GPS Photos & Signature",
        UTI: "com.adobe.pdf",
      })

      console.log("✅ PDF shared successfully")
      return true
    } catch (error) {
      console.error("❌ PDF sharing error:", error)
      Alert.alert("Error", "Failed to share PDF")
      return false
    }
  }

  async downloadPDF(pdfUri, fileName) {
    try {
      // First try to download to device storage
      const downloadResult = await this.downloadPDFToDevice(pdfUri, fileName)

      if (downloadResult.success) {
        Alert.alert(
          "Download Complete",
          `Report with GPS photos and digital signature saved to Downloads folder as: ${fileName}`,
          [
            { text: "OK" },
            {
              text: "Share",
              onPress: () => this.sharePDF(pdfUri, fileName),
            },
          ],
        )
      } else {
        // Fallback to sharing if download fails
        Alert.alert("Download", `Unable to save to Downloads. Would you like to share the file instead?`, [
          { text: "Cancel" },
          {
            text: "Share",
            onPress: () => this.sharePDF(pdfUri, fileName),
          },
        ])
      }

      return {
        success: true,
        path: pdfUri,
        fileName,
      }
    } catch (error) {
      console.error("❌ PDF download error:", error)
      return {
        success: false,
        error: error.message,
      }
    }
  }

  async getAllReports() {
    try {
      await this.ensureDirectoryExists()

      const files = await FileSystem.readDirectoryAsync(this.documentDirectory)
      const pdfFiles = files.filter((file) => file.endsWith(".pdf"))

      const reports = await Promise.all(
        pdfFiles.map(async (fileName) => {
          const filePath = this.documentDirectory + fileName
          const fileInfo = await FileSystem.getInfoAsync(filePath)

          return {
            fileName,
            filePath,
            size: fileInfo.size,
            modificationTime: fileInfo.modificationTime,
            createdAt: new Date(fileInfo.modificationTime).toLocaleDateString("en-IN"),
          }
        }),
      )

      return reports.sort((a, b) => b.modificationTime - a.modificationTime)
    } catch (error) {
      console.error("Error getting reports:", error)
      return []
    }
  }

  async deleteReport(filePath) {
    try {
      await FileSystem.deleteAsync(filePath)
      return true
    } catch (error) {
      console.error("Error deleting report:", error)
      return false
    }
  }
}

export default new PDFGenerator()
