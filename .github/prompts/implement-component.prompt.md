---
description: "Create a React component with TDD. Input: component name, props, and behaviour."
mode: agent
agent: frontend-ui
---

# Implement Component

## Inputs
- **Name**: ${{COMPONENT_NAME}}
- **Location**: `apps/web/src/components/${{DOMAIN}}/${{COMPONENT_NAME}}.tsx`
- **Purpose**: ${{COMPONENT_PURPOSE}}

## Steps

### 1. Write Component Tests
Create test at `apps/web/src/__tests__/${{COMPONENT_NAME}}.test.tsx`:
- Renders with required props
- Renders with optional props
- Handles user interactions (click, input, hover)
- Shows conditional UI based on props/state
- Accessible (proper roles, labels)

### 2. Run Tests — Confirm They Fail
```bash
cd apps/web && npx vitest run src/__tests__/${{COMPONENT_NAME}}.test.tsx
```

### 3. Implement Component

```tsx
import { cn } from '@/lib/utils';

interface Props {
  // typed props from spec
}

export function ${{COMPONENT_NAME}}({ ...props }: Props) {
  return (
    // Use Shadcn/ui primitives
    // Use cn() for conditional classes
    // Use Lucide icons
  );
}
```

### 4. Run Tests — Confirm They Pass
```bash
cd apps/web && npx vitest run src/__tests__/${{COMPONENT_NAME}}.test.tsx
```

### 5. Verify
- Component uses only Shadcn/ui primitives (no custom low-level HTML for existing components)
- Uses `cn()` for class merging
- Follows existing component patterns in `apps/web/src/components/`
