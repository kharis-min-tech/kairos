import * as cdk from 'aws-cdk-lib';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import { Construct } from 'constructs';
import { KairosConfig } from '../config';

export interface AuthStackProps extends cdk.StackProps {
  config: KairosConfig;
}

/**
 * Cognito User Pool Stack for Kairos.
 *
 * Creates:
 * - Cognito User Pool with email/password authentication
 * - MFA support (optional, TOTP-based)
 * - Password policy (min 8 chars, uppercase, lowercase, number)
 * - Email verification via SES
 * - JWT token expiration (24 hours)
 * - User pool client for the web application
 *
 * Requirements: 1.1, 1.2, 1.3
 */
export class AuthStack extends cdk.Stack {
  public readonly userPool: cognito.IUserPool;
  public readonly userPoolClient: cognito.IUserPoolClient;

  constructor(scope: Construct, id: string, props: AuthStackProps) {
    super(scope, id, props);

    const { config } = props;

    // ---------------------------------------------------------------
    // Cognito User Pool
    // ---------------------------------------------------------------
    const userPool = new cognito.UserPool(this, 'UserPool', {
      userPoolName: `${config.prefix}-user-pool`,
      selfSignUpEnabled: true,
      signInAliases: {
        email: true,
      },
      autoVerify: {
        email: true,
      },
      standardAttributes: {
        email: {
          required: true,
          mutable: true,
        },
        givenName: {
          required: true,
          mutable: true,
        },
        familyName: {
          required: true,
          mutable: true,
        },
        phoneNumber: {
          required: false,
          mutable: true,
        },
      },
      customAttributes: {
        role: new cognito.StringAttribute({
          mutable: true,
          minLen: 1,
          maxLen: 20,
        }),
        branchId: new cognito.StringAttribute({
          mutable: true,
          minLen: 1,
          maxLen: 20,
        }),
        memberId: new cognito.StringAttribute({
          mutable: true,
          minLen: 1,
          maxLen: 20,
        }),
      },
      passwordPolicy: {
        minLength: 8,
        requireUppercase: true,
        requireLowercase: true,
        requireDigits: true,
        requireSymbols: false,
        tempPasswordValidity: cdk.Duration.days(7),
      },
      mfa: cognito.Mfa.OPTIONAL,
      mfaSecondFactor: {
        sms: false,
        otp: true, // TOTP-based MFA
      },
      accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
      removalPolicy: config.env === 'prod'
        ? cdk.RemovalPolicy.RETAIN
        : cdk.RemovalPolicy.DESTROY,
      // Email configuration — use Cognito default for MVP, switch to SES later
      email: cognito.UserPoolEmail.withCognito(),
    });

    this.userPool = userPool;

    // ---------------------------------------------------------------
    // User Pool Client — for the web application
    // ---------------------------------------------------------------
    const userPoolClient = new cognito.UserPoolClient(this, 'WebAppClient', {
      userPool,
      userPoolClientName: `${config.prefix}-web-client`,
      authFlows: {
        userPassword: true,
        userSrp: true,
      },
      accessTokenValidity: cdk.Duration.hours(config.jwtTokenValidityHours),
      idTokenValidity: cdk.Duration.hours(config.jwtTokenValidityHours),
      refreshTokenValidity: cdk.Duration.days(30),
      preventUserExistenceErrors: true,
      generateSecret: false, // Public client for SPA
    });

    this.userPoolClient = userPoolClient;

    // ---------------------------------------------------------------
    // Tags
    // ---------------------------------------------------------------
    cdk.Tags.of(this).add('Project', 'kairos');
    cdk.Tags.of(this).add('Environment', config.env);

    // ---------------------------------------------------------------
    // Outputs
    // ---------------------------------------------------------------
    new cdk.CfnOutput(this, 'UserPoolId', {
      value: userPool.userPoolId,
      description: 'Cognito User Pool ID',
      exportName: `${config.prefix}-user-pool-id`,
    });

    new cdk.CfnOutput(this, 'UserPoolArn', {
      value: userPool.userPoolArn,
      description: 'Cognito User Pool ARN',
      exportName: `${config.prefix}-user-pool-arn`,
    });

    new cdk.CfnOutput(this, 'UserPoolClientId', {
      value: userPoolClient.userPoolClientId,
      description: 'Cognito User Pool Client ID',
      exportName: `${config.prefix}-user-pool-client-id`,
    });
  }
}
