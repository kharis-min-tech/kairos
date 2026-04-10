# Branch Isolation Verification

## Test Accounts by Branch

### London Branch (Kharis London Central)
- **Pastor**: james.okonkwo@kairos.local
- **Leader**: sarah.williams@kairos.local  
- **Member**: emma.thompson@kairos.local

**Should See:**
- ✅ 1 program: "London Street Evangelism"
- ✅ 3 souls: John Davies, Mary Wilson, Peter Brown
- ❌ Should NOT see Manchester or Accra programs/souls

### Manchester Branch (Kharis Manchester)
- **Pastor**: grace.mensah@kairos.local
- **Member**: john.smith@kairos.local

**Should See:**
- ✅ 1 program: "Manchester Community Outreach"
- ✅ 2 souls: Sarah Taylor, David Anderson
- ❌ Should NOT see London or Accra programs/souls

### Accra Branch (Kharis Accra)
- **Pastor**: kwame.asante@kairos.local
- **Leader**: david.appiah@kairos.local
- **Member**: michael.adjei@kairos.local

**Should See:**
- ✅ 1 program: "Accra Market Evangelism"
- ✅ 3 souls: Ama Mensah, Kwame Boateng, Akua Owusu
- ❌ Should NOT see London or Manchester programs/souls

### Admin (Cross-Branch Access)
- **Admin**: admin@kairos.local (London branch)

**Should See:**
- ✅ ALL 3 programs from all branches
- ✅ ALL 8 souls from all branches
- ✅ Can switch between branches in filters

## Backend Filtering Logic

### Outreach Programs (`listPrograms`)
```typescript
// Pastor, Leader, Member: Own branch only
if (auth.systemRole === 'pastor' || auth.systemRole === 'leader' || auth.systemRole === 'member') {
  conditions.push(eq(outreachPrograms.branchId, auth.branchId));
}
// Admin: All branches (no filter applied)
```

### Souls (`listSouls`)
```typescript
// Member: Only assigned souls
if (auth.systemRole === 'member') {
  conditions.push(eq(souls.assignedMemberId, auth.memberId));
}
// Pastor/Leader: All souls from their branch
else if (auth.systemRole === 'pastor' || auth.systemRole === 'leader') {
  conditions.push(
    or(
      eq(outreachPrograms.branchId, auth.branchId),
      eq(members.homeBranchId, auth.branchId)
    )
  );
}
// Admin: All souls (no filter)
```

## How to Verify

1. **Login as Pastor (james.okonkwo@kairos.local)**
   - Go to `/outreach/programs` - Should see ONLY "London Street Evangelism"
   - Go to `/souls` - Should see ONLY 3 London souls
   - Should NOT see any Manchester or Accra data

2. **Login as Leader (sarah.williams@kairos.local)**
   - Same as Pastor - ONLY London data

3. **Login as Member (emma.thompson@kairos.local)**
   - Go to `/outreach/programs` - Should see "London Street Evangelism"
   - Go to `/souls` - Should see ONLY "Peter Brown" (assigned to her)

4. **Login as Admin (admin@kairos.local)**
   - Go to `/outreach/programs` - Should see ALL 3 programs
   - Go to `/souls` - Should see ALL 8 souls

## Common Issues

### If Pastor/Leader sees other branches:
- Check `auth.branchId` is set correctly in JWT token
- Verify backend is applying branch filter
- Check database - ensure programs have correct `branch_id`

### If Admin doesn't see all branches:
- Check `auth.systemRole` is 'admin'
- Verify no branch filter is being applied for admin

### If Member sees too many souls:
- Check filtering logic - should be `assignedMemberId === auth.memberId`
- Verify member ID in token matches database

## Database Check

Run these queries to verify data:

```sql
-- Check programs by branch
SELECT program_name, branch_id FROM outreach_programs;

-- Check souls by branch (via program)
SELECT s.first_name, s.last_name, op.branch_id 
FROM souls s 
LEFT JOIN outreach_programs op ON s.outreach_id = op.id;

-- Check member branches
SELECT first_name, last_name, system_role, home_branch_id 
FROM members 
WHERE email LIKE '%@kairos.local';
```
