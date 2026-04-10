# Mass Assignment Feature - Implementation Complete

## Overview
Implemented bulk/mass assignment functionality for the Souls Pipeline, allowing Admin, Pastor, and Leader roles to assign multiple souls to a worker at once instead of individually.

## Backend Implementation

### 1. Service Layer (`apps/api/src/outreach/souls-service.ts`)
- Added `bulkReassignSouls()` function
- Validates all soul IDs exist
- Validates new member is active
- Enforces branch constraints for Pastor/Leader roles
- Returns count of successfully reassigned souls
- Uses SQL array operations for efficient bulk updates

### 2. Schema Validation (`apps/api/src/outreach/schemas.ts`)
- Added `bulkReassignSoulsSchema` with Zod validation
- Requires array of soul IDs (minimum 1)
- Requires assignedMemberId (UUID)

### 3. Router (`apps/api/src/outreach/souls-router.ts`)
- Added `POST /api/souls/bulk-assign` endpoint
- Authorization: Admin, Pastor, Leader only
- Returns reassignedCount and list of soul IDs

### 4. API Client (`packages/api-client/src/api.ts`)
- Added `bulkReassign()` method to souls API
- Accepts `{ soulIds: string[]; assignedMemberId: string }`
- Returns typed response with reassignedCount

## Frontend Implementation

### 1. Souls Pipeline Page (`apps/web/src/app/(dashboard)/souls/page.tsx`)
- Added selection state management with `Set<string>`
- Added bulk assignment modal
- Added "Select All" / "Deselect All" buttons
- Added "Assign X Souls" button (shows when souls are selected)
- Integrated with auth store to check user role permissions

### 2. Soul Card Component
- Added checkbox for selection (visible only to Admin/Pastor/Leader)
- Visual indicator (border) when soul is selected
- Click on checkbox toggles selection without navigating
- Click on card content navigates to soul detail

### 3. Kanban Column Component
- Passes selection props to child SoulCard components
- Supports selection state management

## User Experience

### For Admin/Pastor/Leader:
1. Navigate to Souls Pipeline (`/souls`)
2. See checkboxes on each soul card
3. Click "Select All" or individually select souls
4. Click "Assign X Souls" button
5. Enter member ID in modal
6. Click "Assign Souls" to bulk assign
7. See success toast with count of reassigned souls
8. Souls automatically refresh with new assignments

### For Members:
- No checkboxes visible
- No bulk assignment options
- Can only view their assigned souls

## Permissions

| Role | Can Bulk Assign | Scope |
|------|----------------|-------|
| Admin | ✅ Yes | All branches |
| Pastor | ✅ Yes | Own branch only |
| Leader | ✅ Yes | Own branch only |
| Member | ❌ No | N/A |

## Branch Isolation

- Pastor/Leader can only bulk assign souls from their own branch
- Pastor/Leader can only assign to members from their own branch
- Admin can assign across branches
- Backend enforces these constraints

## Technical Details

### API Endpoint
```
POST /api/souls/bulk-assign
Authorization: Bearer <token>
Content-Type: application/json

{
  "soulIds": ["uuid1", "uuid2", "uuid3"],
  "assignedMemberId": "member-uuid"
}

Response:
{
  "success": true,
  "data": {
    "reassignedCount": 3,
    "soulIds": ["uuid1", "uuid2", "uuid3"]
  }
}
```

### Database Query
Uses PostgreSQL array operations for efficient bulk updates:
```sql
UPDATE souls 
SET assigned_member_id = $1, updated_at = NOW()
WHERE id = ANY($2)
RETURNING id;
```

## Future Enhancements (Not Implemented)

### Member Dropdown
Currently requires manual entry of member UUID. Could be enhanced with:
- Dropdown of available members from the branch
- Search/filter members by name
- Show member details (name, role, current soul count)

### RAG System for Follow-ups
Separate feature to be implemented - see next section.

## Testing

To test the feature:
1. Login as Pastor (james.okonkwo@kairos.local)
2. Navigate to `/souls`
3. Select multiple souls using checkboxes
4. Click "Assign X Souls"
5. Enter a member ID from London branch
6. Verify souls are reassigned
7. Check that member sees the souls in their list

## Files Modified

- `apps/api/src/outreach/souls-service.ts`
- `apps/api/src/outreach/schemas.ts`
- `apps/api/src/outreach/souls-router.ts`
- `packages/api-client/src/api.ts`
- `apps/web/src/app/(dashboard)/souls/page.tsx`
