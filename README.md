# Government Inspection App

A comprehensive mobile and web application for managing government inspections across multiple departments including education, healthcare, food safety, construction, and more.

## 📋 Overview

The Government Inspection App is a full-stack application designed to streamline the inspection process for government agencies. It enables inspectors, DEOs (District Education Officers), CEOs, and administrators to conduct inspections, manage assignments, generate reports, and track approval workflows efficiently.

## ✨ Features

- **Multi-Department Support**: Separate dashboards and inspection forms for different departments:
  - Education
  - Healthcare
  - Food Safety
  - Construction
  - And more...

- **Inspection Management**:
  - Create and submit inspection forms
  - Digital signature capture
  - Photo documentation with camera/gallery upload
  - Location tracking
  - Real-time form validation

- **User Roles & Permissions**:
  - Admin Panel for system management
  - Inspector role for conducting inspections
  - DEO (District Education Officer) dashboard
  - CEO dashboard
  - Approver role for inspection review and approval

- **Assignment Management**:
  - Assign inspections to inspectors
  - Track assignment status
  - Performance analytics

- **Approval Workflow**:
  - Multi-level approval process
  - Email notifications
  - Audit tracking

- **Report Generation**:
  - PDF export functionality
  - Inspection reports and summaries
  - Analytics and statistics

- **Email Service**:
  - Automated email notifications
  - Assignment confirmations
  - Approval status updates

- **Authentication & Security**:
  - Secure JWT-based authentication
  - Password encryption with bcryptjs
  - Role-based access control

## 🏗️ Project Structure

```
government-inspection-app/
├── frontend/                    # React Native/Expo mobile app
│   ├── src/
│   │   ├── screens/            # Screen components for different roles
│   │   │   ├── AdminPanel.js
│   │   │   ├── LoginScreen.js
│   │   │   ├── dashboards/     # Department-specific dashboards
│   │   │   └── ...
│   │   ├── services/           # API services
│   │   │   ├── api.js          # Axios API client
│   │   │   ├── EmailService.js
│   │   │   └── PDFGenerator.js
│   │   ├── context/            # React contexts (e.g., AuthContext)
│   │   ├── navigation/         # Navigation setup
│   │   └── constants/          # App-wide constants
│   ├── package.json
│   └── README.md
├── backend/                     # Node.js/Express API
│   ├── routes/                 # API route handlers
│   │   ├── authRoutes.js
│   │   ├── inspectionRoutes.js
│   │   ├── assignmentRoutes.js
│   │   ├── approvalRoutes.js
│   │   ├── emailRoutes.js
│   │   └── ...
│   ├── models/                 # MongoDB Mongoose schemas
│   │   ├── User.js
│   │   ├── Inspection.js
│   │   ├── Assignment.js
│   │   ├── School.js
│   │   ├── Form.js
│   │   ├── Approval.js
│   │   ├── EmailLog.js
│   │   └── InspectionQuestion.js
│   ├── middleware/             # Express middleware
│   │   └── authMiddleware.js
│   ├── utils/                  # Utility functions
│   │   └── aiAnalysis.js
│   ├── server.js              # Entry point
│   ├── seed.js                # Database seeding
│   └── package.json
├── render.yaml                 # Deployment configuration
└── README.md                   # This file
```

## 🛠️ Technology Stack

### Frontend
- **React Native** - Cross-platform mobile development
- **Expo** - Managed React Native framework
- **React Navigation** - In-app navigation
- **Axios** - HTTP client
- **React Native Paper** - Material Design components
- **React Native Reanimated** - Animation library
- **Expo Camera & Image Picker** - Media capture
- **Expo Print** - PDF generation

### Backend
- **Node.js** - JavaScript runtime
- **Express.js** - Web application framework
- **MongoDB** - NoSQL database
- **Mongoose** - MongoDB object modeling
- **JWT (jsonwebtoken)** - Authentication
- **Bcryptjs** - Password hashing
- **Multer** - File upload handling
- **Nodemailer** - Email service
- **Cors** - Cross-origin resource sharing

## 📋 Prerequisites

- **Node.js** (v14 or higher)
- **npm** or **yarn** package manager
- **MongoDB** (local or Atlas)
- **Expo CLI** (for frontend development)
- **Android Studio** or **Xcode** (for native app development)

## 🚀 Installation

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/government-inspection-app.git
cd government-inspection-app
```

### 2. Backend Setup

```bash
cd backend
npm install
```

### 3. Frontend Setup

```bash
cd ../frontend
npm install
```

## 🔧 Configuration

### Environment Variables

Create a `.env` file in the `backend` directory with the following variables:

```env
# Server Configuration
PORT=5000

# MongoDB Configuration
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/government-inspection-db

# JWT Configuration
JWT_SECRET=your_jwt_secret_key_here
JWT_EXPIRE=7d

# Email Configuration
EMAIL_SERVICE=gmail
EMAIL_USER=your_email@gmail.com
EMAIL_PASSWORD=your_app_password

# Frontend Configuration
EXPO_PUBLIC_API_URL=http://localhost:5000
```

### Frontend Configuration

Update the API base URL in `frontend/src/services/api.js` or use the `EXPO_PUBLIC_API_URL` environment variable.

## 📱 Running the Application

### Backend

```bash
cd backend

# Development with nodemon (auto-restart on changes)
npm run dev

# Production
npm start
```

The backend API will be available at `http://localhost:5000`

### Frontend

```bash
cd frontend

# Start Expo development server
npm start

# Run on Android
npm run android

# Run on iOS
npm run ios

# Run on Web
npm run web
```

## 🔌 API Endpoints Overview

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout

### Users
- `GET /api/users` - List all users
- `GET /api/users/:id` - Get user details
- `PUT /api/users/:id` - Update user profile

### Schools
- `GET /api/schools` - List all schools
- `POST /api/schools` - Create school
- `PUT /api/schools/:id` - Update school
- `DELETE /api/schools/:id` - Delete school

### Inspections
- `GET /api/inspections` - List inspections
- `POST /api/inspections` - Create inspection
- `GET /api/inspections/:id` - Get inspection details
- `PUT /api/inspections/:id` - Update inspection
- `DELETE /api/inspections/:id` - Delete inspection

### Assignments
- `GET /api/assignments` - List assignments
- `POST /api/assignments` - Create assignment
- `PUT /api/assignments/:id` - Update assignment status

### Approvals
- `GET /api/approvals` - List approvals pending
- `POST /api/approvals` - Submit approval
- `PUT /api/approvals/:id` - Approve/Reject

### Forms
- `GET /api/forms` - List form templates
- `POST /api/forms` - Create form template
- `GET /api/forms/:id` - Get form details

### Questions
- `GET /api/questions` - List inspection questions
- `POST /api/questions` - Add question

### Email Logs
- `GET /api/emails` - Get email history
- `POST /api/emails/send` - Send email notification

## 📊 Department Dashboards

The application includes role-specific dashboards for:

- **Admin Dashboard** - System administration and user management
- **CEO Dashboard** - Executive overview and metrics
- **DEO Dashboard** - District Education Officer inspections
- **Education Dashboard** - Education sector inspections
- **Healthcare Dashboard** - Healthcare facility inspections
- **Food Dashboard** - Food safety inspections
- **Construction Dashboard** - Construction site inspections
- **Health Dashboard** - Health department inspections

## 🔐 Security Features

- JWT-based authentication
- Password encryption with bcryptjs
- Role-based access control (RBAC)
- CORS configuration
- Environmental variable protection
- Secure file upload with multer

## 📦 Database Models

- **User** - User accounts and profiles
- **School** - Educational institutions
- **Inspection** - Inspection records
- **InspectionQuestion** - Questions within inspections
- **Form** - Form templates
- **Assignment** - Inspector assignments
- **Approval** - Approval workflows
- **EmailLog** - Email communication logs

## 🚀 Deployment

The application is configured for deployment on **Render.com** using the `render.yaml` configuration file.

### Deploy on Render

1. Push your code to GitHub
2. Connect your repository to Render
3. Set environment variables in Render dashboard
4. Deploy the backend service

See `render.yaml` for deployment configuration.

## 📝 Database Seeding

To seed initial data:

```bash
cd backend
node seed.js
```

## 🔍 Testing

The application includes inspection form validation and error handling. Test the following:

- User authentication (login/registration)
- Inspection form submission
- File uploads (photos, signatures)
- Email notifications
- Approval workflow

## 📚 File Upload

Files are uploaded to the `/uploads` directory in the backend. Ensure proper permissions and storage capacity for production environments.

## 🐛 Troubleshooting

### Connection Issues
- Verify MongoDB connection string
- Check backend server is running
- Confirm API URL in frontend configuration

### Authentication Errors
- Verify JWT secret is set correctly
- Check token expiration
- Ensure user role permissions are configured

### Email Notifications
- Verify email service credentials
- Check email configuration in backend
- Review email logs for errors

## 📄 License

This project is licensed under the ISC License. See LICENSE file for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📞 Support

For support, please create an issue in the GitHub repository or contact the development team.

## 🔗 Useful Resources

- [React Native Documentation](https://reactnative.dev/)
- [Expo Documentation](https://docs.expo.dev/)
- [Express.js Guide](https://expressjs.com/)
- [MongoDB Documentation](https://docs.mongodb.com/)
- [JWT Authentication](https://jwt.io/)

---

