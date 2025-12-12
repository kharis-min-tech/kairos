# Web Admin Application

This is the administrative web interface for the Kairos Church Management System, built with Next.js 14 and the App Router.

## Features

- **Dashboard**: Overview of key metrics and recent activity
- **Members Management**: Manage church members and their profiles
- **Departments**: Organize ministry departments and leadership
- **Fellowships**: Manage K-Groups and small group meetings
- **Events**: Create and manage church events and registrations
- **Finance**: Track giving, pledges, and financial reports
- **Forms**: Dynamic form builder and submission management
- **Reports**: Generate comprehensive analytics and reports
- **Security**: Role-based access control and permissions
- **Settings**: Configure application and branch settings

## Technology Stack

- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS with custom design system
- **Fonts**: Inter (body), Poppins (headings)
- **Port**: 4200 (development)

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Development

```bash
# Start the development server
nx serve web-admin

# Or using npm
npm run dev

# Build for production
nx build web-admin

# Run tests
nx test web-admin

# Lint code
nx lint web-admin
```

The application will be available at `http://localhost:4200`.

## Project Structure

```
apps/web-admin/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── (auth)/            # Authentication routes
│   │   │   └── login/
│   │   ├── (dashboard)/       # Protected dashboard routes
│   │   │   ├── dashboard/
│   │   │   ├── members/
│   │   │   ├── departments/
│   │   │   ├── fellowships/
│   │   │   ├── events/
│   │   │   ├── finance/
│   │   │   ├── forms/
│   │   │   ├── reports/
│   │   │   ├── security/
│   │   │   └── settings/
│   │   ├── globals.css        # Global styles
│   │   ├── layout.tsx         # Root layout
│   │   └── page.tsx           # Home page
│   └── components/            # Shared components
│       ├── Header.tsx
│       └── Sidebar.tsx
├── public/                    # Static assets
├── .env.example              # Environment variables template
├── next.config.js            # Next.js configuration
├── tailwind.config.js        # Tailwind CSS configuration
├── tsconfig.json             # TypeScript configuration
└── README.md                 # This file
```

## Environment Variables

Copy `.env.example` to `.env.local` and configure:

```bash
# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:3333

# Authentication
NEXTAUTH_SECRET=your-secret-key-here
NEXTAUTH_URL=http://localhost:4200

# Database (if needed for direct access)
DATABASE_URL=postgresql://user:password@localhost:5432/kairos
```

## Design System

The application uses a custom design system inspired by Kharis Church branding:

### Colors
- **Primary**: Blue tones (#0ea5e9 to #0c4a6e)
- **Accent**: Gold/yellow tones (#eab308 to #713f12)
- **Neutral**: Grayscale for text and backgrounds

### Typography
- **Body**: Inter font family
- **Headings**: Poppins font family

### Components
- Consistent spacing and sizing
- Accessible color contrasts
- Responsive design patterns

## Authentication

The application includes authentication routes:
- `/login` - User login page
- Protected routes require authentication

## Navigation

The sidebar navigation includes:
- Dashboard overview
- All major functional modules
- Visual icons for easy identification
- Active state highlighting

## Development Guidelines

1. **File Organization**: Use the established folder structure
2. **Styling**: Use Tailwind CSS classes, follow the design system
3. **Components**: Create reusable components in `/src/components`
4. **Types**: Import shared types from `@kairos/shared-types`
5. **API Calls**: Use environment variables for API endpoints

## Integration

This application integrates with:
- **API Backend**: NestJS API at `NEXT_PUBLIC_API_URL`
- **Shared Libraries**: 
  - `@kairos/shared-types` for TypeScript interfaces
  - `@kairos/shared-utils` for utility functions
  - `@kairos/ui` for shared UI components

## Deployment

The application can be deployed as a static site or with server-side rendering:

```bash
# Build for production
nx build web-admin

# The built files will be in dist/apps/web-admin
```

## Contributing

1. Follow the established code style and patterns
2. Use TypeScript for all new code
3. Write tests for new functionality
4. Follow the component and routing conventions
5. Update documentation as needed