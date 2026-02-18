// Utility for AI Analysis - Manual Haversine Calculation used to avoid dependency


function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371e3; // metres
    const φ1 = lat1 * Math.PI / 180; // φ, λ in radians
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
        Math.cos(φ1) * Math.cos(φ2) *
        Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    const d = R * c; // in metres
    return d;
}

const analyzeInspection = (inspectionData) => {
    let flags = {
        red: 0,
        yellow: 0,
        green: 0
    };
    let issues = [];
    let summary = [];

    // 1. Geo Tag Verification
    if (inspectionData.inspectionLocation && inspectionData.schoolLocation) {
        const { latitude: lat1, longitude: lon1 } = inspectionData.inspectionLocation;
        const { latitude: lat2, longitude: lon2 } = inspectionData.schoolLocation;

        if (lat1 && lon1 && lat2 && lon2) {
            const distance = calculateDistance(lat1, lon1, lat2, lon2);
            if (distance > 1000) {
                flags.red++;
                issues.push(`Location mismatch: Inspector was ${Math.round(distance)}m away from school coordinates.`);
            } else if (distance > 200) {
                flags.yellow++;
                issues.push(`Location warning: Inspector was ${Math.round(distance)}m away from school coordinates.`);
            } else {
                flags.green++;
                summary.push("Location verification successful.");
            }
        } else {
            flags.yellow++;
            issues.push("Incomplete location data for verification.");
        }
    } else {
        flags.yellow++;
        issues.push("Missing location data for verification.");
    }

    // 2. Field Completeness Verification
    // Check key fields
    const requiredFields = ['strengths', 'improvements', 'recommendations', 'studentCount', 'teacherCount'];
    // adapting to schema which has 'studentsEnrolled' instead of studentCount, checking Inspection.js...
    // Inspection.js has: strengths, improvements, recommendations. 
    // It doesn't strictly have studentCount/teacherCount as top level, but maybe in 'responses'.
    // Let's check 'responses' map if available.

    let missingFields = [];
    if (!inspectionData.strengths) missingFields.push('Strengths');
    if (!inspectionData.improvements) missingFields.push('Improvements');
    if (!inspectionData.recommendations) missingFields.push('Recommendations');

    // Check responses map size vs expected (if we knew expected) - skipping for now, just checking existence
    if (!inspectionData.responses || Object.keys(inspectionData.responses).length === 0) {
        missingFields.push('Questionnaire Responses');
    }

    if (missingFields.length > 0) {
        if (missingFields.includes('Questionnaire Responses')) {
            flags.red++;
            issues.push(`Critical: Missing questionnaire responses.`);
        } else {
            flags.yellow++;
            issues.push(`Incomplete qualitative fields: ${missingFields.join(', ')}.`);
        }
    } else {
        flags.green++;
        summary.push("All key fields filled.");
    }

    // 3. Date Time Verification
    const inspectionDate = new Date(inspectionData.inspectionDate || inspectionData.timestamp || Date.now());
    const submittedAt = new Date(inspectionData.submittedAt || Date.now());

    // Check if inspection date is in future (impossible)
    if (inspectionDate > new Date(Date.now() + 86400000)) { // allowing 1 day buffer for timezones
        flags.red++;
        issues.push("Invalid Inspection Date: Date is in the future.");
    }

    // 4. Content Analysis (Simulated AI)
    // Check for "gibberish" or very short answers in qualitative fields
    const qualitativeText = (inspectionData.strengths || "") + " " + (inspectionData.improvements || "") + " " + (inspectionData.recommendations || "");
    if (qualitativeText.length < 50 && missingFields.length === 0) { // Only check if fields exist
        flags.yellow++;
        issues.push("Qualitative feedback is very brief. AI suggests more detailed reporting.");
    } else if (qualitativeText.length > 50) {
        summary.push("Qualitative feedback provided is detailed.");
    }

    // Determine Overall Flag
    let overallFlag = 'Green';
    if (flags.red > 0) overallFlag = 'Red';
    else if (flags.yellow > 0) overallFlag = 'Yellow';

    return {
        flag: overallFlag,
        issues: issues,
        summary: summary,
        verifiedAt: new Date()
    };
};

module.exports = { analyzeInspection };
