# OpenImpactLab Beta 🌟

A platform connecting students, teachers, and NGOs to create positive social impact through collaborative projects.

## ✨ Features

- **Three User Roles**: Students, Teachers, and NGOs with tailored experiences
- **Google Authentication**: Secure OAuth login with role selection
- **Project Management**: NGOs create projects, students join and complete them
- **Progress Tracking**: Real-time monitoring of student progress
- **AI Integration**: Gemini AI-powered chat tutor and prompt quality evaluation
- **Prompt Engineering Gamification**: Streak tracking for high-quality prompts
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
- Chat with AI assistants for guidance
- Receive prompt quality feedback and build streaks
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
- **AI**: Google Vertex AI with Gemini models
- **UI Components**: Custom components with Radix UI
- **Icons**: Lucide React
- **Animation**: Framer Motion and custom Tailwind animations

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
| `GOOGLE_CLOUD_PROJECT` | Google Cloud project ID for Vertex AI | ✅ |
| `GOOGLE_CLOUD_LOCATION` | Google Cloud region for Vertex AI | ✅ |
| `GOOGLE_APPLICATION_CREDENTIALS` | Path to GCP service account key | ✅ |
| `CRON_API_KEY` | API key for automated tasks | ✅ |

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

## 🎮 AI Features

### Chat with AI Tutor
- Students can chat with an AI tutor specialized for each subtask
- The AI provides guidance without giving direct answers
- Support for text and image inputs

### Prompt Quality Evaluation
- AI evaluates student prompts on four dimensions:
  - Goal clarity (0-100)
  - Context information (0-100)
  - Expectations specification (0-100)
  - Source references (0-100)
- Overall score and detailed feedback shown after each prompt
- All evaluations saved to Firebase for future analysis

### Prompt Streak System
- Gamified learning experience with streak tracking
- Streaks increase with high-quality prompts (70%+ score)
- Visual streak badge with animations
- Toast notifications celebrate milestones
- Increasing enthusiasm for longer streaks
- Personal best tracking for motivation

For detailed documentation on AI features, see [AI-FEATURES.md](./AI-FEATURES.md).

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

Hello! Li-Ta is starting coding here. 

Li-Ta's first trial to merge from a branch to the master. 

## Firebase 连接问题解决方案

### 问题描述
项目中可能会遇到 Firebase Firestore 连接错误，典型错误信息：
```
FirebaseError: [code=unavailable]: The operation could not be completed
```

### 解决方案特性

#### 1. 智能重试机制
- **指数退避重试**：网络错误时自动重试，延迟时间逐渐增加
- **最大重试次数**：默认 3 次重试，避免无限循环
- **网络状态检测**：区分网络错误和其他错误类型

#### 2. 离线持久化
- **自动启用**：优先尝试多标签页持久化，失败后回退到单标签页
- **数据缓存**：网络断开时使用本地缓存数据
- **自动同步**：网络恢复后自动同步离线数据

#### 3. 连接状态监控
- **实时监控**：检测网络连接状态变化
- **自动重连**：网络恢复时自动重新连接 Firebase
- **状态指示器**：开发环境中显示连接状态（🟢 在线，🔴 离线，💾 持久化已启用）

#### 4. 错误日志优化
- **噪音过滤**：开发环境中过滤掉预期的网络错误警告
- **智能日志**：只记录重要错误，避免日志污染
- **错误分类**：区分网络错误和业务逻辑错误

### 使用方法

#### 开发环境监控
在开发环境中，右上角会显示 Firebase 连接状态：
- 🟢 Firebase 在线
- 🔴 Firebase 离线
- 💾 离线持久化已启用

#### 手动重连
```typescript
import { forceFirebaseReconnect } from '@/lib/utils';

// 强制重连 Firebase
await forceFirebaseReconnect();
```

#### 检查连接状态
```typescript
import { getFirebaseConnectionStatus } from '@/lib/utils';

const status = getFirebaseConnectionStatus();
console.log(status); // { isOnline: true, persistenceEnabled: true, timestamp: "..." }
```

### 技术实现

#### 网络错误检测
系统会自动检测以下错误类型：
- `unavailable` - 服务不可用
- `deadline-exceeded` - 请求超时
- `internal` - 内部错误
- 网络连接相关错误

#### 重试策略
- 基础延迟：1000ms
- 指数退避：每次重试延迟翻倍
- 最大重试：3次
- 非网络错误：不重试，直接抛出

#### 离线持久化
1. 优先尝试 `enableMultiTabIndexedDbPersistence`
2. 失败后回退到 `enableIndexedDbPersistence`
3. 都失败时仍可正常使用，但无离线功能

### 配置选项

可以通过修改 `src/lib/firebase.ts` 中的常量来调整：
- `MAX_RECONNECT_ATTEMPTS` - 最大重连次数
- `RECONNECT_DELAY_BASE` - 重连基础延迟
- `MAX_RETRY_ATTEMPTS` - 最大重试次数

### 故障排除

1. **持续连接问题**：
   - 检查网络连接
   - 确认 Firebase 配置正确
   - 查看浏览器控制台是否有其他错误

2. **持久化失败**：
   - 确认浏览器支持 IndexedDB
   - 检查浏览器存储限制
   - 尝试清除浏览器缓存

3. **重试无效**：
   - 可能是 Firebase 服务端问题
   - 检查 Firebase 控制台状态
   - 尝试手动重连

### 注意事项
- 开发环境中会显示详细的连接状态
- 生产环境中会抑制不必要的错误日志
- 所有 Firebase 操作都自动包含重试机制
- 网络恢复时会自动重新连接
