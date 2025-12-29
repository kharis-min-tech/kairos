# Members Module

This module provides comprehensive member management functionality for the Kairos Church Management System.

## Features

### ✅ List Members
- **Endpoint**: `GET /members`
- **Features**:
  - Pagination support (page, limit)
  - Search by name, email, or phone
  - Filter by branch, gender, marital status, active status
  - Sorting by any field (default: createdAt desc)
  - Includes branch and user information

**Query Parameters**:
```typescript
{
  search?: string;        // Search in name, email, phone
  branchId?: string;      // Filter by branch
  gender?: 'MALE' | 'FEMALE';
  maritalStatus?: 'SINGLE' | 'MARRIED' | 'DIVORCED' | 'WIDOWED';
  isActive?: boolean;     // Default: true (excludes archived)
  page?: string;          // Default: '1'
  limit?: string;         // Default: '10'
  sortBy?: string;        // Default: 'createdAt'
  sortOrder?: 'asc' | 'desc'; // Default: 'desc'
}
```

### ✅ Get Member Details
- **Endpoint**: `GET /members/:id`
- **Features**:
  - Full member information
  - Branch details
  - User account information (if linked)
  - Department memberships
  - Fellowship memberships
  - Handles member not found with proper error

### ✅ Create Member
- **Endpoint**: `POST /members`
- **Features**:
  - Input validation using class-validator
  - Branch existence validation
  - Email uniqueness check
  - Proper date handling
  - Returns created member with branch info

**Request Body**:
```typescript
{
  branchId: string;           // Required
  firstName: string;          // Required
  lastName: string;           // Required
  phone?: string;
  email?: string;
  address?: string;
  dateOfBirth?: string;       // ISO date string
  gender?: 'MALE' | 'FEMALE';
  maritalStatus?: 'SINGLE' | 'MARRIED' | 'DIVORCED' | 'WIDOWED';
  occupation?: string;
}
```

### ✅ Update Member
- **Endpoint**: `PUT /members/:id`
- **Features**:
  - Partial updates supported
  - Email uniqueness validation (excluding current member)
  - Member existence check
  - Automatic updatedAt timestamp

### ✅ Archive Member
- **Endpoint**: `DELETE /members/:id`
- **Features**:
  - Soft delete (sets isActive: false)
  - Member existence check
  - Returns confirmation message with member info
  - Archived members excluded from default queries

### ✅ Restore Member
- **Endpoint**: `PUT /members/:id/restore`
- **Features**:
  - Restore archived members
  - Validation to prevent restoring active members
  - Sets isActive: true

### ✅ Member Statistics
- **Endpoint**: `GET /members/stats`
- **Features**:
  - Total, active, and archived counts
  - Gender demographics
  - Marital status demographics
  - Optional branch filtering via query parameter

**Query Parameters**:
```typescript
{
  branchId?: string; // Optional branch filter
}
```

## Database Integration

### Prisma Integration
- Uses PrismaService for database operations
- Proper transaction handling
- Optimized queries with selective includes
- Type-safe database operations

### Data Validation
- Input validation using class-validator decorators
- Business logic validation (email uniqueness, branch existence)
- Proper error handling with meaningful messages

## Testing

### Unit Tests
- Complete service method coverage
- Mock Prisma service
- Test all success and error scenarios
- Located in `members.service.spec.ts`

### Integration Tests
- Controller endpoint testing
- Mock service dependencies
- Validate request/response handling
- Located in `members.controller.spec.ts`

## Usage Examples

### List Active Members
```bash
GET /members?isActive=true&page=1&limit=20
```

### Search Members
```bash
GET /members?search=john&branchId=main-branch
```

### Filter by Demographics
```bash
GET /members?gender=FEMALE&maritalStatus=SINGLE
```

### Create New Member
```bash
POST /members
Content-Type: application/json

{
  "branchId": "main-branch",
  "firstName": "John",
  "lastName": "Doe",
  "email": "john.doe@example.com",
  "phone": "+1-555-0123",
  "dateOfBirth": "1990-01-15",
  "gender": "MALE",
  "maritalStatus": "SINGLE",
  "occupation": "Engineer"
}
```

### Update Member
```bash
PUT /members/member-id
Content-Type: application/json

{
  "phone": "+1-555-9999",
  "address": "New Address",
  "maritalStatus": "MARRIED"
}
```

### Get Statistics
```bash
GET /members/stats
GET /members/stats?branchId=main-branch
```

## Error Handling

- **400 Bad Request**: Invalid input data, duplicate email, branch not found
- **404 Not Found**: Member not found
- **500 Internal Server Error**: Database or server errors

## Security Considerations

- Input validation prevents injection attacks
- Email uniqueness prevents duplicate accounts
- Soft delete preserves data integrity
- Proper error messages without exposing sensitive data

## Performance Optimizations

- Pagination prevents large data loads
- Selective field inclusion reduces payload size
- Database indexes on frequently queried fields
- Efficient search using database-level text search