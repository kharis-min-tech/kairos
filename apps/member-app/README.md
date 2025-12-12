# Kairos Member App

A Next.js application providing church members with access to events, giving, fellowships, and community features.

## Features

- **Dashboard**: Personal overview with upcoming events, giving summary, and fellowship information
- **Events**: Browse and register for church events
- **Fellowships**: Join small groups and track attendance
- **Giving**: Make donations and view giving history
- **Messages**: Receive announcements and communications
- **Profile**: Manage personal information and preferences

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Development

```bash
# Install dependencies (from root)
npm install

# Start development server
npm run nx serve member-app

# Or using nx directly
nx serve member-app
```

The application will be available at `http://localhost:4201`

### Building

```bash
# Build for production
npm run nx build member-app

# Or using nx directly
nx build member-app
```

## Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── (auth)/            # Authentication routes
│   │   ├── login/         # Login page
│   │   └── register/      # Registration page
│   ├── (dashboard)/       # Protected dashboard routes
│   │   ├── dashboard/     # Main dashboard
│   │   ├── events/        # Events management
│   │   ├── fellowships/   # Fellowship groups
│   │   ├── giving/        # Donations and giving
│   │   ├── messages/      # Communications
│   │   └── profile/       # User profile
│   ├── globals.css        # Global styles
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Home page
└── components/            # Reusable components
    ├── Header.tsx         # Navigation header
    └── Sidebar.tsx        # Dashboard sidebar
```

## Environment Variables

Copy `.env.example` to `.env.local` and configure:

```bash
# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:3333

# App Configuration
NEXT_PUBLIC_APP_NAME="Kairos Member App"
NEXT_PUBLIC_APP_VERSION=1.0.0

# Authentication
NEXT_PUBLIC_AUTH_ENABLED=true

# Features
NEXT_PUBLIC_ENABLE_NOTIFICATIONS=true
NEXT_PUBLIC_ENABLE_GIVING=true
NEXT_PUBLIC_ENABLE_EVENTS=true
```

## Styling

This application uses:
- **Tailwind CSS** for utility-first styling
- **Custom design tokens** inspired by Kharis Church branding
- **Responsive design** for mobile and desktop

## Testing

```bash
# Run tests
npm run nx test member-app

# Run tests with coverage
npm run nx test member-app --coverage
```

## Linting

```bash
# Run ESLint
npm run nx lint member-app
```

## Architecture

The Member App follows these architectural principles:

- **App Router**: Uses Next.js 13+ App Router for file-based routing
- **Component-based**: Modular React components for reusability
- **TypeScript**: Full type safety throughout the application
- **Responsive**: Mobile-first design approach
- **Accessible**: WCAG compliant components and interactions

## Integration

The Member App integrates with:
- **Kairos API** (`apps/api`) for backend services
- **Shared Types** (`libs/shared/types`) for type definitions
- **UI Components** (`libs/shared/ui`) for design system components
- **Shared Utils** (`libs/shared/utils`) for common utilities

## Deployment

The application can be deployed to any platform that supports Next.js:

- Vercel (recommended)
- Netlify
- AWS Amplify
- Docker containers

Build artifacts are generated in `dist/apps/member-app/` when using the NX build command.