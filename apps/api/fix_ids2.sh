#!/bin/bash
SRC="/Users/kalvertabbey/Library/CloudStorage/OneDrive-Personal/Documents/kairos/apps/api/src"

# Fix remaining table column refs and result object property accesses
find "$SRC" -type f -name "*.ts" -exec sed -i '' \
  -e 's/branchLeadership\.leadershipId/branchLeadership.id/g' \
  -e 's/departments\.departmentId/departments.id/g' \
  -e 's/members\.memberId/members.id/g' \
  {} +

echo "Done round 2 entity ID renames"
