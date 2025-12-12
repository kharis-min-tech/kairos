# @kairos/ui

This library contains the design system and reusable UI components for the Kairos Church Management System.

## Components

### Base Components
- Button
- Input
- Select
- Checkbox
- Radio

### Layout Components
- Card
- Modal
- Dialog
- Drawer

### Data Display Components
- Table
- DataGrid

### Form Components
- Form validation components

## Design System

The design system is inspired by Kharis Church branding and includes:
- Color tokens
- Typography scales
- Spacing system
- Component variants

## Usage

```typescript
import { Button, Card, Input } from '@kairos/ui';

function MyComponent() {
  return (
    <Card>
      <Input placeholder="Enter text" />
      <Button variant="primary">Submit</Button>
    </Card>
  );
}
```