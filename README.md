# OpenImpactLab 🌟

A platform connecting students, teachers, and NGOs to create positive social impact through collaborative projects.

## ✨ Features

- **Three User Roles**: Students, Teachers, and NGOs with tailored experiences
- **Google Authentication**: Secure OAuth login with role selection
- **Project Management**: NGOs create projects, students join and complete them
- **Progress Tracking**: Real-time monitoring of student progress
- **AI Integration Ready**: Designed for future chatbot and LLM features
- **Modern UI**: Cute, student-friendly interface with smooth animations
- **Real-time Data**: Firebase Firestore for live updates

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ 
- Firebase account
- Google Cloud Console access for OAuth

### Installation

1. **Clone the repository**
   ```bash
   git clone [repository-url]
   cd oil2
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   
   Create a `.env.local` file in the root directory:
   
   ```env
   # Firebase Configuration
   NEXT_PUBLIC_FIREBASE_API_KEY=your-firebase-api-key
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
   NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id
   NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=your-measurement-id

   # NextAuth Configuration
   NEXTAUTH_SECRET=your-nextauth-secret-key
   NEXTAUTH_URL=http://localhost:3000

   # Google OAuth Configuration
   GOOGLE_CLIENT_ID=your-google-client-id
   GOOGLE_CLIENT_SECRET=your-google-client-secret
   ```

4. **Firebase Setup**
   
   - Create a new Firebase project
   - Enable Authentication with Google provider
   - Create Firestore database
   - Copy configuration values to `.env.local`

5. **Google OAuth Setup**
   
   - Go to Google Cloud Console
   - Enable Google+ API
   - Create OAuth 2.0 credentials
   - Add authorized redirect URIs:
     - `http://localhost:3000/api/auth/callback/google` (development)
     - `https://yourdomain.com/api/auth/callback/google` (production)

6. **Start the development server**
   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000) to view the application.

## 🏗️ Project Structure

```
src/
├── app/                     # Next.js App Router pages
│   ├── api/auth/           # NextAuth configuration
│   ├── auth/signin/        # Authentication pages
│   ├── student/            # Student dashboard and pages
│   ├── ngo/               # NGO dashboard and pages
│   ├── teacher/           # Teacher dashboard and pages
│   ├── layout.tsx         # Root layout with SessionProvider
│   └── globals.css        # Global styles
├── components/
│   ├── ui/                # Reusable UI components
│   └── layout/            # Layout components
├── lib/
│   ├── firebase.ts        # Firebase configuration
│   ├── firestore.ts       # Database operations
│   ├── types.ts           # TypeScript type definitions
│   └── utils.ts           # Utility functions
└── types/
    └── next-auth.d.ts     # NextAuth type extensions
```

## 👥 User Roles

### Students
- Browse and join projects
- Complete subtasks and track progress
- Chat with AI assistants (future feature)
- Earn certificates upon completion

### Teachers
- Monitor student progress
- Review submissions and provide feedback
- Access learning analytics and chat histories

### NGOs
- Create and manage impactful projects
- Monitor participant engagement
- Issue completion certificates
- Track project success metrics

## 🎨 Design System

### Color Palette
- **Primary**: Pink to Purple gradients
- **Secondary**: Blue to Cyan gradients
- **Background**: Light purple/pink/cyan gradients
- **Text**: Gray-900 primary, Gray-600 secondary

### Typography
- **Font**: Inter (Google Fonts)
- **Scale**: text-xs to text-3xl
- **Weights**: 300-700

### Components
- Rounded corners (rounded-lg/xl)
- Subtle shadows with hover effects
- Gradient backgrounds for primary actions
- Loading animations and micro-interactions

## 🛠️ Technology Stack

- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Database**: Firebase Firestore
- **Authentication**: NextAuth.js with Google OAuth
- **UI Components**: Custom components with Radix UI
- **Icons**: Lucide React
- **Animation**: Framer Motion (ready)

## 📱 Responsive Design

The application is fully responsive and optimized for:
- Desktop computers
- Tablets
- Mobile phones
- Touch interfaces

## 🔒 Security

- Secure authentication with Google OAuth
- Protected routes with session validation
- Firebase security rules
- Type-safe API endpoints
- Environment variable protection

## 🚀 Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Connect your repository to Vercel
3. Add environment variables in Vercel dashboard
4. Deploy automatically on push

### Manual Deployment

```bash
npm run build
npm start
```

## 🔧 Environment Variables Reference

| Variable | Description | Required |
|----------|-------------|----------|
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Firebase API key | ✅ |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Firebase auth domain | ✅ |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Firebase project ID | ✅ |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | Firebase storage bucket | ✅ |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Firebase messaging ID | ✅ |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | Firebase app ID | ✅ |
| `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID` | Firebase analytics ID | ❌ |
| `NEXTAUTH_SECRET` | NextAuth secret key | ✅ |
| `NEXTAUTH_URL` | Application URL | ✅ |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID | ✅ |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret | ✅ |

## 🐛 Troubleshooting

### Common Issues

1. **Firebase Connection Error**
   - Verify environment variables
   - Check Firebase project configuration
   - Ensure Firestore is enabled

2. **Google OAuth Error**
   - Check OAuth credentials
   - Verify authorized redirect URIs
   - Ensure Google+ API is enabled

3. **Build Errors**
   - Run `npm install` to ensure all dependencies
   - Check TypeScript errors
   - Verify all environment variables are set

4. **Styling Issues**
   - Ensure Tailwind CSS is properly configured
   - Check for conflicting CSS classes
   - Verify custom CSS variables

## 📚 Development Guide

See [DEVELOPMENT_GUIDE.md](./DEVELOPMENT_GUIDE.md) for detailed development guidelines, code patterns, and architecture decisions.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙋 Support

For support, please create an issue in the GitHub repository or contact the development team.

---

Made with ❤️ for creating positive impact in the world.
