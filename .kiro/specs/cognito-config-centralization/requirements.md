# Requirements Document

## Introduction

This specification addresses the centralization of AWS Cognito configuration management in the Next.js application. Currently, Cognito configuration values (User Pool ID, Client ID, Domain, Region) are hardcoded across multiple files, making the application difficult to maintain and deploy across different environments. The CDK infrastructure stack outputs all necessary Cognito configuration values, but the frontend application does not consistently use environment variables to consume these values.

The goal is to establish a single source of truth for all Cognito-related configuration, eliminate hardcoded values, and create a seamless workflow for updating configuration when the CDK stack is redeployed.

## Glossary

- **Cognito_Config_Module**: The centralized TypeScript module that exports all Cognito configuration values
- **Environment_Variables**: Next.js environment variables prefixed with NEXT_PUBLIC_ for client-side access
- **CDK_Stack**: The AWS Cloud Development Kit infrastructure code that provisions Cognito resources
- **Client_ID**: The Cognito User Pool Client identifier used for OAuth flows
- **User_Pool_ID**: The unique identifier for the Cognito User Pool
- **Authority_URL**: The OIDC issuer URL for the Cognito User Pool
- **Cognito_Domain**: The hosted UI domain URL for Cognito authentication flows
- **Hardcoded_Value**: A configuration value directly embedded in source code rather than loaded from environment variables
- **Configuration_Consumer**: Any component, hook, or module that requires Cognito configuration values

## Requirements

### Requirement 1: Centralized Configuration Module

**User Story:** As a developer, I want a single configuration module that exports all Cognito values, so that I have one place to manage authentication configuration.

#### Acceptance Criteria

1. THE Cognito_Config_Module SHALL export all required Cognito configuration values (User Pool ID, Client ID, Region, Domain, Authority URL)
2. THE Cognito_Config_Module SHALL load all values from Environment_Variables
3. WHEN a required Environment_Variable is missing, THE Cognito_Config_Module SHALL throw a descriptive error with the variable name
4. THE Cognito_Config_Module SHALL provide TypeScript type definitions for all exported configuration values
5. THE Cognito_Config_Module SHALL be the only module that directly accesses Cognito-related Environment_Variables

### Requirement 2: Environment Variable Configuration

**User Story:** As a developer, I want all Cognito configuration to come from environment variables, so that I can easily update configuration without modifying code.

#### Acceptance Criteria

1. THE application SHALL use NEXT_PUBLIC_ prefixed Environment_Variables for all client-side Cognito configuration
2. THE application SHALL define all required Environment_Variables in .env.local.example with documentation
3. WHEN the application starts, THE application SHALL validate that all required Environment_Variables are present
4. THE application SHALL support the following Environment_Variables: NEXT_PUBLIC_COGNITO_USER_POOL_ID, NEXT_PUBLIC_COGNITO_CLIENT_ID, NEXT_PUBLIC_COGNITO_REGION, NEXT_PUBLIC_COGNITO_DOMAIN, NEXT_PUBLIC_COGNITO_AUTHORITY
5. WHERE NEXT_PUBLIC_BASE_URL is not set, THE application SHALL automatically detect the current URL from the browser

### Requirement 3: Elimination of Hardcoded Values

**User Story:** As a developer, I want to remove all hardcoded Cognito values from the codebase, so that the application works correctly across different environments.

#### Acceptance Criteria

1. THE application SHALL NOT contain any Hardcoded_Value for Client_ID in any source file
2. THE application SHALL NOT contain any Hardcoded_Value for User_Pool_ID in any source file
3. THE application SHALL NOT contain any Hardcoded_Value for Cognito_Domain in any source file
4. THE application SHALL NOT contain any Hardcoded_Value for Authority_URL in any source file
5. WHEN searching the codebase for known Cognito identifiers, THE search SHALL return zero results in source files

### Requirement 4: Configuration Consumer Migration

**User Story:** As a developer, I want all components and hooks to import configuration from the central module, so that configuration changes propagate automatically.

#### Acceptance Criteria

1. THE use-cognito-auth hook SHALL import all Cognito configuration from Cognito_Config_Module
2. THE auth-config module SHALL import all Cognito configuration from Cognito_Config_Module
3. THE change-password page SHALL import all Cognito configuration from Cognito_Config_Module
4. THE signup page SHALL import all Cognito configuration from Cognito_Config_Module
5. WHEN a Configuration_Consumer needs Cognito configuration, THE Configuration_Consumer SHALL import from Cognito_Config_Module only

### Requirement 5: CDK Output Integration

**User Story:** As a developer, I want a documented process for extracting CDK outputs to environment variables, so that I can easily update configuration after infrastructure changes.

#### Acceptance Criteria

1. THE application SHALL provide a helper script that extracts CDK_Stack outputs to .env.local format
2. WHEN the helper script runs, THE script SHALL query AWS CloudFormation for stack outputs
3. WHEN the helper script runs, THE script SHALL generate properly formatted Environment_Variables
4. THE helper script SHALL include error handling for missing AWS credentials or stack not found
5. THE application SHALL provide documentation explaining how to run the helper script after CDK deployment

### Requirement 6: Backward Compatibility During Migration

**User Story:** As a developer, I want the migration to be safe and reversible, so that I can roll back if issues arise.

#### Acceptance Criteria

1. WHEN migrating a Configuration_Consumer, THE migration SHALL be completed in a single atomic change
2. THE migration SHALL maintain all existing functionality without behavioral changes
3. WHEN the Cognito_Config_Module is created, THE module SHALL initially coexist with existing configuration code
4. THE migration SHALL include verification that all Configuration_Consumers work with the new configuration
5. WHEN all Configuration_Consumers are migrated, THE old configuration code SHALL be removed

### Requirement 7: Configuration Validation and Error Handling

**User Story:** As a developer, I want clear error messages when configuration is missing or invalid, so that I can quickly diagnose and fix configuration issues.

#### Acceptance Criteria

1. WHEN a required Environment_Variable is missing, THE Cognito_Config_Module SHALL throw an error with the variable name and expected format
2. WHEN an Environment_Variable has an invalid format, THE Cognito_Config_Module SHALL throw an error describing the validation failure
3. THE error messages SHALL include instructions for setting the missing Environment_Variable
4. THE error messages SHALL reference the .env.local.example file for correct format examples
5. WHEN configuration validation fails, THE application SHALL fail fast during initialization rather than at runtime

### Requirement 8: Dynamic URL Detection

**User Story:** As a developer, I want the application to automatically detect the current URL, so that it works on any laptop or device without hardcoding localhost.

#### Acceptance Criteria

1. WHEN running in a browser, THE application SHALL detect the base URL from window.location.origin
2. WHEN running during server-side rendering, THE application SHALL use NEXT_PUBLIC_BASE_URL if provided
3. WHERE NEXT_PUBLIC_BASE_URL is not set during SSR, THE application SHALL use a sensible default (http://localhost:3001)
4. THE application SHALL use the detected base URL for all OAuth redirect URIs
5. THE application SHALL use the detected base URL for all logout redirect URIs

### Requirement 9: Configuration Documentation

**User Story:** As a developer, I want comprehensive documentation for the configuration system, so that I understand how to use and maintain it.

#### Acceptance Criteria

1. THE Cognito_Config_Module SHALL include JSDoc comments explaining each exported value
2. THE .env.local.example file SHALL include comments explaining each Environment_Variable
3. THE application SHALL provide a README or documentation file explaining the configuration workflow
4. THE documentation SHALL include step-by-step instructions for updating configuration after CDK deployment
5. THE documentation SHALL include troubleshooting guidance for common configuration errors

### Requirement 10: Testing and Verification

**User Story:** As a developer, I want to verify that the configuration system works correctly, so that I can deploy with confidence.

#### Acceptance Criteria

1. THE application SHALL include a configuration validation test that checks all required Environment_Variables
2. THE application SHALL include tests verifying that Configuration_Consumers receive correct values from Cognito_Config_Module
3. THE application SHALL include a test that verifies no Hardcoded_Values remain in the codebase
4. THE tests SHALL verify that error messages are clear and actionable when configuration is missing
5. THE tests SHALL verify that dynamic URL detection works correctly in both browser and SSR contexts
