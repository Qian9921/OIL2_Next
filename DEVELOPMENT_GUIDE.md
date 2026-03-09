# OpenImpactLab Development Guide

## Project Overview

OpenImpactLab is a platform that connects students, teachers, and NGOs to create positive social impact through collaborative projects. The platform is designed with a cute, modern, and user-friendly interface specifically for international high school students.

## Tech Stack

- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS with custom design system
- **Database**: Firebase Firestore
- **Authentication**: NextAuth.js with Google OAuth
- **AI**: Google Vertex AI with Gemini models
- **UI Components**: Custom components with Radix UI primitives
- **Icons**: Lucide React
- **Animation**: Framer Motion and custom Tailwind animations
- **State Management**: React hooks

## Project Structure

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
│   │   ├── button.tsx     # Button with cute gradient variants
│   │   ├── card.tsx       # Card component for content
│   │   └── avatar.tsx     # Avatar with cute defaults
│   └── layout/            # Layout components
│       └── main-layout.tsx # Main app layout with sidebar
├── lib/
│   ├── firebase.ts        # Firebase configuration
│   ├── firestore.ts       # Database operations
│   ├── types.ts           # TypeScript type definitions
│   └── utils.ts           # Utility functions
└── types/
    └── next-auth.d.ts     # NextAuth type extensions
```

## Design System

### Color Palette
- **Primary Gradients**: Pink to Purple, Blue to Cyan
- **Background**: Light gradient from purple-50 to cyan-50
- **Cards**: White with subtle shadows and hover effects
- **Text**: Gray-900 for primary, Gray-600 for secondary

### Typography
- **Font**: Inter (Google Fonts)
- **Sizes**: Consistent scale from text-xs to text-3xl
- **Weights**: 300-700 range

### Components Style Guidelines

#### Buttons
- Gradient backgrounds for primary actions
- Rounded corners (rounded-lg)
- Hover animations with scale and shadow
- Loading states with spinners

#### Cards
- White background with subtle borders
- Rounded corners (rounded-xl)
- Hover effects that lift the card
- Consistent padding (p-6)

#### Layout
- Fixed sidebar on desktop (w-64)
- Responsive grid layouts
- Consistent spacing (space-y-6, gap-6)

## Database Schema

### Users Collection
```typescript
interface User {
  id: string;
  email: string;
  name: string;
  role: 'student' | 'teacher' | 'ngo';
  avatar?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  profile?: {
    bio?: string;
    school?: string;
    grade?: string;
    interests?: string[];
  };
}
```

### Projects Collection
```typescript
interface Project {
  id: string;
  title: string;
  description: string;
  ngoId: string;
  ngoName: string;
  status: 'draft' | 'published' | 'completed' | 'archived';
  currentParticipants: number;
  subtasks: Subtask[];
  // ... other fields
}
```

### Participations Collection
```typescript
interface Participation {
  id: string;
  projectId: string;
  studentId: string;
  status: 'active' | 'completed' | 'dropped';
  progress: number; // 0-100
  chatHistory: { [subtaskId: string]: ChatMessage[] };
  promptEvaluations?: {
    [subtaskId: string]: Array<{
      goalScore: number;
      contextScore: number;
      expectationsScore: number;
      sourceScore: number;
      overallScore: number;
      prompt: string;
      timestamp: Timestamp;
      streak: number;
      bestStreak: number;
    }>;
  };
  // ... other fields
}
```

## User Flows

### Student Journey
1. **Sign Up**: Google OAuth → Role Selection → Student Dashboard
2. **Browse Projects**: View available projects → Join project
3. **Work on Projects**: Complete subtasks → Chat with AI → Submit work
4. **Complete Projects**: Receive certificates → View achievements

### NGO Journey
1. **Sign Up**: Google OAuth → Role Selection → NGO Dashboard
2. **Create Projects**: Project details → Add subtasks → Publish
3. **Monitor Progress**: View participant stats → Review submissions
4. **Issue Certificates**: Approve completed work → Generate certificates

### Teacher Journey
1. **Sign Up**: Google OAuth → Role Selection → Teacher Dashboard
2. **Monitor Students**: View student projects → Check progress
3. **Review Learning**: Analyze chat histories → Provide feedback

## Environment Variables

Create a `.env.local` file with the following variables:

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
NEXTAUTH_SECRET=your-nextauth-secret
NEXTAUTH_URL=http://localhost:3000

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Google Cloud for Vertex AI
GOOGLE_CLOUD_PROJECT=your-gcp-project-id
GOOGLE_CLOUD_LOCATION=us-central1
GOOGLE_APPLICATION_CREDENTIALS=path/to/service-account-key.json

# Cron Job API Key
CRON_API_KEY=your-secure-random-string
```

## Development Guidelines

### Code Style
- Use TypeScript for all files
- Follow React hooks patterns
- Use async/await for Firebase operations
- Implement proper error handling
- Add loading states for all async operations

### Component Patterns
- Export components as named exports
- Use forwardRef for components that need refs
- Implement proper TypeScript interfaces
- Use className props for style customization

### State Management
- Use useState for local component state
- Use useEffect for side effects and data loading
- Implement proper cleanup in useEffect
- Use useSession for authentication state

### Styling Guidelines
- Use Tailwind utility classes
- Create reusable component variants with CVA
- Maintain consistent spacing and colors
- Implement hover and animation effects

## Building and Deployment

### Development
```bash
npm run dev
```

### Production Build
```bash
npm run build
npm start
```

### Environment Setup
1. Set up Firebase project
2. Enable Google Authentication
3. Configure Firestore security rules
4. Set up Google OAuth credentials
5. Deploy to Vercel or similar platform

## UI/UX Principles

### Student-Friendly Design
- Cute and approachable visual elements
- Clear navigation with icons
- Encouraging messages and emoji
- Progress indicators and achievements
- Responsive design for mobile use

### Accessibility
- Proper contrast ratios
- Keyboard navigation support
- Screen reader compatibility
- Focus indicators
- Semantic HTML structure

### Performance
- Optimized images and assets
- Lazy loading for heavy components
- Efficient database queries
- Proper caching strategies
- Minimal bundle size

## Future Enhancements

### Planned Features
- AI chatbot enhancements
- Real-time notifications
- File upload capabilities
- Video call integration
- Advanced analytics
- Mobile app development

### Technical Improvements
- Add comprehensive testing
- Implement CI/CD pipeline
- Add monitoring and logging
- Optimize performance
- Enhance security measures

## AI Integration

### Gemini AI Setup

The platform uses Google's Vertex AI service with Gemini models for AI capabilities. The setup involves:

1. Create a Google Cloud Project
2. Enable Vertex AI API in the project
3. Create a service account with Vertex AI User permissions
4. Download the service account key JSON file
5. Set the `GOOGLE_APPLICATION_CREDENTIALS` environment variable to point to this file

### Chat API Implementation

The chat functionality is implemented in `src/app/api/chat/route.ts`:

1. Chat messages are constructed with user input and system instructions
2. The Gemini model processes the request and generates a streaming response
3. The response is sent back to the client as a readable stream

### Prompt Quality Evaluation

The prompt evaluation system analyzes student prompts using AI:

1. When a student sends a message, `evaluatePromptWithAI` function assesses quality
2. The prompt is scored on four dimensions (Goal, Context, Expectations, Source)
3. Scores are returned in the response headers
4. Firebase stores these evaluations in the student's participation record

```typescript
// Example of prompt evaluation function
async function evaluatePromptWithAI(prompt: string, subtask: Subtask) {
  // Implementation details...
  return {
    goalScore: number,
    contextScore: number,
    expectationsScore: number,
    sourceScore: number,
    overallScore: number
  };
}
```

### Streak System Implementation

The streak system gamifies prompt quality:

1. `savePromptEvaluation` in `src/lib/firestore.ts` manages streak tracking
2. Streaks increase with good prompts (score ≥ 70%)
3. Streaks reset with poor quality prompts
4. The UI displays a streak badge with animations
5. Toast notifications provide feedback on streak progress

```typescript
// Streak badge implementation in page.tsx
{promptStreak && promptStreak.currentStreak > 0 && (
  <div 
    className={`flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
      promptStreak.currentStreak >= 5 ? 'bg-purple-100 text-purple-800' : 
      promptStreak.currentStreak >= 3 ? 'bg-green-100 text-green-800' : 
      'bg-blue-100 text-blue-800'
    } ${isStreakAnimating ? 'animate-bounce-short' : ''}`}
  >
    <span className="mr-1">🔥</span>
    <span>{promptStreak.currentStreak}</span>
  </div>
)}
```

### Custom Animations

The `tailwind.config.ts` file includes custom animations for the streak feature:

```typescript
theme: {
  extend: {
    keyframes: {
      'bounce-short': {
        '0%, 100%': { transform: 'translateY(0)' },
        '50%': { transform: 'translateY(-10px)' }
      }
    },
    animation: {
      'bounce-short': 'bounce-short 0.5s ease-in-out 3'
    }
  }
}
```

## Troubleshooting

### Common Issues
1. **Firebase Connection**: Check environment variables
2. **Authentication**: Verify Google OAuth setup
3. **Styling**: Ensure Tailwind CSS is properly configured
4. **Type Errors**: Check TypeScript interfaces
5. **Build Errors**: Verify all dependencies are installed

### Debug Tips
- Use browser developer tools
- Check Firebase console for errors
- Review Next.js build output
- Test authentication flow
- Validate database operations

---

This guide should be updated as the project evolves and new features are added. 