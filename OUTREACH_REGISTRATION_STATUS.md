# Outreach Program Registration Status Feature

## Summary
Added the ability for members to see their registration status for outreach programs directly in the programs list, and quickly register without having to view the program details first.

## Changes Made

### Backend Changes

1. **Service Update** (`apps/api/src/outreach/service.ts`)
   - Modified `listPrograms` function to include registration status for members
   - For member users, queries the `outreach_participants` table to check if they're registered
   - Adds `isRegistered` boolean field to each program in the response
   - Uses efficient batch query to check all programs at once (single additional query)
   - Non-member users (Admin, Pastor, Leader) don't get the `isRegistered` field

### Frontend Changes

2. **Programs List Page** (`apps/web/src/app/(dashboard)/outreach/programs/page.tsx`)
   - Added registration status column for members
   - Shows "Registered" badge (green with checkmark) or "Not Registered" badge
   - Added quick "Register" button in Actions column for unregistered programs
   - Register button:
     - Only visible to members
     - Only shown for programs they haven't registered for
     - Hidden for completed programs
     - Shows loading state while registering
     - Refreshes the list after successful registration
   - Adjusted table columns based on user role:
     - Members see: Registration column instead of Souls Reached
     - Admin/Pastor/Leader see: Souls Reached column (no registration status)
   - Added toast notifications for registration success/failure

## User Experience

### Before
1. Member views programs list
2. No indication of registration status
3. Must click "View" to see program details
4. Must scroll to find registration section
5. Click register button
6. Go back to list

### After
1. Member views programs list
2. Immediately sees registration status for each program
3. Can click "Register" button directly from the list
4. Registration happens instantly with confirmation
5. Status updates to "Registered" automatically

## Visual Indicators

**For Members:**
- **Registered Programs**: Green badge with checkmark icon "✓ Registered"
- **Unregistered Programs**: Outlined badge "Not Registered" + "Register" button
- **Completed Programs**: No register button (registration closed)

**For Admin/Pastor/Leader:**
- No registration status shown (they manage programs, not register as participants)
- See "Souls Reached" count instead

## Access Control

All existing access control rules are maintained:
- Members can only register themselves
- Members can only see programs from their branch
- Registration validation happens on the backend
- Duplicate registration is prevented (409 Conflict error)

## Performance

- Single additional query for members to fetch all registration statuses
- Batch query using SQL IN clause for efficiency
- No N+1 query problem
- Non-member users have no performance impact

## Testing Recommendations

Manual testing scenarios:
1. Login as member and view programs list
2. Verify registration status shows correctly
3. Click "Register" on unregistered program
4. Verify status updates to "Registered"
5. Verify "Register" button disappears after registration
6. Try registering for same program again (should fail gracefully)
7. Login as Pastor/Leader/Admin and verify no registration column
8. Verify completed programs don't show register button
