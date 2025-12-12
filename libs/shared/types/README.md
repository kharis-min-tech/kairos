# @kairos/shared-types

Shared TypeScript type definitions for the Kairos Church Management System.

## Overview

This library contains all the shared TypeScript interfaces, types, and enums used across the Kairos monorepo applications (Web Admin, Member App, and API).

## Contents

- **Entities**: Core entity interfaces matching the database schema
- **Enums**: Enumeration definitions for consistent values
- **DTOs**: Data Transfer Object types for API requests
- **API Responses**: Standardized API response structures

## Usage

```typescript
import { 
  User, 
  Member, 
  UserType, 
  SoulStatus, 
  CreateMemberDto, 
  ApiResponse 
} from '@kairos/shared-types';

// Use the types in your application
const user: User = {
  id: '123',
  email: 'user@example.com',
  userType: UserType.Member,
  // ... other properties
};
```

## Key Features

- **Type Safety**: Ensures consistent data structures across all applications
- **Enum Definitions**: Standardized enumeration values
- **DTO Types**: Request/response type definitions for API endpoints
- **Documentation**: Well-documented interfaces with clear property descriptions

## Building

Run `nx build shared-types` to build the library.

## Testing

Run `nx test shared-types` to execute the unit tests via Jest.

## Linting

Run `nx lint shared-types` to lint the library code.