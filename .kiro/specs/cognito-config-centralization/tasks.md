# Implementation Plan: Cognito Configuration Centralization

## Overview

This implementation plan converts the design into discrete coding tasks that build incrementally. The approach follows a safe migration strategy: create the centralized config module first, then migrate each consumer one at a time, and finally verify no hardcoded values remain.

## Tasks

- [ ] 1. Create centralized Cognito configuration module
  - Create `apps/src/config/cognito.ts` with TypeScript interfaces and validation
  - Implement `getRequiredEnv()` function that validates environment variables and throws descriptive errors
  - Implement `cognitoConfig` object that exports all required Cognito values (userPoolId, clientId, region, domain, authority)
  - Implement `getBaseUrl()` function with browser/SSR detection and fallback logic
  - Implement `cognitoUrls` object with all Cognito hosted UI URLs
  - Implement `buildAuthUrl()` helper function for constructing OAuth URLs with parameters
  - Implement `buildLogoutUrl()` helper function for constructing logout URLs
  - Add JSDoc comments for all exported functions and values
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 2.5, 7.1, 7.3, 7.4, 7.5, 8.1, 8.2, 8.3, 9.1_

- [ ] 1.1 Write unit tests for configuration module
  - Test that all required fields are exported in cognitoConfig
  - Test error thrown when each required environment variable is missing
  - Test error messages contain variable name, description, and reference to .env.local.example
  - Test getBaseUrl() in browser context (window defined)
  - Test getBaseUrl() in SSR with NEXT_PUBLIC_BASE_URL set
  - Test getBaseUrl() in SSR without NEXT_PUBLIC_BASE_URL (default fallback)
  - Test buildAuthUrl() with different auth types and parameters
  - Test buildLogoutUrl() with and without custom redirect URI
  - _Requirements: 1.1, 1.2, 1.3, 2.5, 7.1, 7.3, 7.4, 8.1, 8.2, 8.3, 10.1, 10.4, 10.5_

- [ ] 1.2 Write property test for configuration validation
  - **Property 1: Configuration Values from Environment Variables**
  - Generate random valid environment variable values, set them, import config module, verify exported values match
  - **Property 2: Missing Environment Variables Produce Descriptive Errors**
  - For each required variable, unset it, attempt import, verify error contains variable name and description
  - **Validates: Requirements 1.2, 1.3, 7.1, 7.3, 7.4**

- [ ] 2. Create CDK output extraction script
  - Create `apps/scripts/extract-cognito-config.sh` bash script
  - Implement AWS CLI availability check with helpful error message
  - Implement AWS credentials validation check
  - Implement CloudFormation stack query to get outputs (UserPoolId, UserPoolClientId, CognitoDomainUrl, AuthorityUrl)
  - Implement region extraction from stack ARN
  - Implement validation that all required outputs were found
  - Implement .env.local backup before overwriting
  - Implement .env.local file generation with proper format and comments
  - Add usage instructions and success message
  - Make script executable (chmod +x)
  - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [ ] 2.1 Write tests for extraction script
  - Test script behavior with valid stack outputs (mock AWS CLI)
  - Test error handling for missing AWS CLI
  - Test error handling for invalid credentials
  - Test error handling for missing stack
  - Test error handling for missing stack outputs
  - Test generated .env.local file format and content
  - Test backup creation before overwriting existing .env.local
  - _Requirements: 5.2, 5.3, 5.4, 10.1_

- [ ] 3. Update environment variable documentation
  - Update `.env.local.example` with all required NEXT_PUBLIC_COGNITO_* variables
  - Add comments explaining each variable with format examples
  - Add comment explaining NEXT_PUBLIC_BASE_URL is optional
  - Add header comment explaining how to use extraction script
  - _Requirements: 2.1, 2.2, 2.4, 9.2_

- [ ] 4. Checkpoint - Verify config module works in isolation
  - Run unit tests for config module
  - Manually test that importing config module with valid .env.local works
  - Manually test that importing config module with missing variables throws clear errors
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 5. Update auth-config module to use centralized config
  - Update `apps/src/lib/auth-config.ts` to import from `../config/cognito`
  - Replace `process.env.NEXT_PUBLIC_COGNITO_AUTHORITY` with `cognitoConfig.authority`
  - Replace `process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID` with `cognitoConfig.clientId`
  - Replace `process.env.NEXT_PUBLIC_COGNITO_DOMAIN` with `cognitoConfig.domain`
  - Remove all hardcoded fallback values (e.g., "7mqmc57sb18ideegj293pk81ib", "eu-north-1_OM97wjySK")
  - Update `cognitoAuthConfig` to use values from `cognitoConfig`
  - Update metadata endpoints to use `cognitoConfig.domain` and `cognitoConfig.authority`
  - Keep `getBaseUrl()`, `buildAuthUrl()`, and `buildLogoutUrl()` as re-exports from config module
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 4.2, 4.5_

- [ ] 5.1 Write integration tests for auth-config module
  - Test that auth-config imports from config module
  - Test that cognitoAuthConfig contains correct values from environment
  - Test that no hardcoded Cognito values remain in auth-config
  - Test that metadata endpoints are correctly constructed
  - _Requirements: 4.2, 10.2_

- [ ] 6. Update use-cognito-auth hook to use centralized config
  - Update `apps/src/hooks/use-cognito-auth.ts` to import from `../config/cognito`
  - Replace all hardcoded client IDs ("2cvsui7davtdgfdfdkd5600djl", "7mqmc57sb18ideegj293pk81ib") with `cognitoConfig.clientId`
  - Update localStorage key construction to use `cognitoConfig.authority` and `cognitoConfig.clientId`
  - Update `signOutRedirect()` to use `buildLogoutUrl()` helper
  - Update `signOutComplete()` to use `buildLogoutUrl()` helper and dynamic storage key
  - Update `mfaSetupRedirect()` to use `cognitoConfig.clientId` and `cognitoConfig.domain`
  - Remove all hardcoded domain references
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 4.1, 4.5_

- [ ] 6.1 Write integration tests for use-cognito-auth hook
  - Test that hook imports from config module
  - Test that signOutRedirect uses correct client ID and logout URL
  - Test that signOutComplete uses correct client ID and logout URL
  - Test that mfaSetupRedirect uses correct client ID and domain
  - Test that localStorage key is constructed from config values
  - Test that no hardcoded Cognito values remain in hook
  - _Requirements: 4.1, 10.2_

- [ ] 7. Update signup page to use centralized config
  - Update `apps/src/app/signup/page.tsx` to import from `../../config/cognito`
  - Replace hardcoded client ID ("7mqmc57sb18ideegj293pk81ib") with `cognitoConfig.clientId`
  - Replace hardcoded redirect URI ("http://localhost:3001") with `getBaseUrl()`
  - Update `redirectToSignUp()` to use `buildAuthUrl('signUp')` helper
  - Remove hardcoded domain reference
  - _Requirements: 3.1, 3.3, 4.4, 4.5, 8.4_

- [ ] 7.1 Write integration tests for signup page
  - Test that signup page imports from config module
  - Test that redirectToSignUp constructs correct URL with config values
  - Test that no hardcoded Cognito values remain in signup page
  - _Requirements: 4.4, 10.2_

- [ ] 8. Update change-password page to use centralized config
  - Update `apps/src/app/auth/change-password/page.tsx` to import from `../../../config/cognito`
  - Replace hardcoded client ID ("7mqmc57sb18ideegj293pk81ib") with `cognitoConfig.clientId`
  - Replace hardcoded redirect URI ("http://localhost:3001/auth/profile") with `${getBaseUrl()}/auth/profile`
  - Update `redirectToChangePassword()` to use `cognitoConfig.domain` and `cognitoConfig.clientId`
  - Remove hardcoded domain reference
  - _Requirements: 3.1, 3.3, 4.3, 4.5, 8.4, 8.5_

- [ ] 8.1 Write integration tests for change-password page
  - Test that change-password page imports from config module
  - Test that redirectToChangePassword constructs correct URL with config values
  - Test that no hardcoded Cognito values remain in change-password page
  - _Requirements: 4.3, 10.2_

- [ ] 9. Checkpoint - Verify all consumers migrated
  - Run all unit and integration tests
  - Manually test sign-in flow
  - Manually test sign-out flow
  - Manually test sign-up flow
  - Manually test change password flow
  - Verify no console errors in browser
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 10. Create verification tests for hardcoded values
  - Create test file `apps/src/config/__tests__/no-hardcoded-values.test.ts`
  - Implement test that searches source files for known hardcoded client IDs
  - Implement test that searches source files for known hardcoded user pool IDs
  - Implement test that searches source files for known hardcoded domains
  - Implement test that searches source files for known hardcoded authority URLs
  - Exclude .env files, config module itself, and test files from search
  - Test should fail if any hardcoded values are found
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 10.3_

- [ ] 10.1 Write property test for no hardcoded values
  - **Property 3: No Hardcoded Cognito Values in Source Code**
  - For each known hardcoded value, search all source files (excluding .env and config module), verify zero occurrences
  - **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5**

- [ ] 11. Create verification tests for import statements
  - Create test file `apps/src/config/__tests__/import-validation.test.ts`
  - Implement test that verifies use-cognito-auth imports from config module
  - Implement test that verifies auth-config imports from config module
  - Implement test that verifies signup page imports from config module
  - Implement test that verifies change-password page imports from config module
  - Implement test that verifies no files (except config module) directly access process.env.NEXT_PUBLIC_COGNITO_*
  - Test should fail if any file bypasses config module
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 10.2_

- [ ] 11.1 Write property test for import validation
  - **Property 4: All Configuration Consumers Import from Config Module**
  - For each consumer file, parse imports, verify import from config module exists, verify no direct process.env access
  - **Validates: Requirements 4.1, 4.2, 4.3, 4.4, 4.5**

- [ ] 12. Create configuration documentation
  - Create `apps/docs/COGNITO_CONFIGURATION.md` file
  - Document overview of centralized configuration system
  - Document setup steps (deploy CDK, run extraction script, restart server)
  - Document all environment variables with descriptions
  - Document usage examples (how to import and use config)
  - Document troubleshooting guide for common errors
  - Document workflow for updating configuration after CDK redeployment
  - Include architecture diagram showing configuration flow
  - _Requirements: 5.5, 9.3, 9.4, 9.5_

- [ ] 13. Final checkpoint - Complete verification
  - Run complete test suite (unit tests, integration tests, property tests)
  - Verify all tests pass
  - Run extraction script to ensure it works end-to-end
  - Manually test all authentication flows (sign-in, sign-out, sign-up, password change)
  - Search codebase for hardcoded values (should find none)
  - Verify all configuration consumers import from config module
  - Review documentation for completeness
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- All tasks are required for comprehensive implementation with full test coverage
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation at key milestones
- Property tests validate universal correctness properties with 100+ iterations
- Unit tests validate specific examples, edge cases, and error conditions
- Migration follows safe pattern: create config module → migrate consumers one-by-one → verify
- All hardcoded Cognito values will be eliminated by task completion
