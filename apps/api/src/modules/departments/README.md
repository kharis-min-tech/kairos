# Departments Module

This module provides comprehensive department management functionality for the Kairos Church Management System.

## Features

### ✅ List Departments
- **Endpoint**: `GET /departments`
- **Features**:
  - Pagination support (page, limit)
  - Search by name or description
  - Filter by branch, active status
  - Sorting by any field (default: createdAt desc)
  - Includes branch information and member count

**Query Parameters**:
```typescript
{
  search?: string;        // Search in name, description
  branchId?: string;      // Filter by branch
  isActive?: boolean;     // Default: true (excludes archived)
  page?: string;          // Default: '1'
  limit?: string;         // Default: '10'
  sortBy?: string;        // Default: 'createdAt'
  sortOrder?: 'asc' | 'desc'; // Default: 'desc'
}
```

### ✅ Get Department Details
- **Endpoint**: `GET /departments/:id`
- **Features**:
  - Full department information
  - Branch details
  - Complete member list with roles
  - Recent attendance records
  - Handles department not found with proper error

### ✅ Create Department
- **Endpoint**: `POST /departments`
- **Features**:
  - Input validation using class-validator
  - Branch existence validation
  - Leader validation (if provided)
  - Department name uniqueness check within branch
  - Returns created department with branch info

**Request Body**:
```typescript
{
  branchId: string;           // Required - UUID
  name: string;               // Required
  description?: string;       // Optional
  leaderId?: string;          // Optional - UUID
}
```

### ✅ Update Department
- **Endpoint**: `PUT /departments/:id`
- **Features**:
  - Partial updates supported
  - Branch and leader validation
  - Name uniqueness validation (excluding current department)
  - Department existence check
  - Automatic updatedAt timestamp

### ✅ Archive Department
- **Endpoint**: `DELETE /departments/:id`
- **Features**:
  - Soft delete (sets isActive: false)
  - Automatically archives all department members
  - Department existence check
  - Returns confirmation message with department info
  - Archived departments excluded from default queries

### ✅ Restore Department
- **Endpoint**: `PUT /departments/:id/restore`
- **Features**:
  - Restore archived departments
  - Validation to prevent restoring active departments
  - Sets isActive: true

### ✅ Member Management
- **Add Member**: `POST /departments/:id/members`
- **Remove Member**: `DELETE /departments/:id/members/:memberId`
- **Features**:
  - Add members to departments with optional roles
  - Remove members from departments (soft delete)
  - Prevent duplicate memberships
  - Validate member and department existence

### ✅ Department Statistics
- **Endpoint**: `GET /departments/stats`
- **Features**:
  - Total, active, and archived counts
  - Total member count across all departments
  - Departments with/without leaders
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
- Proper transaction handling for complex operations
- Optimized queries with selective includes
- Type-safe database operations

### Data Validation
- Input validation using class-validator decorators
- Business logic validation (name uniqueness, branch/leader existence)
- Proper error handling with meaningful messages

## Testing

### Unit Tests
- Complete service method coverage
- Mock Prisma service
- Test all success and error scenarios
- Located in `departments.service.spec.ts`

### Integration Tests
- Controller endpoint testing
- Mock service dependencies
- Validate request/response handling
- Located in `departments.controller.spec.ts`

## Usage Examples

### List Active Departments
```bash
GET /departments?isActive=true&page=1&limit=20
```

### Search Departments
```bash
GET /departments?search=youth&branchId=main-branch
```

### Create New Department
```bash
POST /departments
Content-Type: application/json

{
  "branchId": "main-branch",
  "name": "Youth Ministry",
  "description": "Ministry for young people aged 13-25",
  "leaderId": "leader-uuid"
}
```

### Update Department
```bash
PUT /departments/department-id
Content-Type: application/json

{
  "description": "Updated description",
  "leaderId": "new-leader-uuid"
}
```

### Add Member to Department
```bash
POST /departments/department-id/members
Content-Type: application/json

{
  "memberId": "member-uuid",
  "role": "Volunteer"
}
```

### Get Statistics
```bash
GET /departments/stats
GET /departments/stats?branchId=main-branch
```

## Error Handling

- **400 Bad Request**: Invalid input data, duplicate name, branch/leader not found, member already in department
- **404 Not Found**: Department not found, member not found in department
- **500 Internal Server Error**: Database or server errors

## Security Considerations

- Input validation prevents injection attacks
- UUID validation for all ID parameters
- Name uniqueness prevents duplicate departments within branches
- Soft delete preserves data integrity
- Proper error messages without exposing sensitive data

## Performance Optimizations

- Pagination prevents large data loads
- Selective field inclusion reduces payload size
- Database indexes on frequently queried fields
- Efficient search using database-level text search
- Transaction usage for complex operations

## Related Modules

- **Members Module**: Department members are linked to the Members module
- **Branches Module**: Departments belong to branches
- **Attendance Module**: Department attendance tracking (future enhancement)