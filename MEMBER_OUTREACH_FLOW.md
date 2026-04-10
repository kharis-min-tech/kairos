# Member Outreach Flow

This document explains how regular members can participate in outreach activities in the Kairos system.

## Overview

Regular members (systemRole: 'member') have full access to participate in outreach activities within their branch. They can:

1. View outreach programs in their branch
2. Register as participants/workers in programs
3. Capture souls (both during programs and ad-hoc)
4. Follow up with souls assigned to them
5. Update soul status
6. View their assigned souls

## Member Capabilities

### 1. View Outreach Programs

**Endpoint**: `GET /api/outreach/programs`

Members can view all outreach programs in their branch. The system automatically filters programs by the member's branch ID.

**Frontend**: Navigate to `/outreach/programs`

### 2. Register for Outreach Programs

**Endpoint**: `POST /api/outreach/programs/:id/participants`

Members can self-register for any program in their branch.

**Payload**:
```json
{
  "memberId": "their-own-member-id",
  "role": "Worker" (optional),
  "notes": "Any notes" (optional)
}
```

**Rules**:
- Members can only register themselves (not others)
- Can only register for programs in their own branch
- Cannot register twice for the same program

### 3. Capture Souls

**Endpoint**: `POST /api/souls`

Members can capture souls in two ways:

#### A. During an Outreach Program
```json
{
  "outreachId": "program-uuid",
  "firstName": "John",
  "lastName": "Doe",
  "phone": "+447700900001",
  "email": "john.doe@example.com",
  "city": "London",
  "gender": "Male",
  "ageRange": "25-34",
  "notes": "Met at street evangelism"
}
```

#### B. Ad-hoc Evangelism (No Program)
```json
{
  "outreachId": null,
  "firstName": "Jane",
  "lastName": "Smith",
  "phone": "+447700900002",
  "email": "jane.smith@example.com",
  "city": "London",
  "gender": "Female",
  "ageRange": "18-24",
  "notes": "Met at coffee shop"
}
```

**Auto-assignment**: The soul is automatically assigned to the member who captured it.

**Frontend**: Navigate to `/souls/capture`

### 4. View Assigned Souls

**Endpoint**: `GET /api/souls`

Members can only see souls that are assigned to them. The system automatically filters by `assignedMemberId`.

**Frontend**: Navigate to `/souls`

### 5. Follow Up with Souls

**Endpoint**: `POST /api/souls/:id/follow-ups`

Members can log follow-up activities for souls assigned to them.

**Payload**:
```json
{
  "contactMethod": "Phone Call",
  "contactStatus": "Successful",
  "durationMinutes": 15,
  "notes": "Had a good conversation about faith",
  "nextFollowUpDate": "2025-04-01"
}
```

**Contact Methods**: Phone Call, Text Message, WhatsApp, In-Person Visit, Email

**Contact Status**: Successful, No Answer, Call Back Later, Interested, Not Interested

### 6. Update Soul Status

**Endpoint**: `PUT /api/souls/:id/status`

Members can update the status of souls assigned to them.

**Payload**:
```json
{
  "status": "Following Up"
}
```

**Valid Statuses**:
- New
- Following Up
- Interested
- Not Interested
- Converted
- Lost Contact

**Note**: Members cannot convert souls to members - only Pastor/Leader/Admin can do that.

## Branch Isolation

All member activities are automatically filtered by their branch:

- **Programs**: Only see programs from their branch
- **Souls**: Only see souls assigned to them
- **Registration**: Can only register for programs in their branch

## Permissions Summary

| Action | Member | Pastor/Leader | Admin |
|--------|--------|---------------|-------|
| View programs (own branch) | ✅ | ✅ | ✅ All branches |
| Create programs | ❌ | ✅ | ✅ |
| Register for programs (self) | ✅ | ✅ | ✅ |
| Register others for programs | ❌ | ✅ | ✅ |
| Capture souls | ✅ | ✅ | ✅ |
| View assigned souls | ✅ Own only | ✅ Branch | ✅ All |
| Follow up souls | ✅ Own only | ✅ Branch | ✅ All |
| Update soul status | ✅ Own only | ✅ Branch | ✅ All |
| Reassign souls | ❌ | ✅ | ✅ |
| Convert souls to members | ❌ | ✅ | ✅ |
| Export souls | ❌ | ✅ | ✅ |

## Test Accounts

Use these accounts to test member outreach flow:

**Regular Members**:
- `emma.thompson@kairos.local` (London branch)
- `michael.adjei@kairos.local` (Accra branch)
- `john.smith@kairos.local` (Manchester branch)

**All passwords**: `Password1!`

## Example Member Journey

1. **Login** as `emma.thompson@kairos.local`
2. **View Programs**: Navigate to `/outreach/programs` - see London programs
3. **Register**: Click "Register" on "London Street Evangelism" program
4. **Capture Soul**: Go to `/souls/capture` and add a new soul
5. **View Souls**: Go to `/souls` - see only souls assigned to you
6. **Follow Up**: Click on a soul, add follow-up notes
7. **Update Status**: Change soul status from "New" to "Following Up"

## Frontend Routes

- `/outreach/programs` - List all programs in member's branch
- `/outreach/programs/[id]` - View program details and register
- `/souls` - List souls assigned to member
- `/souls/capture` - Capture a new soul
- `/souls/[id]` - View soul details and add follow-ups
- `/outreach/reports` - View conversion funnel (all roles)

## API Client Methods

```typescript
// Programs
api.outreach.programs.list({ page: 1, limit: 20 })
api.outreach.programs.get(programId)
api.outreach.programs.registerParticipant(programId, { memberId, role, notes })

// Souls
api.outreach.souls.capture({ firstName, lastName, phone, ... })
api.outreach.souls.list({ page: 1, limit: 20 })
api.outreach.souls.get(soulId)
api.outreach.souls.updateStatus(soulId, { status })
api.outreach.souls.addFollowUp(soulId, { contactMethod, contactStatus, ... })
api.outreach.souls.getFollowUps(soulId, { page: 1, limit: 20 })
```
