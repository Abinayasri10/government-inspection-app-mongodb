const mongoose = require('mongoose');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
const School = require('./models/School');

dotenv.config();

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI || "mongodb://localhost:27017/government-inspection-app", {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log('MongoDB Connected');
    } catch (err) {
        console.error(err.message);
        process.exit(1);
    }
};

const sampleUsers = [
    {
        name: "Rajesh Kumar",
        aadhaar: "123456789012",
        department: "education",
        role: "beo",
        email: "123456789012@gov.in",
    },
    {
        name: "Dr. Sunita Sharma", // DEO User
        aadhaar: "567890123456",
        department: "education",
        role: "deo",
        email: "567890123456@gov.in",
    },
    {
        name: "Amit Singh", // CEO User
        aadhaar: "678901234567",
        department: "education",
        role: "ceo",
        email: "678901234567@gov.in",
    },
    {
        name: "Priya Sharma",
        aadhaar: "234567890123",
        department: "health",
        role: "officer",
        email: "234567890123@gov.in",
    },
    {
        name: "Dr. Ramesh Gupta", // BMO User
        aadhaar: "789012345678",
        department: "health",
        role: "bmo",
        email: "789012345678@gov.in",
    },
    {
        name: "Dr. Kavita Patel", // CMO User
        aadhaar: "890123456789",
        department: "health",
        role: "cmo",
        email: "890123456789@gov.in",
    },
    {
        name: "Amit Singh",
        aadhaar: "345678901234",
        department: "food",
        role: "inspector",
        email: "345678901234@gov.in",
    },
    {
        name: "Dr. Ravi Kumar", // DHO User
        aadhaar: "901234567890",
        department: "food",
        role: "dho",
        email: "901234567890@gov.in",
    },
    {
        name: "Sunita Devi",
        aadhaar: "456789012345",
        department: "construction",
        role: "auditor",
        email: "456789012345@gov.in",
    },
    {
        name: "Eng. Vikram Singh", // AE User
        aadhaar: "012345678901",
        department: "construction",
        role: "ae",
        email: "012345678901@gov.in",
    },
    {
        name: "Collector Rajesh",
        aadhaar: "111111111111",
        department: "admin",
        role: "collector",
        email: "111111111111@gov.in",
    },
    {
        name: "Admin User",
        aadhaar: "999999999999",
        department: "admin",
        role: "admin",
        email: "999999999999@gov.in",
    },
];

const mockSchools = [
    {
        //id: "school_001", // Mongoose uses _id
        name: "Government Primary School Rajajinagar",
        address: "Rajajinagar, Bangalore, Karnataka - 560010",
        schoolType: "Government",
        level: "primary",
        principalName: "Mrs. Sunitha Rao",
        principalPhone: "+91 9876543210",
        totalStudents: 245,
        totalTeachers: 12,
        establishedYear: 1985,
        lastInspectionDate: new Date("2023-08-15"),
        coordinates: {
            latitude: 12.9716,
            longitude: 77.5946,
        },
        infrastructure: {
            totalClassrooms: 8,
            hasLibrary: true,
            hasPlayground: true,
            hasToilets: true,
            separateToiletsForGirls: true,
            hasElectricity: true,
            hasWaterSupply: true,
            hasMidDayMealKitchen: true,
        },
        facilities: {
            computerLab: false,
            scienceLab: false,
            smartClassrooms: 2,
            rampForDisabled: true,
        },
        department: "education"
    },
    {
        //id: "school_002",
        name: "Government High School Malleswaram",
        address: "Malleswaram, Bangalore, Karnataka - 560003",
        schoolType: "Government",
        level: "secondary",
        principalName: "Mr. Rajesh Kumar",
        principalPhone: "+91 9876543211",
        totalStudents: 420,
        totalTeachers: 18,
        establishedYear: 1978,
        lastInspectionDate: new Date("2023-07-22"),
        coordinates: {
            latitude: 13.0067,
            longitude: 77.5667,
        },
        infrastructure: {
            totalClassrooms: 15,
            hasLibrary: true,
            hasPlayground: true,
            hasToilets: true,
            separateToiletsForGirls: true,
            hasElectricity: true,
            hasWaterSupply: true,
            hasMidDayMealKitchen: true,
        },
        facilities: {
            computerLab: true,
            scienceLab: true,
            smartClassrooms: 5,
            rampForDisabled: true,
        },
        department: "education"
    },
    {
        //id: "school_003",
        name: "Government Higher Secondary School Jayanagar",
        address: "Jayanagar 4th Block, Bangalore, Karnataka - 560011",
        schoolType: "Government",
        level: "higher_secondary",
        principalName: "Dr. Priya Sharma",
        principalPhone: "+91 9876543212",
        totalStudents: 680,
        totalTeachers: 28,
        establishedYear: 1965,
        lastInspectionDate: new Date("2023-09-10"),
        coordinates: {
            latitude: 12.9279,
            longitude: 77.5837,
        },
        infrastructure: {
            totalClassrooms: 22,
            hasLibrary: true,
            hasPlayground: true,
            hasToilets: true,
            separateToiletsForGirls: true,
            hasElectricity: true,
            hasWaterSupply: true,
            hasMidDayMealKitchen: true,
        },
        facilities: {
            computerLab: true,
            scienceLab: true,
            smartClassrooms: 8,
            rampForDisabled: true,
        },
        department: "education"
    },
    {
        //id: "school_004",
        name: "Government Primary School Whitefield",
        address: "Whitefield, Bangalore, Karnataka - 560066",
        schoolType: "Government",
        level: "primary",
        principalName: "Mrs. Lakshmi Devi",
        principalPhone: "+91 9876543213",
        totalStudents: 180,
        totalTeachers: 9,
        establishedYear: 1992,
        lastInspectionDate: new Date("2023-06-28"),
        coordinates: {
            latitude: 12.9698,
            longitude: 77.75,
        },
        infrastructure: {
            totalClassrooms: 6,
            hasLibrary: false,
            hasPlayground: true,
            hasToilets: true,
            separateToiletsForGirls: true,
            hasElectricity: true,
            hasWaterSupply: true,
            hasMidDayMealKitchen: true,
        },
        facilities: {
            computerLab: false,
            scienceLab: false,
            smartClassrooms: 1,
            rampForDisabled: false,
        },
        department: "education"
    },
    {
        //id: "school_005",
        name: "Government High School Electronic City",
        address: "Electronic City Phase 1, Bangalore, Karnataka - 560100",
        schoolType: "Government",
        level: "secondary",
        principalName: "Mr. Venkatesh Murthy",
        principalPhone: "+91 9876543214",
        totalStudents: 350,
        totalTeachers: 16,
        establishedYear: 2001,
        lastInspectionDate: new Date("2023-08-05"),
        coordinates: {
            latitude: 12.8456,
            longitude: 77.6603,
        },
        infrastructure: {
            totalClassrooms: 12,
            hasLibrary: true,
            hasPlayground: true,
            hasToilets: true,
            separateToiletsForGirls: true,
            hasElectricity: true,
            hasWaterSupply: true,
            hasMidDayMealKitchen: true,
        },
        facilities: {
            computerLab: true,
            scienceLab: true,
            smartClassrooms: 4,
            rampForDisabled: true,
        },
        department: "education"
    },
];

const Assignment = require('./models/Assignment');

const sampleLocations = [
    {
        name: "Government Primary School, Sector 1",
        address: "Sector 1, Block A, District XYZ",
        department: "education",
        coordinates: { latitude: 28.6139, longitude: 77.209 },
        schoolType: "Government",
        level: "primary",
        principalName: "Mr. Suresh Kumar",
        principalPhone: "+91 9876543215",
        totalStudents: 150,
        totalTeachers: 6,
        establishedYear: 2005,
        infrastructure: {
            totalClassrooms: 5,
            hasLibrary: true,
            hasPlayground: true,
            hasToilets: true
        }
    },
    {
        name: "Government High School, Sector 2",
        address: "Sector 2, Block B, District XYZ",
        department: "education",
        coordinates: { latitude: 28.7041, longitude: 77.1025 },
        schoolType: "Government",
        level: "secondary",
        principalName: "Mrs. Anita Desai",
        principalPhone: "+91 9876543216",
        totalStudents: 320,
        totalTeachers: 14,
        establishedYear: 1998,
        infrastructure: {
            totalClassrooms: 10,
            hasLibrary: true,
            hasPlayground: true,
            hasToilets: true
        }
    },
    // Keep other non-education locations simple as they might use different fields, 
    // but for now ensure they have basic school structure if they are in 'schools' collection
    {
        name: "Primary Health Center, Village ABC",
        address: "Village ABC, Block B, District XYZ",
        department: "health",
        coordinates: { latitude: 28.7041, longitude: 77.1025 },
        schoolType: "Facility",
        level: "primary_center",
        principalName: "Dr. A. Gupta", // In charge
        totalStudents: 0, // Not applicable but good to have default
        totalTeachers: 5, // Staff count
    },
    {
        name: "District Hospital, Main City",
        address: "Main City, District XYZ",
        department: "health",
        coordinates: { latitude: 28.5355, longitude: 77.391 },
        schoolType: "Hospital",
        level: "district",
        principalName: "Dr. S. K. Singh",
        totalStudents: 0,
        totalTeachers: 50,
    },
    {
        name: "Government School Kitchen, Sector 2",
        address: "Sector 2, Block C, District XYZ",
        department: "food",
        coordinates: { latitude: 28.5355, longitude: 77.391 },
        schoolType: "Facility",
        level: "kitchen",
    },
    {
        name: "School Construction Site, Village DEF",
        address: "Village DEF, Block D, District XYZ",
        department: "construction",
        coordinates: { latitude: 28.4595, longitude: 77.0266 },
        schoolType: "Site",
        level: "under_construction",
    },
];

const seedData = async () => {
    await connectDB();

    console.log('Seeding Users...');
    await User.deleteMany({});

    let createdUsers = [];
    for (const user of sampleUsers) {
        const salt = await bcrypt.genSalt(10);
        const plainPassword = `${user.aadhaar}${user.role}`;
        // Password format: aadhaar + role (e.g., 123456789012beo)
        user.password = await bcrypt.hash(plainPassword, salt);
        const newUser = await new User(user).save();
        createdUsers.push(newUser);
    }
    console.log('Users seeded');

    console.log('Seeding Schools/Locations...');
    await School.deleteMany({});

    let createdSchools = [];

    // Seed mockSchools
    for (const school of mockSchools) {
        const newSchool = await new School(school).save();
        createdSchools.push(newSchool);
    }

    // Seed sampleLocations
    for (const loc of sampleLocations) {
        const newLoc = {
            ...loc,
            schoolType: loc.schoolType || (loc.department === 'education' ? 'Government' : 'Facility'),
            // Ensure essential fields exist to prevent "Unknown" or N/A
            totalStudents: loc.totalStudents || 0,
            totalTeachers: loc.totalTeachers || 0,
            level: loc.level || 'other',
            principalName: loc.principalName || 'In Charge',
        };
        const savedLoc = await new School(newLoc).save();
        createdSchools.push(savedLoc);
    }
    console.log('Schools/Locations seeded');

    console.log('Seeding Assignments...');
    await Assignment.deleteMany({});

    // Create assignments for BEO (Education)
    const beoUser = createdUsers.find(u => u.role === 'beo');
    const eduSchools = createdSchools.filter(s => s.department === 'education');

    if (beoUser && eduSchools.length > 0) {
        // Assign 2 schools to BEO
        for (let i = 0; i < Math.min(2, eduSchools.length); i++) {
            await new Assignment({
                department: 'education',
                schoolId: eduSchools[i]._id,
                assignedTo: beoUser._id,
                deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
                specialInstructions: "Focus on infrastructure and mid-day meal quality.",
                priority: "high",
                status: "pending"
            }).save();
        }
    }

    // Create assignments for Health Officer
    const healthUser = createdUsers.find(u => u.role === 'officer' && u.department === 'health');
    const healthLocs = createdSchools.filter(s => s.department === 'health');

    if (healthUser && healthLocs.length > 0) {
        for (const loc of healthLocs) {
            await new Assignment({
                department: 'health',
                schoolId: loc._id,
                assignedTo: healthUser._id,
                deadline: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
                specialInstructions: "Check sanitation and medical supplies.",
                priority: "medium",
                status: "pending"
            }).save();
        }
    }

    console.log('Assignments seeded successfully');

    process.exit();
};

seedData();
