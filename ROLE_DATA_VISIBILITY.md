# Role-Based Data Visibility Rules

## Requirements Summary

Based on `requirements/mvp-scope.md` and `requirements/software_spec.md`:

### Outreach Programs

| Role | Can View | Can Create | Can Register | Can See Participants | Can See Souls |
|------|----------|------------|--------------|---------------------|---------------|
| **Admin** | All programs (all branches) | ✅ | ✅ | All | All |
| **Pastor** | Own branch only | ✅ | ✅ | Own branch | Own branch |
| **Leader** | Own branch only | ✅ | ✅ | Own branch | Own branch |
| **Member** | Own branch only | ❌ | ✅ Self only | Own branch (if participant) | Own branch (if participant) |

### Souls Pipeline

| Role | Can View | Can Capture | Can Follow Up | Can Reassign | Can Convert |
|------|----------|-------------|---------------|--------------|-------------|
| **Admin** | All souls | ✅ | All | ✅ | ✅ |
| **Pastor** | Own branch souls | ✅ | Own branch | ✅ | ✅ |
| **Leader** | Own branch souls | ✅ | Own branch | ✅ | ✅ |
| **Member** | Only assigned to them | ✅ | Only assigned | ❌ | ❌ |

### Follow-Ups Visibility

| Role | Can View Follow-Ups For |
|------|------------------------|
| **Admin** | All souls |
| **Pastor** | All souls in their branch |
| **Leader** | All souls in their branch |
| **Member** | Souls assigned to them OR souls from programs they participate in |

## Current Seed Data

### London Branch (Kharis London Central)
**Program**: London Street Evangelism (2025-03-15, Completed)

**Participants**:
- Sarah Williams (Leader) - Coordinator
- Emma Thompson (Member) - Worker
- James Okonkwo (Pastor) - Supervisor

**Souls Captured**:
1. John Davies - Assigned to Sarah Williams
2. Mary Wilson - Assigned to Sarah Williams
3. Peter Brown - Assigned to Emma Thompson

### Manchester Branch (Kharis Manchester)
**Program**: Manchester Community Outreach (2025-03-20, Not Completed)

**Participants**:
- Grace Mensah (Pastor) - Coordinator
- John Smith (Member) - Worker

**Souls Captured**:
1. Sarah Taylor - Assigned to John Smith
2. David Anderson - Assigned to Grace Mensah

### Accra Branch (Kharis Accra)
**Program**: Accra Market Evangelism (2025-03-25, Completed)

**Participants**:
- David Appiah (Leader) - Coordinator
- Michael Adjei (Member) - Worker
- Priscilla Owusu (Member) - Worker
- Kwame Asante (Pastor) - Supervisor

**Souls Captured**:
1. Ama Mensah - Assigned to David Appiah
2. Kwame Boateng - Assigned to David Appiah
3. Akua Owusu - Assigned to Michael Adjei

## Expected Visibility by Account

### Emma Thompson (Member, London)
**Login**: emma.thompson@kairos.local

**Outreach Programs**:
- ✅ London Street Evangelism (can see because it's her branch)

**Souls Pipeline** (`/souls`):
- ✅ Peter Brown (assigned to her)
- ❌ John Davies (not assigned to her)
- ❌ Mary Wilson (not assigned to her)

**Program Detail** (`/outreach/programs/[london-id]`):
- ✅ Can see all 3 souls (John, Mary, Peter) because she's a participant
- ✅ Can see all 3 participants
- ✅ Can view follow-ups for all 3 souls (collaboration)

### Sarah Williams (Leader, London)
**Login**: sarah.williams@kairos.local

**Outreach Programs**:
- ✅ London Street Evangelism

**Souls Pipeline** (`/souls`):
- ✅ John Davies (assigned to her)
- ✅ Mary Wilson (assigned to her)
- ✅ Peter Brown (branch soul, leader can see all)

**Program Detail**:
- ✅ Can see all 3 souls
- ✅ Can see all 3 participants
- ✅ Can view all follow-ups

### James Okonkwo (Pastor, London)
**Login**: james.okonkwo@kairos.local

**Outreach Programs**:
- ✅ London Street Evangelism

**Souls Pipeline** (`/souls`):
- ✅ All 3 London souls (John, Mary, Peter)

**Program Detail**:
- ✅ Can see all 3 souls
- ✅ Can see all 3 participants
- ✅ Can view all follow-ups
- ✅ Can create new programs
- ✅ Can mark program as completed

### Admin (Admin, London)
**Login**: admin@kairos.local

**Outreach Programs**:
- ✅ London Street Evangelism
- ✅ Manchester Community Outreach
- ✅ Accra Market Evangelism

**Souls Pipeline** (`/souls`):
- ✅ All 8 souls from all branches

**Program Detail**:
- ✅ Can see all souls from any program
- ✅ Can see all participants
- ✅ Can view all follow-ups
- ✅ Can create programs for any branch
- ✅ Can reassign souls
- ✅ Can convert souls

## Testing Checklist

For each account, verify:

1. ✅ Outreach Programs list shows correct programs
2. ✅ Souls Pipeline shows correct souls
3. ✅ Program detail shows correct souls and participants
4. ✅ Follow-ups are visible according to rules
5. ✅ Create/Edit permissions work correctly
6. ✅ Branch isolation is enforced

## Issues to Fix

Based on current implementation, potential issues:

1. **Member souls list** - Should only show assigned souls, not all branch souls
2. **Follow-ups visibility** - Members should see follow-ups for program souls (collaboration)
3. **Program statistics** - Should calculate correctly for all roles
4. **Branch isolation** - Ensure members can't access other branches' data

## Implementation Status

- ✅ Backend branch isolation for programs
- ✅ Backend branch isolation for souls
- ✅ Self-registration for members
- ✅ Follow-ups collaboration for program participants
- ⚠️ Need to verify member souls list filtering
- ⚠️ Need to verify all role permissions end-to-end
