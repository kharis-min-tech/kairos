#!/bin/bash

# Fix UUID ID schemas - change from z.number().int().positive() to z.string().uuid()
# for all IDs except region_id and role_id (which remain SERIAL integers)

FILE="/Users/kalvertabbey/Library/CloudStorage/OneDrive-Personal/Documents/kairos/packages/utils/src/validator/schemas.ts"

# For each UUID ID field, replace its schema
# Using word boundary \< \> to match exact field names
sed -i '' \
  -e 's/home_branch_id: z\.number()\.int()\.positive()/home_branch_id: z.string().uuid()/' \
  -e 's/branch_id: z\.number()\.int()\.positive()/branch_id: z.string().uuid()/' \
  -e 's/department_id: z\.number()\.int()\.positive()/department_id: z.string().uuid()/' \
  -e 's/lead_member_id: z\.number()\.int()\.positive()/lead_member_id: z.string().uuid()/' \
  -e 's/deputy_member_id: z\.number()\.int()\.positive()\.optional()/deputy_member_id: z.string().uuid().optional()/' \
  -e 's/leader_id: z\.number()\.int()\.positive()\.optional()/leader_id: z.string().uuid().optional()/' \
  -e 's/co_leader_id: z\.number()\.int()\.positive()\.optional()/co_leader_id: z.string().uuid().optional()/' \
  -e 's/preacher_id: z\.number()\.int()\.positive()\.optional()/preacher_id: z.string().uuid().optional()/' \
  -e 's/coordinator_id: z\.number()\.int()\.positive()\.optional()/coordinator_id: z.string().uuid().optional()/' \
  -e 's/service_id: z\.number()\.int()\.positive()/service_id: z.string().uuid()/' \
  -e 's/member_id: z\.number()\.int()\.positive()/member_id: z.string().uuid()/' \
  -e 's/meeting_id: z\.number()\.int()\.positive()/meeting_id: z.string().uuid()/' \
  -e 's/fellowship_id: z\.number()\.int()\.positive()/fellowship_id: z.string().uuid()/' \
  -e 's/outreach_id: z\.number()\.int()\.positive()/outreach_id: z.string().uuid()/' \
  -e 's/soul_id: z\.number()\.int()\.positive()/soul_id: z.string().uuid()/' \
  -e 's/contact_date: z\.coerce\.date()/contact_date: z.coerce.date()/' \
  -e 's/converted_to_member_id: z\.number()\.int()\.positive()\.optional()/converted_to_member_id: z.string().uuid().optional()/' \
  -e 's/assigned_member_id: z\.number()\.int()\.positive()/assigned_member_id: z.string().uuid()/' \
  -e 's/form_id: z\.number()\.int()\.positive()/form_id: z.string().uuid()/' \
  -e 's/target_branch_id: z\.number()\.int()\.positive()\.optional()/target_branch_id: z.string().uuid().optional()/' \
  -e 's/target_department_id: z\.number()\.int()\.positive()\.optional()/target_department_id: z.string().uuid().optional()/' \
  -e 's/target_fellowship_id: z\.number()\.int()\.positive()\.optional()/target_fellowship_id: z.string().uuid().optional()/' \
  "$FILE"

echo "Done updating schemas to UUID strings"
