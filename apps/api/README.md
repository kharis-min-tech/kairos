# Kairos API

The backend REST API for the Kairos Church Management System. Built with NestJS, this API provides a comprehensive set of endpoints to support all church management operations across web and mobile applications.

## 🎯 Purpose

The Kairos API serves as the central backend for:
- Web Admin application
- Member App application
- Future mobile applications
- Third-party integrations
- Reporting and analytics systems

## ✨ Key Features

### Modular Architecture
- **Domain-Driven Design**: Organized by business domains
- **Independent Modules**: Each domain operates independently
- **Shared Services**: Common functionality across modules
- **Clean Interfaces**: Well-defined module boundaries

### Core Domains
- **Members**: Member management and profiles
- **Departments**: Ministry department operations
- **Fellowships**: Small group (K-Group) management
- **Events**: Event management and registration
- **Finance**: Payment processing and giving
- **Forms**: Dynamic form system
- **Communications**: Messaging and announcements
- **Security**: Authentication and authorization
- **Settings**: System configuration
- **Outreach**: Evangelism and soul winning

### Technical Features
- **RESTful API**: Standard HTTP methods and status codes
- **JWT Authentication**: Secure token-based authentication
- **Role-Based Access Control**: Granular permission system
- **Input Validation**: Comprehensive request validation
- **Error Handling**: Consistent error responses
- **API Documentation**: Swagger/OpenAPI documentation
- **Database Integration**: Prisma ORM with PostgreSQL
- **Caching**: Redis caching for performance
- **Logging**: Structured logging and monitoring

## 🚀 Getting Started

### Prerequisites
- Node.js 18.x or higher
- PostgreSQL 15.x or higher
- Redis (optional, for caching)

### Development Setup

1. **Navigate to the API directory**
   ```bash
   cd apps/api
   ```

2. **Install dependencies** (from root)
   ```bash
   cd ../..
   npm install
   ```

3. **Configure environment variables**
   ```bash
   cp apps/api/.env.example apps/api/.env
   ```
   
   Update `.env` with your configuration:
   ```env
   # Database
   DATABASE_URL="postgresql://username:password@localhost:5432/kairos"
   
   # Authentication
   JWT_SECRET="your-super-secret-jwt-key"
   JWT_EXPIRES_IN="7d"
   
   # Server
   PORT=3333
   NODE_ENV=development
   
   # Redis (optional)
   REDIS_URL="redis://localhost:6379"
   
   # Email (for notifications)
   SMTP_HOST="smtp.gmail.com"
   SMTP_PORT=587
   SMTP_USER="your-email@gmail.com"
   SMTP_PASS="your-app-password"
   ```

4. **Set up the database**
   ```bash
   cd apps/api
   
   # Generate Prisma client
   npx prisma generate
   
   # Run migrations
   npx prisma migrate dev --name init
   
   # Seed the database (optional)
   npx prisma db seed
   ```

5. **Start the development server**
   ```bash
   # From root directory
   nx serve api
   
   # Or from api directory
   npm run start:dev
   ```

6. **Access the API**
   - API: [http://localhost:3333](http://localhost:3333)
   - Swagger Documentation: [http://localhost:3333/api](http://localhost:3333/api)
   - Health Check: [http://localhost:3333/health](http://localhost:3333/health)

## 🏗️ Project Structure

```
apps/api/
├── src/
│   ├── app/                    # Application module
│   │   ├── app.controller.ts   # Root controller
│   │   ├── app.module.ts       # Root module
│   │   └── app.service.ts      # Root service
│   ├── modules/                # Domain modules
│   │   ├── members/            # Member management
│   │   │   ├── dto/           # Data Transfer Objects
│   │   │   ├── entities/      # Database entities
│   │   │   ├── members.controller.ts
│   │   │   ├── members.module.ts
│   │   │   └── members.service.ts
│   │   ├── departments/        # Department management
│   │   ├── fellowships/        # Fellowship management
│   │   ├── events/            # Event management
│   │   ├── finance/           # Financial management
│   │   ├── forms/             # Forms system
│   │   ├── communications/    # Messaging system
│   │   ├── security/          # Auth and RBAC
│   │   ├── settings/          # System settings
│   │   └── outreach/          # Outreach programs
│   ├── common/                # Shared utilities
│   │   ├── decorators/        # Custom decorators
│   │   ├── filters/           # Exception filters
│   │   ├── guards/            # Auth guards
│   │   ├── interceptors/      # HTTP interceptors
│   │   ├── pipes/             # Validation pipes
│   │   └── types/             # Common types
│   ├── prisma/                # Database configuration
│   │   ├── prisma.module.ts   # Prisma module
│   │   └── prisma.service.ts  # Prisma service
│   └── main.ts                # Application entry point
├── prisma/                    # Database schema and migrations
│   ├── migrations/            # Database migrations
│   ├── schema.prisma          # Database schema
│   └── seed.ts               # Database seeding
├── test/                      # Integration tests
├── .env.example              # Environment variables template
├── Dockerfile                # Docker configuration
├── jest.config.ts            # Jest testing configuration
├── nest-cli.json             # NestJS CLI configuration
├── project.json              # NX project configuration
└── tsconfig.json             # TypeScript configuration
```

## 🔌 API Endpoints

### Authentication
```
POST   /auth/login              # User login
POST   /auth/register           # User registration
POST   /auth/refresh            # Refresh JWT token
POST   /auth/logout             # User logout
POST   /auth/forgot-password    # Password reset request
POST   /auth/reset-password     # Password reset confirmation
```

### Members
```
GET    /members                 # List all members
POST   /members                 # Create new member
GET    /members/:id             # Get member by ID
PUT    /members/:id             # Update member
DELETE /members/:id             # Delete member
GET    /members/:id/profile     # Get member profile
PUT    /members/:id/profile     # Update member profile
GET    /members/:id/giving      # Get member giving history
```

### Departments
```
GET    /departments             # List all departments
POST   /departments             # Create new department
GET    /departments/:id         # Get department by ID
PUT    /departments/:id         # Update department
DELETE /departments/:id         # Delete department
GET    /departments/:id/members # Get department members
POST   /departments/:id/members # Add member to department
DELETE /departments/:id/members/:memberId # Remove member
```

### Fellowships
```
GET    /fellowships            # List all fellowships
POST   /fellowships            # Create new fellowship
GET    /fellowships/:id        # Get fellowship by ID
PUT    /fellowships/:id        # Update fellowship
DELETE /fellowships/:id        # Delete fellowship
GET    /fellowships/:id/members # Get fellowship members
POST   /fellowships/:id/join   # Join fellowship
POST   /fellowships/:id/meetings # Create meeting
GET    /fellowships/:id/meetings # Get meetings
```

### Events
```
GET    /events                 # List all events
POST   /events                 # Create new event
GET    /events/:id             # Get event by ID
PUT    /events/:id             # Update event
DELETE /events/:id             # Delete event
POST   /events/:id/register    # Register for event
GET    /events/:id/registrations # Get event registrations
POST   /events/:id/checkin     # Check-in to event
```

### Finance
```
GET    /finance/payments       # List payments
POST   /finance/payments       # Record payment
GET    /finance/payments/:id   # Get payment by ID
GET    /finance/pledges        # List pledges
POST   /finance/pledges        # Create pledge
GET    /finance/reports        # Financial reports
GET    /finance/statements/:memberId # Member giving statement
```

### Forms
```
GET    /forms                  # List all forms
POST   /forms                  # Create new form
GET    /forms/:id              # Get form by ID
PUT    /forms/:id              # Update form
DELETE /forms/:id              # Delete form
POST   /forms/:id/submit       # Submit form response
GET    /forms/:id/submissions  # Get form submissions
```

### Communications
```
GET    /communications/announcements # List announcements
POST   /communications/announcements # Create announcement
GET    /communications/messages      # List messages
POST   /communications/messages      # Send message
GET    /communications/notifications # Get notifications
PUT    /communications/notifications/:id/read # Mark as read
```

### Security
```
GET    /security/roles         # List roles
POST   /security/roles         # Create role
GET    /security/permissions   # List permissions
POST   /security/users/:id/roles # Assign role to user
GET    /security/audit-logs    # Get audit logs
GET    /security/access-logs   # Get access logs
```

## 🔐 Authentication & Authorization

### JWT Authentication
```typescript
// Example protected endpoint
@Controller('members')
@UseGuards(JwtAuthGuard)
export class MembersController {
  @Get()
  @Roles('admin', 'pastor')
  @UseGuards(RolesGuard)
  async findAll() {
    return this.membersService.findAll();
  }
}
```

### Role-Based Access Control
- **Super Admin**: Full system access
- **Admin**: Church-wide administrative access
- **Pastor**: Ministry and member management
- **Department Head**: Department-specific access
- **Member**: Limited self-service access

### Permission System
```typescript
// Custom permissions decorator
@Permissions('members:read', 'members:write')
@UseGuards(PermissionsGuard)
async updateMember(@Param('id') id: string, @Body() updateDto: UpdateMemberDto) {
  return this.membersService.update(id, updateDto);
}
```

## 🗄️ Database Schema

### Core Entities

#### User & Authentication
```prisma
model User {
  id          String   @id @default(cuid())
  email       String   @unique
  password    String
  userType    UserType
  mfaEnabled  Boolean  @default(false)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  member      Member?
  roles       UserRole[]
  accessLogs  AccessLog[]
  auditLogs   AuditLog[]
}

model Role {
  id          String @id @default(cuid())
  name        String @unique
  description String?
  permissions String[]
  
  userRoles   UserRole[]
}
```

#### Member Management
```prisma
model Member {
  id              String     @id @default(cuid())
  userId          String?    @unique
  memberNumber    String     @unique
  firstName       String
  lastName        String
  email           String?
  phone           String?
  dateOfBirth     DateTime?
  gender          Gender?
  maritalStatus   MaritalStatus?
  address         String?
  city            String?
  state           String?
  zipCode         String?
  country         String     @default("Nigeria")
  joinDate        DateTime   @default(now())
  memberStatus    MemberStatus @default(ACTIVE)
  branchId        String
  
  user            User?      @relation(fields: [userId], references: [id])
  branch          Branch     @relation(fields: [branchId], references: [id])
  
  // Relationships
  departmentMembers    DepartmentMember[]
  fellowshipMembers    FellowshipMember[]
  eventRegistrations   EventRegistration[]
  payments            Payment[]
  pledges             Pledge[]
  formSubmissions     FormSubmission[]
}
```

### Database Operations
```bash
# Generate Prisma client
npx prisma generate

# Create migration
npx prisma migrate dev --name migration_name

# Apply migrations
npx prisma migrate deploy

# Reset database
npx prisma migrate reset

# View database
npx prisma studio

# Seed database
npx prisma db seed
```

## 🧪 Testing

### Unit Tests
```bash
# Run all tests
nx test api

# Run specific module tests
nx test api --testNamePattern="MembersService"

# Run tests with coverage
nx test api --coverage
```

### Integration Tests
```bash
# Run integration tests
npm run test:e2e

# Run specific integration test
npm run test:e2e -- --testNamePattern="Members"
```

### Test Structure
```
apps/api/src/
├── modules/
│   └── members/
│       ├── members.controller.spec.ts    # Controller tests
│       ├── members.service.spec.ts       # Service tests
│       └── members.integration.spec.ts   # Integration tests
└── test/
    ├── app.e2e-spec.ts                  # E2E tests
    └── helpers/                         # Test utilities
```

### Example Test
```typescript
// members.service.spec.ts
describe('MembersService', () => {
  let service: MembersService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MembersService, PrismaService],
    }).compile();

    service = module.get<MembersService>(MembersService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  describe('findAll', () => {
    it('should return an array of members', async () => {
      const result = await service.findAll();
      expect(Array.isArray(result)).toBe(true);
    });
  });
});
```

## 🚀 Building & Deployment

### Development Build
```bash
nx build api
```

### Production Build
```bash
nx build api --configuration=production
```

### Docker Deployment
```bash
# Build Docker image
docker build -f apps/api/Dockerfile -t kairos-api .

# Run container
docker run -p 3333:3333 -e DATABASE_URL="..." kairos-api
```

### Environment Configurations

#### Development
- Detailed logging
- Hot reloading
- Development database
- Relaxed CORS settings

#### Production
- Optimized performance
- Production logging
- Production database
- Strict security settings
- Health checks
- Monitoring integration

## 📊 Performance & Monitoring

### Caching Strategy
```typescript
// Redis caching example
@Injectable()
export class MembersService {
  constructor(
    private prisma: PrismaService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  async findAll(): Promise<Member[]> {
    const cacheKey = 'members:all';
    let members = await this.cacheManager.get<Member[]>(cacheKey);
    
    if (!members) {
      members = await this.prisma.member.findMany();
      await this.cacheManager.set(cacheKey, members, 300); // 5 minutes
    }
    
    return members;
  }
}
```

### Logging
```typescript
// Structured logging
import { Logger } from '@nestjs/common';

@Injectable()
export class MembersService {
  private readonly logger = new Logger(MembersService.name);

  async create(createMemberDto: CreateMemberDto): Promise<Member> {
    this.logger.log(`Creating member: ${createMemberDto.email}`);
    
    try {
      const member = await this.prisma.member.create({
        data: createMemberDto,
      });
      
      this.logger.log(`Member created successfully: ${member.id}`);
      return member;
    } catch (error) {
      this.logger.error(`Failed to create member: ${error.message}`, error.stack);
      throw error;
    }
  }
}
```

### Health Checks
```typescript
// Health check endpoint
@Controller('health')
export class HealthController {
  constructor(
    private prisma: PrismaService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  @Get()
  async check() {
    const checks = {
      database: await this.checkDatabase(),
      cache: await this.checkCache(),
      timestamp: new Date().toISOString(),
    };

    const isHealthy = Object.values(checks).every(check => 
      typeof check === 'boolean' ? check : true
    );

    return {
      status: isHealthy ? 'healthy' : 'unhealthy',
      checks,
    };
  }
}
```

## 🔧 Configuration

### NestJS Configuration
```typescript
// app.module.ts
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: Joi.object({
        DATABASE_URL: Joi.string().required(),
        JWT_SECRET: Joi.string().required(),
        PORT: Joi.number().default(3333),
      }),
    }),
    PrismaModule,
    AuthModule,
    MembersModule,
    // ... other modules
  ],
})
export class AppModule {}
```

### Swagger Documentation
```typescript
// main.ts
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Swagger setup
  const config = new DocumentBuilder()
    .setTitle('Kairos API')
    .setDescription('Church Management System API')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
    
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);
  
  await app.listen(3333);
}
```

## 🛡️ Security

### Input Validation
```typescript
// DTO with validation
export class CreateMemberDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @MinLength(2)
  @MaxLength(50)
  firstName: string;

  @IsOptional()
  @IsPhoneNumber('NG')
  phone?: string;
}
```

### Security Headers
```typescript
// Security middleware
app.use(helmet());
app.enableCors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:4200'],
  credentials: true,
});
```

## 📚 Additional Resources

- [NestJS Documentation](https://docs.nestjs.com/)
- [Prisma Documentation](https://www.prisma.io/docs/)
- [JWT Best Practices](https://auth0.com/blog/a-look-at-the-latest-draft-for-jwt-bcp/)
- [API Security Checklist](https://github.com/shieldfy/API-Security-Checklist)

## 🤝 Contributing

When contributing to the API:

1. Follow NestJS conventions and best practices
2. Write comprehensive tests for new endpoints
3. Update Swagger documentation for API changes
4. Follow the established module structure
5. Ensure proper error handling and validation
6. Add appropriate logging and monitoring
7. Consider security implications of changes

## 📄 License

This project is part of the Kairos Church Management System and is licensed under the MIT License.