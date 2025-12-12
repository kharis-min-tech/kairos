# shared-utils

This library contains shared utility functions used across the Kairos Church Management System.

## Features

- Date formatting utilities
- Validation helper functions  
- Currency formatting utilities
- String manipulation utilities

## Usage

```typescript
import { formatDate, validateEmail, formatCurrency, capitalizeWords } from '@kairos/shared-utils';

// Date formatting
const formatted = formatDate(new Date(), 'DD/MM/YYYY');

// Email validation
const isValid = validateEmail('user@example.com');

// Currency formatting
const price = formatCurrency(1234.56, 'USD');

// String manipulation
const title = capitalizeWords('hello world');
```

## Running unit tests

Run `nx test shared-utils` to execute the unit tests via [Jest](https://jestjs.io).