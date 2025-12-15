# Kairos Web Admin

The administrative web interface for the Kairos Church Management System. This Next.js application provides comprehensive tools for church staff, pastors, and administrators to manage all aspects of church operations.

## 🎯 Purpose

The Web Admin application serves as the primary administrative interface for:
- Church staff and administrators
- Pastors and ministry leaders
- Department heads and coordinators
- Financial administrators

## ✨ Key Features

### Dashboard & Analytics
- Real-time church statistics and KPIs
- Member growth and engagement metrics
- Financial summaries and trends
- Upcoming events and deadlines

### Member Management
- Complete member directory with profiles
- Member registration and onboarding
- Contact information and communication preferences
- Member status tracking and lifecycle management

### Department Management
- Department creation and configuration
- Member assignment to departments
- Department-specific reporting and analytics
- Service attendance tracking

### Fellowship Management (K-Groups)
- Small group creation and management
- Meeting scheduling and attendance tracking
- Group member management
- Fellowship reporting and analytics

### Event Management
- Event creation and configuration
- Registration management and check-in
- Attendance tracking and reporting
- Event-specific communication

### Financial Management
- Payment recording and tracking
- Pledge management and monitoring
- Financial reporting and analytics
- Giving statements and receipts

### Forms Management
- Dynamic form creation and configuration
- Form submission management and review
- Response analytics and reporting
- Form template library

### Communications
- Announcement creation and distribution
- Targeted messaging to specific groups
- Communication history and tracking
- Notification management

### Security & Administration
- User role and permission management
- Access control and security settings
- Audit logs and access tracking
- System configuration and settings

## 🚀 Getting Started

### Prerequisites
- Node.js 18.x or higher
- Access to the Kairos API backend
- Valid admin credentials

### Development Setup

1. **Navigate to the web-admin directory**
   ```bash
   cd apps/web-admin
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
   NEXT_PUBLIC_APP_NAME=Kairos Web Admin
   NEXT_PUBLIC_APP_VERSION=1.0.0
   ```

4. **Start the development server**
   ```bash
   # From root directory
   nx serve web-admin
   
   # Or with specific configuration
   nx serve web-admin --configuration=development
   ```

5. **Access the application**
   - Open [http://localhost:4200](http://localhost:4200) in your browser
   - Login with admin credentials

## 🏗️ Project Structure

```
apps/web-admin/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── (auth)/            # Authentication routes
│   │   │   ├── login/         # Login page
│   │   │   └── layout.tsx     # Auth layout
│   │   ├── (dashboard)/       # Protected dashboard routes
│   │   │   ├── dashboard/     # Main dashboard
│   │   │   ├── members/       # Member management
│   │   │   ├── departments/   # Department management
│   │   │   ├── fellowships/   # Fellowship management
│   │   │   ├── events/        # Event management
│   │   │   ├── finance/       # Financial management
│   │   │   ├── forms/         # Forms management
│   │   │   ├── reports/       # Reporting and analytics
│   │   │   ├── security/      # Security and RBAC
│   │   │   ├── settings/      # System settings
│   │   │   └── layout.tsx     # Dashboard layout
│   │   ├── globals.css        # Global styles
│   │   ├── layout.tsx         # Root layout
│   │   └── page.tsx           # Home page
│   ├── components/            # App-specific components
│   │   ├── Header.tsx         # Navigation header
│   │   ├── Sidebar.tsx        # Navigation sidebar
│   │   └── [feature]/         # Feature-specific components
│   ├── lib/                   # App-specific utilities
│   │   ├── api.ts            # API client configuration
│   │   ├── auth.ts           # Authentication utilities
│   │   └── utils.ts          # General utilities
│   └── styles/               # Additional styles
├── public/                   # Static assets
│   ├── favicon.ico
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

## 🎨 UI Components

The Web Admin application uses the shared UI component library (`@kairos/ui`) which provides:

### Design System
- Consistent color palette inspired by Kairos Church branding
- Typography scale and font families
- Spacing and layout utilities
- Responsive design patterns

### Core Components
- **Forms**: Input, Select, Checkbox, Radio, TextArea
- **Navigation**: Button, Link, Breadcrumb, Pagination
- **Layout**: Card, Modal, Dialog, Drawer, Tabs
- **Data Display**: Table, DataGrid, Badge, Avatar
- **Feedback**: Alert, Toast, Loading, Progress

### Usage Example
```tsx
import { Button, Card, Input, Modal } from '@kairos/ui';

export function MemberForm() {
  return (
    <Card>
      <form>
        <Input label="Full Name" required />
        <Input label="Email" type="email" required />
        <Button type="submit">Save Member</Button>
      </form>
    </Card>
  );
}
```

## 🔐 Authentication & Authorization

### Authentication Flow
1. User navigates to protected route
2. Redirected to `/login` if not authenticated
3. Login with email/password
4. JWT token stored securely
5. Redirected to intended destination

### Role-Based Access Control
- **Super Admin**: Full system access
- **Admin**: Church-wide administrative access
- **Pastor**: Ministry and member management
- **Department Head**: Department-specific access
- **Staff**: Limited operational access

### Protected Routes
All routes under `(dashboard)` require authentication and appropriate permissions.

## 📱 Responsive Design

The Web Admin interface is fully responsive and optimized for:
- **Desktop**: Primary interface (1200px+)
- **Tablet**: Adapted layout (768px - 1199px)
- **Mobile**: Simplified interface (< 768px)

## 🧪 Testing

### Unit Tests
```bash
# Run web-admin tests
nx test web-admin

# Run tests in watch mode
nx test web-admin --watch

# Run tests with coverage
nx test web-admin --coverage
```

### End-to-End Tests
```bash
# Run E2E tests
nx e2e web-admin-e2e

# Run E2E tests in headed mode
nx e2e web-admin-e2e --headed
```

### Test Structure
```
apps/web-admin/src/
├── components/
│   └── __tests__/          # Component tests
├── lib/
│   └── __tests__/          # Utility tests
└── app/
    └── __tests__/          # Page tests
```

## 🚀 Building & Deployment

### Development Build
```bash
nx build web-admin
```

### Production Build
```bash
nx build web-admin --configuration=production
```

### Docker Build
```bash
# Build Docker image
docker build -f apps/web-admin/Dockerfile -t kairos-web-admin .

# Run container
docker run -p 4200:3000 kairos-web-admin
```

### Environment Configurations

#### Development
- Source maps enabled
- Hot reloading
- Detailed error messages
- Development API endpoints

#### Production
- Optimized bundles
- Minified assets
- Error boundaries
- Production API endpoints
- Performance monitoring

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
  images: {
    domains: ['localhost'],
  },
};

const plugins = [withNx];

module.exports = composePlugins(...plugins)(nextConfig);
```

### Tailwind Configuration
Custom configuration extending the shared design system with admin-specific utilities.

## 📊 Performance

### Optimization Features
- **Code Splitting**: Automatic route-based splitting
- **Image Optimization**: Next.js Image component
- **Bundle Analysis**: Webpack bundle analyzer
- **Caching**: Aggressive caching strategies
- **Lazy Loading**: Component and route lazy loading

### Performance Monitoring
- Lighthouse CI integration
- Core Web Vitals tracking
- Performance budgets
- Bundle size monitoring

## 🐛 Debugging

### Development Tools
- React Developer Tools
- Next.js debugging
- Network request inspection
- State management debugging

### Logging
- Client-side error logging
- API request/response logging
- User action tracking
- Performance metrics

## 🔗 API Integration

### API Client Configuration
```typescript
// lib/api.ts
import { ApiClient } from '@kairos/shared-utils';

export const api = new ApiClient({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  timeout: 10000,
});
```

### Data Fetching Patterns
- Server Components for initial data
- Client Components for interactive data
- SWR for client-side caching
- Optimistic updates for better UX

## 📚 Additional Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [Kairos API Documentation](../api/README.md)
- [Shared UI Components](../../libs/shared/ui/README.md)

## 🤝 Contributing

When contributing to the Web Admin application:

1. Follow the established folder structure
2. Use TypeScript for all new code
3. Write tests for new components and utilities
4. Follow the design system guidelines
5. Ensure responsive design compatibility
6. Test across different user roles

## 📄 License

This project is part of the Kairos Church Management System and is licensed under the MIT License.