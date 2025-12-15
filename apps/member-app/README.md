# Kairos Member App

The member-facing web application for the Kairos Church Management System. This Next.js application provides church members with self-service capabilities and access to church information and services.

## 🎯 Purpose

The Member App serves church members by providing:
- Personal dashboard and profile management
- Event registration and participation
- Giving and financial summaries
- Department and fellowship engagement
- Forms submission and communication

## ✨ Key Features

### Personal Dashboard
- Personalized welcome and church updates
- Upcoming events and important dates
- Recent giving summary
- Fellowship and department participation
- Quick access to frequently used features

### Profile Management
- Personal information updates
- Contact preferences and communication settings
- Family member management
- Profile photo and personal details
- Privacy and notification settings

### Event Registration
- Browse upcoming church events
- Online event registration
- Registration status and confirmations
- Event reminders and updates
- QR code check-in support

### Giving & Finance
- Online giving and donations
- Giving history and statements
- Pledge tracking and management
- Tax receipt downloads
- Recurring giving setup

### Fellowship Participation
- K-Group (small group) information
- Meeting schedules and locations
- Fellowship member directory
- Group communication and updates
- Attendance tracking

### Department Engagement
- Department membership and roles
- Service schedules and assignments
- Department announcements
- Resource access and downloads
- Volunteer opportunities

### Forms & Communication
- Access to church forms and surveys
- Form submission and tracking
- Receive announcements and messages
- Communication history
- Notification preferences

### Mobile-First Design
- Responsive design optimized for mobile
- Progressive Web App (PWA) capabilities
- Offline functionality for key features
- Touch-friendly interface
- Fast loading and performance

## 🚀 Getting Started

### Prerequisites
- Node.js 18.x or higher
- Access to the Kairos API backend
- Valid member credentials

### Development Setup

1. **Navigate to the member-app directory**
   ```bash
   cd apps/member-app
   ```

2. **Install dependencies** (from root)
   ```bash
   cd ../..
   npm install
   ```

3. **Configure environment variables**
   ```bash
   cp .env.example .env.local
   ```
   
   Update `.env.local` with your configuration:
   ```env
   NEXT_PUBLIC_API_URL=http://localhost:3333
   NEXT_PUBLIC_APP_NAME=Kairos Member App
   NEXT_PUBLIC_APP_VERSION=1.0.0
   NEXT_PUBLIC_CHURCH_NAME=Kairos Church
   ```

4. **Start the development server**
   ```bash
   # From root directory
   nx serve member-app
   
   # Or with specific configuration
   nx serve member-app --configuration=development
   ```

5. **Access the application**
   - Open [http://localhost:4201](http://localhost:4201) in your browser
   - Register as a new member or login with existing credentials

## 🏗️ Project Structure

```
apps/member-app/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── (auth)/            # Authentication routes
│   │   │   ├── login/         # Login page
│   │   │   ├── register/      # Member registration
│   │   │   └── layout.tsx     # Auth layout
│   │   ├── (dashboard)/       # Protected member routes
│   │   │   ├── dashboard/     # Member dashboard
│   │   │   ├── profile/       # Profile management
│   │   │   ├── events/        # Event browsing and registration
│   │   │   ├── giving/        # Giving and financial info
│   │   │   ├── fellowships/   # Fellowship participation
│   │   │   ├── messages/      # Communications and announcements
│   │   │   └── layout.tsx     # Dashboard layout
│   │   ├── globals.css        # Global styles
│   │   ├── layout.tsx         # Root layout
│   │   └── page.tsx           # Home/landing page
│   ├── components/            # App-specific components
│   │   ├── Header.tsx         # Navigation header
│   │   ├── Sidebar.tsx        # Navigation sidebar (mobile)
│   │   └── [feature]/         # Feature-specific components
│   ├── lib/                   # App-specific utilities
│   │   ├── api.ts            # API client configuration
│   │   ├── auth.ts           # Authentication utilities
│   │   └── utils.ts          # General utilities
│   └── styles/               # Additional styles
├── public/                   # Static assets
│   ├── favicon.ico
│   ├── manifest.json         # PWA manifest
│   └── images/
├── .env.example             # Environment variables template
├── .eslintrc.json          # ESLint configuration
├── jest.config.ts          # Jest testing configuration
├── next.config.js          # Next.js configuration
├── postcss.config.js       # PostCSS configuration
├── project.json            # NX project configuration
├── tailwind.config.js      # Tailwind CSS configuration
└── tsconfig.json           # TypeScript configuration
```

## 🎨 UI Components & Design

### Mobile-First Approach
The Member App is designed with a mobile-first approach, ensuring optimal experience on:
- **Mobile Phones**: Primary target (320px - 767px)
- **Tablets**: Adapted layout (768px - 1023px)
- **Desktop**: Enhanced experience (1024px+)

### Design System
Uses the shared UI component library (`@kairos/ui`) with member-specific customizations:

```tsx
import { Button, Card, Input, Badge } from '@kairos/ui';

export function EventCard({ event }) {
  return (
    <Card className="member-event-card">
      <div className="event-header">
        <h3>{event.title}</h3>
        <Badge variant={event.status}>{event.status}</Badge>
      </div>
      <p className="event-date">{event.date}</p>
      <Button 
        variant="primary" 
        size="sm"
        onClick={() => registerForEvent(event.id)}
      >
        Register
      </Button>
    </Card>
  );
}
```

### Member-Specific Components
- **EventCard**: Event display and registration
- **GivingWidget**: Quick giving interface
- **FellowshipCard**: Fellowship information display
- **ProfileForm**: Member profile editing
- **NotificationBell**: Real-time notifications
- **QuickActions**: Common member actions

## 🔐 Authentication & Member Registration

### Registration Flow
1. New member visits registration page
2. Fills out basic information form
3. Email verification process
4. Profile completion
5. Welcome and onboarding

### Authentication
- Email/password authentication
- "Remember me" functionality
- Password reset capability
- Secure session management
- Automatic logout on inactivity

### Member Verification
- Email verification required
- Admin approval process (optional)
- Member status tracking
- Access level management

## 📱 Progressive Web App (PWA)

### PWA Features
- **Installable**: Add to home screen
- **Offline Support**: Key features work offline
- **Push Notifications**: Event reminders and updates
- **Background Sync**: Sync data when connection restored
- **Fast Loading**: Service worker caching

### Offline Capabilities
- View cached event information
- Access giving history
- Read downloaded messages
- Submit forms (sync when online)
- Basic profile information

## 🧪 Testing

### Unit Tests
```bash
# Run member-app tests
nx test member-app

# Run tests in watch mode
nx test member-app --watch

# Run tests with coverage
nx test member-app --coverage
```

### End-to-End Tests
```bash
# Run E2E tests
nx e2e member-app-e2e

# Run E2E tests on mobile viewport
nx e2e member-app-e2e --config mobile
```

### Mobile Testing
- Responsive design testing
- Touch interaction testing
- Performance on mobile devices
- PWA functionality testing
- Cross-browser mobile testing

## 🚀 Building & Deployment

### Development Build
```bash
nx build member-app
```

### Production Build
```bash
nx build member-app --configuration=production
```

### PWA Build
The production build automatically includes PWA optimizations:
- Service worker generation
- Manifest file processing
- Asset caching strategies
- Offline page generation

### Docker Build
```bash
# Build Docker image
docker build -f apps/member-app/Dockerfile -t kairos-member-app .

# Run container
docker run -p 4201:3000 kairos-member-app
```

## 🔧 Configuration

### Next.js Configuration (`next.config.js`)
```javascript
const { composePlugins, withNx } = require('@nx/next');

const nextConfig = {
  nx: {
    svgr: false,
  },
  experimental: {
    appDir: true,
  },
  // PWA configuration
  pwa: {
    dest: 'public',
    register: true,
    skipWaiting: true,
  },
  images: {
    domains: ['localhost'],
  },
};

const plugins = [withNx];

module.exports = composePlugins(...plugins)(nextConfig);
```

### PWA Manifest (`public/manifest.json`)
```json
{
  "name": "Kairos Member App",
  "short_name": "Kairos",
  "description": "Kairos Church Member Application",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#0284c7",
  "icons": [
    {
      "src": "/icon-192x192.png",
      "sizes": "192x192",
      "type": "image/png"
    }
  ]
}
```

## 📊 Performance Optimization

### Mobile Performance
- **Bundle Size**: Optimized for mobile networks
- **Image Optimization**: WebP format with fallbacks
- **Lazy Loading**: Progressive content loading
- **Caching**: Aggressive caching for repeat visits
- **Compression**: Gzip/Brotli compression

### Performance Metrics
- First Contentful Paint (FCP) < 1.5s
- Largest Contentful Paint (LCP) < 2.5s
- Cumulative Layout Shift (CLS) < 0.1
- First Input Delay (FID) < 100ms

## 🔔 Notifications & Communication

### Push Notifications
- Event reminders
- Important announcements
- Fellowship updates
- Giving confirmations
- System notifications

### In-App Messaging
- Announcement display
- Personal messages
- System alerts
- Feature updates
- Welcome messages

## 🔗 API Integration

### Member-Specific Endpoints
```typescript
// lib/api.ts
export const memberApi = {
  // Profile management
  getProfile: () => api.get('/members/profile'),
  updateProfile: (data) => api.put('/members/profile', data),
  
  // Events
  getEvents: () => api.get('/events/upcoming'),
  registerForEvent: (eventId) => api.post(`/events/${eventId}/register`),
  
  // Giving
  getGivingHistory: () => api.get('/giving/history'),
  submitGiving: (data) => api.post('/giving', data),
  
  // Fellowships
  getFellowships: () => api.get('/fellowships/my-fellowships'),
  joinFellowship: (fellowshipId) => api.post(`/fellowships/${fellowshipId}/join`),
};
```

### Data Synchronization
- Real-time updates via WebSocket
- Optimistic UI updates
- Background data refresh
- Conflict resolution
- Offline queue management

## 🛡️ Security & Privacy

### Data Protection
- Secure API communication (HTTPS)
- JWT token management
- Local storage encryption
- Session timeout handling
- Privacy-first design

### Member Privacy
- Granular privacy settings
- Data access controls
- Communication preferences
- Profile visibility options
- Data export capabilities

## 📚 Additional Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [PWA Best Practices](https://web.dev/pwa/)
- [Mobile Web Performance](https://web.dev/mobile/)
- [Kairos API Documentation](../api/README.md)
- [Shared UI Components](../../libs/shared/ui/README.md)

## 🤝 Contributing

When contributing to the Member App:

1. Test on multiple mobile devices
2. Ensure PWA functionality works
3. Follow mobile-first design principles
4. Test offline capabilities
5. Verify performance metrics
6. Consider accessibility on mobile
7. Test touch interactions

## 📄 License

This project is part of the Kairos Church Management System and is licensed under the MIT License.