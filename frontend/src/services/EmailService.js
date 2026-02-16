import api from "../services/api"

class EmailService {
  constructor() {
    this.sendGridApiKey = null // Handled in backend
    this.sendGridEndpoint = null
    this.fromEmail = "inspectiq5@gmail.com"
    this.fromName = "Government Inspection System"
  }

  async sendPrincipalApprovalRequest(schoolData, inspectorData, assignmentData) {
    try {
      console.log("📧 Starting email approval process...")

      if (!schoolData || !inspectorData) {
        throw new Error("Missing required school or inspector data")
      }

      // Create approval record in Backend
      const approvalResult = await this.createApprovalRecord(assignmentData, schoolData, inspectorData)

      if (!approvalResult.success) {
        throw new Error(`Failed to create approval record: ${approvalResult.error}`)
      }

      const approvalData = approvalResult.approvalData

      // Create approval link
      const approvalLink = `${process.env.EXPO_PUBLIC_API_URL}/approvals/verify?token=${approvalData.approvalToken}&assignmentId=${approvalData.assignmentId}&schoolId=${approvalData.schoolId}`

      // Send email via Backend
      const emailResult = await this.sendEmailViaBackend({
        to: "inspectiq5@gmail.com", // For testing, ideally schoolData.principalEmail
        toName: schoolData.principalName || "Principal",
        subject: `🚨 URGENT: School Inspection Approval Required - ${schoolData.name}`,
        htmlContent: this.generateApprovalEmailHTML(schoolData, inspectorData, approvalData, approvalLink),
        textContent: this.generateApprovalEmailText(schoolData, inspectorData, approvalData, approvalLink),
      })

      if (emailResult.success) {
        console.log("✅ Email sent successfully via Backend")

        // Update approval record
        await api.put(`/approvals/${approvalData.id || approvalData._id}`, {
          emailSent: true,
          emailSentAt: new Date().toISOString(),
          emailResponse: emailResult.msg,
          emailProvider: "sendgrid",
        })

        return {
          success: true,
          approvalData,
          emailSent: true,
          message: "Approval email sent successfully via Backend",
        }
      } else {
        throw new Error(`Backend email error: ${emailResult.error || emailResult.msg}`)
      }
    } catch (error) {
      console.error("❌ Error in sendPrincipalApprovalRequest:", error)
      return {
        success: false,
        error: error.message,
        message: "Failed to send approval email",
      }
    }
  }

  async sendEmailViaBackend({ to, toName, subject, htmlContent, textContent }) {
    try {
      const response = await api.post('/email/send', {
        to,
        toName,
        subject,
        htmlContent,
        textContent
      })

      return { success: true, msg: response.data.msg }
    } catch (error) {
      console.error("Error sending email via backend:", error)
      return { success: false, error: error.response?.data?.error || error.message }
    }
  }

  async createApprovalRecord(assignmentData, schoolData, inspectorData) {
    try {
      const approvalToken = `approval_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      const assignmentId = assignmentData?.id || `temp_assignment_${Date.now()}`
      const schoolId = schoolData.id || `temp_school_${Date.now()}`

      const approvalData = {
        assignmentId,
        schoolId,
        schoolName: schoolData.name || "Unknown School",
        principalName: schoolData.principalName || "Principal",
        principalEmail: schoolData.principalEmail || "inspectiq5@gmail.com",
        inspectorName: inspectorData.name || "Unknown Inspector",
        inspectorId: inspectorData.id || inspectorData._id || inspectorData.uid || "unknown_inspector",
        inspectorRole: inspectorData.role || "beo",
        approvalToken,
        createdAt: new Date().toISOString(),
        status: "pending"
      }

      console.log("💾 Saving approval record to backend...")
      const response = await api.post("/approvals", approvalData)

      return {
        success: true,
        approvalData: response.data,
      }
    } catch (error) {
      console.error("❌ Error creating approval record:", error)
      return { success: false, error: error.message }
    }
  }

  async checkApprovalStatus(assignmentId, schoolId) {
    try {
      if (!assignmentId || !schoolId) return { approved: false, error: "Missing parameters" }

      const response = await api.get(`/approvals/status?assignmentId=${assignmentId}&schoolId=${schoolId}`)
      const approvalData = response.data

      return {
        approved: approvalData.approved === true,
        approvedAt: approvalData.approvedAt,
        approvedBy: approvalData.approvedBy,
        principalEmail: approvalData.principalEmail,
        status: approvalData.status,
        approvalToken: approvalData.approvalToken,
      }
    } catch (error) {
      // If 404 or other error
      return { approved: false, error: "No approval record found" }
    }
  }

  setupApprovalListener(assignmentId, schoolId, callback) {
    // Polling implementation
    console.log(`🔄 Setting up approval polling for ${assignmentId}`)

    const check = async () => {
      const status = await this.checkApprovalStatus(assignmentId, schoolId)
      callback(status)
    }

    check() // Initial check
    const intervalId = setInterval(check, 5000)

    return () => clearInterval(intervalId)
  }

  async sendInspectionCompletedNotification(inspectionData) {
    try {
      if (!inspectionData) {
        throw new Error("Missing inspection data")
      }

      console.log("📧 Sending inspection completion notification for", inspectionData.schoolName)

      // You might want to generate PDF link here if stored in cloud, 
      // or just notify that it's available in the dashboard.
      // For now, simple notification.

      const subject = `✅ Inspection Completed: ${inspectionData.schoolName}`
      const htmlContent = `
        <h1>Inspection Completed</h1>
        <p>The inspection for <strong>${inspectionData.schoolName}</strong> has been completed and submitted.</p>
        <p><strong>Inspector:</strong> ${inspectionData.inspectorName}</p>
        <p><strong>Date:</strong> ${new Date(inspectionData.submittedAt).toLocaleString()}</p>
        <p>Please log in to the dashboard to view the full report.</p>
      `

      const emailResult = await this.sendEmailViaBackend({
        to: "inspectiq5@gmail.com", // Or DEO email
        toName: "Educational Officer",
        subject: subject,
        htmlContent: htmlContent,
        textContent: `Inspection Completed for ${inspectionData.schoolName}. Please check dashboard.`,
      })

      if (emailResult.success) {
        console.log("✅ Inspection completion email sent successfully")
        return { success: true }
      } else {
        throw new Error(`Failed to send email: ${emailResult.error}`)
      }
    } catch (error) {
      console.error("❌ Error sending completion notification:", error)
      return { success: false, error: error.message }
    }
  }

  // Helper methods for HTML generation...
  generateApprovalEmailHTML(schoolData, inspectorData, approvalData, approvalLink) {
    return `<html><body><h1>Approval Needed</h1><a href="${approvalLink}">Approve</a></body></html>`
  }

  generateApprovalEmailText(schoolData, inspectorData, approvalData, approvalLink) {
    return `Approval Needed. Click here: ${approvalLink}`
  }
}

export default new EmailService()
