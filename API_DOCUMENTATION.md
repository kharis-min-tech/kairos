# 🚀 Kairos API Documentation

Base URL: `http://localhost:3333/api`

---

## 👥 MEMBERS API

### 1. **GET /members** - List All Members
Get a paginated list of members with filtering and search.

**Query Parameters:**
- `search` (optional) - Search by name, email, or phone
- `branchId` (optional) - Filter by branch ID
- `gender` (optional) - Filter by gender: `MALE` | `FEMALE`
- `maritalStatus` (optional) - Filter by status: `SINGLE` | `MARRIED` | `DIVORCED` | `WIDOWED`
- `isActive` (optional) - Filter active/archived: `true` | `false` (default: `true`)
- `page` (optional) - Page number (default: `1`)
- `limit` (optional) - Items per page (default: `10`)
- `sortBy` (optional) - Sort field (default: `createdAt`)
- `sortOrder` (optional) - Sort direction: `asc` | `desc` (default: `desc`)

**Example Requests:**
```bash
# Get all active members
GET http://localhost:3333/api/members

# Search for members named "John"
GET http://localhost:3333/api/members?search=John

# Get female members, page 2, 20 per page
GET http://localhost:3333/api/members?gender=FEMALE&page=2&limit=20

# Get archived members
GET http://localhost:3333/api/members?isActive=false

# Get married members sorted by name
GET http://localhost:3333/api/members?maritalStatus=MARRIED&sortBy=firstName&sortOrder=asc
```

**Response:**
```json
{
  "data": [
    {
      "id": "1",
      "branchId": "branch-1",
      "firstName": "John",
      "lastName": "Doe",
      "email": "john.doe@example.com",
      "phone": "+1234567890",
      "address": "123 Main Street, Cityville",
      "dateOfBirth": "1985-03-15T00:00:00.000Z",
      "gender": "MALE",
      "maritalStatus": "MARRIED",
      "occupation": "Software Engineer",
      "isActive": true,
      "createdAt": "2024-01-15T00:00:00.000Z",
      "updatedAt": "2024-01-15T00:00:00.000Z",
      "joinDate": "2024-01-15T00:00:00.000Z",
      "userId": null,
      "branch": {
        "id": "branch-1",
        "name": "Main Branch"
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 5,
    "pages": 1
  }
}
```

---

### 2. **GET /members/stats** - Get Member Statistics
Get statistical overview of members.

**Query Parameters:**
- `branchId` (optional) - Filter stats by branch

**Example Requests:**
```bash
# Get overall member statistics
GET http://localhost:3333/api/members/stats

# Get statistics for specific branch
GET http://localhost:3333/api/members/stats?branchId=branch-1
```

**Response:**
```json
{
  "total": 5,
  "active": 4,
  "archived": 1,
  "demographics": {
    "gender": {
      "male": 2,
      "female": 2
    },
    "maritalStatus": {
      "married": 2,
      "single": 2
    }
  }
}
```

---

### 3. **GET /members/:id** - Get Single Member
Get detailed information about a specific member.

**Path Parameters:**
- `id` (required) - Member ID

**Example Request:**
```bash
GET http://localhost:3333/api/members/1
```

**Response:**
```json
{
  "id": "1",
  "branchId": "branch-1",
  "firstName": "John",
  "lastName": "Doe",
  "email": "john.doe@example.com",
  "phone": "+1234567890",
  "address": "123 Main Street, Cityville",
  "dateOfBirth": "1985-03-15T00:00:00.000Z",
  "gender": "MALE",
  "maritalStatus": "MARRIED",
  "occupation": "Software Engineer",
  "isActive": true,
  "createdAt": "2024-01-15T00:00:00.000Z",
  "updatedAt": "2024-01-15T00:00:00.000Z",
  "joinDate": "2024-01-15T00:00:00.000Z",
  "userId": null,
  "branch": {
    "id": "branch-1",
    "name": "Main Branch"
  },
  "departmentMembers": [],
  "fellowshipMembers": []
}
```

---

### 4. **POST /members** - Create New Member
Create a new member record.

**Request Body:**
```json
{
  "branchId": "branch-1",
  "firstName": "Jane",
  "lastName": "Smith",
  "email": "jane.smith@example.com",
  "phone": "+1234567890",
  "address": "456 Oak Avenue",
  "dateOfBirth": "1990-05-20",
  "gender": "FEMALE",
  "maritalStatus": "SINGLE",
  "occupation": "Teacher"
}
```

**Required Fields:**
- `branchId` - Branch ID
- `firstName` - First name
- `lastName` - Last name

**Optional Fields:**
- `email` - Email address
- `phone` - Phone number
- `address` - Physical address
- `dateOfBirth` - Date of birth (ISO 8601 format)
- `gender` - Gender: `MALE` | `FEMALE`
- `maritalStatus` - Marital status: `SINGLE` | `MARRIED` | `DIVORCED` | `WIDOWED`
- `occupation` - Occupation

**Example Request:**
```bash
POST http://localhost:3333/api/members
Content-Type: application/json

{
  "branchId": "branch-1",
  "firstName": "Jane",
  "lastName": "Smith",
  "email": "jane.smith@example.com",
  "phone": "+1234567890",
  "gender": "FEMALE",
  "maritalStatus": "SINGLE"
}
```

**Response:** (201 Created)
```json
{
  "id": "6",
  "branchId": "branch-1",
  "firstName": "Jane",
  "lastName": "Smith",
  "email": "jane.smith@example.com",
  "phone": "+1234567890",
  "address": "",
  "dateOfBirth": "2024-12-22T00:00:00.000Z",
  "gender": "FEMALE",
  "maritalStatus": "SINGLE",
  "occupation": "",
  "isActive": true,
  "createdAt": "2024-12-22T17:50:00.000Z",
  "updatedAt": "2024-12-22T17:50:00.000Z",
  "joinDate": "2024-12-22T17:50:00.000Z",
  "userId": null,
  "branch": {
    "id": "branch-1",
    "name": "Main Branch"
  }
}
```

---

### 5. **PUT /members/:id** - Update Member
Update an existing member's information.

**Path Parameters:**
- `id` (required) - Member ID

**Request Body:** (All fields optional)
```json
{
  "firstName": "Jane",
  "lastName": "Doe",
  "email": "jane.doe@example.com",
  "phone": "+9876543210",
  "address": "789 New Street",
  "maritalStatus": "MARRIED",
  "occupation": "Senior Teacher"
}
```

**Example Request:**
```bash
PUT http://localhost:3333/api/members/1
Content-Type: application/json

{
  "phone": "+9876543210",
  "occupation": "Senior Software Engineer"
}
```

**Response:**
```json
{
  "id": "1",
  "firstName": "John",
  "lastName": "Doe",
  "phone": "+9876543210",
  "occupation": "Senior Software Engineer",
  "updatedAt": "2024-12-22T17:55:00.000Z",
  ...
}
```

---

### 6. **PUT /members/:id/restore** - Restore Archived Member
Restore a previously archived member.

**Path Parameters:**
- `id` (required) - Member ID

**Example Request:**
```bash
PUT http://localhost:3333/api/members/5/restore
```

**Response:**
```json
{
  "id": "5",
  "firstName": "David",
  "lastName": "Brown",
  "isActive": true,
  "updatedAt": "2024-12-22T17:56:00.000Z",
  ...
}
```

---

### 7. **DELETE /members/:id** - Archive Member
Archive a member (soft delete).

**Path Parameters:**
- `id` (required) - Member ID

**Example Request:**
```bash
DELETE http://localhost:3333/api/members/1
```

**Response:**
```json
{
  "message": "Member John Doe has been archived",
  "member": {
    "id": "1",
    "firstName": "John",
    "lastName": "Doe",
    "isActive": false,
    "updatedAt": "2024-12-22T17:57:00.000Z",
    ...
  }
}
```

---

## 🏢 DEPARTMENTS API

### 1. **GET /departments** - List All Departments
Get a paginated list of departments with filtering and search.

**Query Parameters:**
- `search` (optional) - Search by name or description
- `branchId` (optional) - Filter by branch ID
- `isActive` (optional) - Filter active/archived: `true` | `false` (default: `true`)
- `page` (optional) - Page number (default: `1`)
- `limit` (optional) - Items per page (default: `10`)
- `sortBy` (optional) - Sort field (default: `createdAt`)
- `sortOrder` (optional) - Sort direction: `asc` | `desc` (default: `desc`)

**Example Requests:**
```bash
# Get all active departments
GET http://localhost:3333/api/departments

# Search for "Youth" departments
GET http://localhost:3333/api/departments?search=Youth

# Get departments for specific branch
GET http://localhost:3333/api/departments?branchId=branch-1
```

**Response:**
```json
{
  "data": [
    {
      "id": "1",
      "branchId": "branch-1",
      "name": "Youth Ministry",
      "description": "Ministry focused on young people and teenagers",
      "leaderId": "1",
      "isActive": true,
      "createdAt": "2024-01-15T00:00:00.000Z",
      "updatedAt": "2024-01-15T00:00:00.000Z",
      "branch": {
        "id": "branch-1",
        "name": "Main Branch"
      },
      "members": []
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 2,
    "pages": 1
  }
}
```

---

### 2. **GET /departments/stats** - Get Department Statistics

**Example Request:**
```bash
GET http://localhost:3333/api/departments/stats
```

**Response:**
```json
{
  "total": 2,
  "active": 2,
  "archived": 0,
  "totalMembers": 0,
  "withLeaders": 2,
  "withoutLeaders": 0
}
```

---

### 3. **GET /departments/:id** - Get Single Department

**Example Request:**
```bash
GET http://localhost:3333/api/departments/1
```

---

### 4. **POST /departments** - Create New Department

**Request Body:**
```json
{
  "branchId": "branch-1",
  "name": "Children's Ministry",
  "description": "Ministry for children ages 0-12",
  "leaderId": "2"
}
```

**Required Fields:**
- `branchId` - Branch ID
- `name` - Department name

**Optional Fields:**
- `description` - Department description
- `leaderId` - Leader member ID

---

### 5. **PUT /departments/:id** - Update Department

**Example Request:**
```bash
PUT http://localhost:3333/api/departments/1
Content-Type: application/json

{
  "description": "Updated ministry description",
  "leaderId": "3"
}
```

---

### 6. **PUT /departments/:id/restore** - Restore Archived Department

---

### 7. **DELETE /departments/:id** - Archive Department

---

### 8. **POST /departments/:id/members** - Add Member to Department

**Request Body:**
```json
{
  "memberId": "1",
  "role": "Volunteer"
}
```

**Example Request:**
```bash
POST http://localhost:3333/api/departments/1/members
Content-Type: application/json

{
  "memberId": "1",
  "role": "Leader"
}
```

---

### 9. **DELETE /departments/:id/members/:memberId** - Remove Member from Department

**Example Request:**
```bash
DELETE http://localhost:3333/api/departments/1/members/1
```

---

## 📅 EVENTS API

### 1. **GET /events** - List All Events
Get a paginated list of events with filtering and search.

**Query Parameters:**
- `search` (optional) - Search by title, description, or location
- `branchId` (optional) - Filter by branch ID
- `isActive` (optional) - Filter active/archived: `true` | `false` (default: `true`)
- `startDate` (optional) - Filter by start date (ISO 8601)
- `endDate` (optional) - Filter by end date (ISO 8601)
- `page` (optional) - Page number (default: `1`)
- `limit` (optional) - Items per page (default: `10`)
- `sortBy` (optional) - Sort field (default: `startDate`)
- `sortOrder` (optional) - Sort direction: `asc` | `desc` (default: `asc`)

**Example Requests:**
```bash
# Get all active events
GET http://localhost:3333/api/events

# Search for "Sunday" events
GET http://localhost:3333/api/events?search=Sunday

# Get upcoming events sorted by date
GET http://localhost:3333/api/events?sortBy=startDate&sortOrder=asc
```

**Response:**
```json
{
  "data": [
    {
      "id": "1",
      "branchId": "branch-1",
      "title": "Sunday Service",
      "description": "Weekly Sunday worship service",
      "startDate": "2024-12-29T10:00:00.000Z",
      "endDate": "2024-12-29T12:00:00.000Z",
      "location": "Main Sanctuary",
      "eventType": "SERVICE",
      "capacity": 200,
      "fee": 0,
      "isActive": true,
      "createdAt": "2024-01-15T00:00:00.000Z",
      "updatedAt": "2024-01-15T00:00:00.000Z",
      "branch": {
        "id": "branch-1",
        "name": "Main Branch"
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 2,
    "pages": 1
  }
}
```

---

### 2. **GET /events/stats** - Get Event Statistics

**Example Request:**
```bash
GET http://localhost:3333/api/events/stats
```

**Response:**
```json
{
  "total": 2,
  "active": 2,
  "archived": 0,
  "upcoming": 2,
  "past": 0
}
```

---

### 3. **GET /events/:id** - Get Single Event

**Example Request:**
```bash
GET http://localhost:3333/api/events/1
```

---

### 4. **POST /events** - Create New Event

**Request Body:**
```json
{
  "branchId": "branch-1",
  "name": "Christmas Service",
  "description": "Special Christmas celebration service",
  "startDate": "2024-12-25T10:00:00Z",
  "endDate": "2024-12-25T12:00:00Z",
  "location": "Main Sanctuary",
  "capacity": 300,
  "fee": 0
}
```

**Required Fields:**
- `branchId` - Branch ID
- `name` - Event name
- `startDate` - Start date/time (ISO 8601)

**Optional Fields:**
- `description` - Event description
- `endDate` - End date/time (ISO 8601)
- `location` - Event location
- `capacity` - Maximum capacity
- `fee` - Registration fee
- `isActive` - Active status (default: `true`)

---

### 5. **PUT /events/:id** - Update Event

**Example Request:**
```bash
PUT http://localhost:3333/api/events/1
Content-Type: application/json

{
  "location": "New Sanctuary",
  "capacity": 250
}
```

---

### 6. **PUT /events/:id/restore** - Restore Archived Event

---

### 7. **DELETE /events/:id** - Archive Event

---

### 8. **POST /events/:id/register** - Register Member for Event

**Request Body:**
```json
{
  "memberId": "1"
}
```

**Example Request:**
```bash
POST http://localhost:3333/api/events/1/register
Content-Type: application/json

{
  "memberId": "1"
}
```

---

### 9. **DELETE /events/:id/register/:memberId** - Unregister Member from Event

**Example Request:**
```bash
DELETE http://localhost:3333/api/events/1/register/1
```

---

## 🔧 Testing with cURL

### Example cURL Commands:

```bash
# GET request
curl http://localhost:3333/api/members

# GET with query parameters
curl "http://localhost:3333/api/members?search=John&page=1&limit=10"

# POST request
curl -X POST http://localhost:3333/api/members \
  -H "Content-Type: application/json" \
  -d '{
    "branchId": "branch-1",
    "firstName": "Test",
    "lastName": "User",
    "email": "test@example.com"
  }'

# PUT request
curl -X PUT http://localhost:3333/api/members/1 \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "+1234567890"
  }'

# DELETE request
curl -X DELETE http://localhost:3333/api/members/1
```

---

## 🧪 Testing with Postman

1. **Import Collection**: Create a new collection in Postman
2. **Set Base URL**: `http://localhost:3333/api`
3. **Add Requests**: Create requests for each endpoint
4. **Set Headers**: Add `Content-Type: application/json` for POST/PUT requests
5. **Test**: Send requests and view responses

---

## ⚠️ Error Responses

### 400 Bad Request
```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "error": "Bad Request"
}
```

### 404 Not Found
```json
{
  "statusCode": 404,
  "message": "Member with ID 999 not found",
  "error": "Not Found"
}
```

### 500 Internal Server Error
```json
{
  "statusCode": 500,
  "message": "Internal server error",
  "error": "Internal Server Error"
}
```

---

## 📝 Notes

- All dates are in ISO 8601 format
- All endpoints return JSON responses
- Pagination is available on list endpoints
- Soft delete (archive) is used instead of hard delete
- Demo data is stored in-memory (resets on server restart)
