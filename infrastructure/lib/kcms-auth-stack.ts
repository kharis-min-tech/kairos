import * as cdk from 'aws-cdk-lib';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { Construct } from 'constructs';

export interface KcmsAuthStackProps extends cdk.StackProps {
  domainPrefix: string;
  callbackUrls: string[];
  logoutUrls: string[];
  environment: string;
}

export class KcmsAuthStack extends cdk.Stack {
  public readonly userPool: cognito.UserPool;
  public readonly userPoolClient: cognito.UserPoolClient;
  public readonly userPoolDomain: cognito.UserPoolDomain;

  constructor(scope: Construct, id: string, props: KcmsAuthStackProps) {
    super(scope, id, props);

    // Pre-signup Lambda trigger for auto-confirmation
    const preSignupTrigger = new lambda.Function(this, 'PreSignupTrigger', {
      runtime: lambda.Runtime.PYTHON_3_11,
      handler: 'index.lambda_handler',
      code: lambda.Code.fromInline(`
import json

def lambda_handler(event, context):
    """
    Auto-confirm users and verify their email/phone on signup.
    This eliminates the need for email verification codes.
    """
    # Auto-confirm the user
    event['response']['autoConfirmUser'] = True
    
    # Auto-verify email if provided
    if 'email' in event['request']['userAttributes']:
        event['response']['autoVerifyEmail'] = True
    
    # Auto-verify phone if provided
    if 'phone_number' in event['request']['userAttributes']:
        event['response']['autoVerifyPhone'] = True
    
    return event
      `),
      description: 'Auto-confirms users and verifies their attributes on signup',
    });

    // Cognito User Pool
    this.userPool = new cognito.UserPool(this, 'KcmsUserPool', {
      userPoolName: `kcms-user-pool-${props.environment}`,
      
      // Sign-in configuration
      signInAliases: {
        email: true,
        username: true,
      },
      
      // Auto-verification (disabled since we use Lambda trigger)
      autoVerify: {
        email: false, // Handled by Lambda trigger
        phone: false, // Handled by Lambda trigger
      },
      
      // Standard attributes
      standardAttributes: {
        email: {
          required: true,
          mutable: true,
        },
        phoneNumber: {
          required: false,
          mutable: true,
        },
        fullname: {
          required: false,
          mutable: true,
        },
      },
      
      // Password policy
      passwordPolicy: {
        minLength: 8,
        requireLowercase: true,
        requireUppercase: true,
        requireDigits: true,
        requireSymbols: false,
        tempPasswordValidity: cdk.Duration.days(7),
      },
      
      // Account recovery
      accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
      
      // MFA configuration
      mfa: cognito.Mfa.OPTIONAL,
      mfaSecondFactor: {
        sms: true,
        otp: true,
      },
      
      // Email configuration (using Cognito default)
      email: cognito.UserPoolEmail.withCognito(),
      
      // Lambda triggers
      lambdaTriggers: {
        preSignUp: preSignupTrigger,
      },
      
      // Advanced security
      advancedSecurityMode: cognito.AdvancedSecurityMode.ENFORCED,
      
      // User invitation
      userInvitation: {
        emailSubject: 'Welcome to KCMS - Kharis Church Management System',
        emailBody: 'Hello {username}, welcome to KCMS! Your temporary password is {####}',
      },
      
      // User verification (not used due to Lambda trigger, but configured for fallback)
      userVerification: {
        emailSubject: 'Verify your KCMS account',
        emailBody: 'Your verification code is {####}',
        emailStyle: cognito.VerificationEmailStyle.CODE,
      },
      
      // Deletion protection
      removalPolicy: props.environment === 'prod' 
        ? cdk.RemovalPolicy.RETAIN 
        : cdk.RemovalPolicy.DESTROY,
      
      // Device tracking
      deviceTracking: {
        challengeRequiredOnNewDevice: true,
        deviceOnlyRememberedOnUserPrompt: true,
      },
    });

    // Cognito User Pool Domain
    this.userPoolDomain = this.userPool.addDomain('KcmsUserPoolDomain', {
      cognitoDomain: {
        domainPrefix: props.domainPrefix,
      },
    });

    // Cognito User Pool Client
    this.userPoolClient = this.userPool.addClient('KcmsUserPoolClient', {
      userPoolClientName: `kcms-client-${props.environment}`,
      
      // OAuth configuration
      oAuth: {
        flows: {
          authorizationCodeGrant: true,
          implicitCodeGrant: false,
        },
        scopes: [
          cognito.OAuthScope.OPENID,
          cognito.OAuthScope.EMAIL,
          cognito.OAuthScope.PHONE,
          cognito.OAuthScope.PROFILE,
        ],
        callbackUrls: props.callbackUrls,
        logoutUrls: props.logoutUrls,
      },
      
      // Auth flows
      authFlows: {
        userPassword: true,
        userSrp: true,
        custom: false,
        adminUserPassword: true,
      },
      
      // Token validity
      accessTokenValidity: cdk.Duration.hours(1),
      idTokenValidity: cdk.Duration.hours(1),
      refreshTokenValidity: cdk.Duration.days(30),
      
      // Security
      generateSecret: false, // For web apps
      preventUserExistenceErrors: true,
      
      // Attributes
      readAttributes: new cognito.ClientAttributes()
        .withStandardAttributes({
          email: true,
          emailVerified: true,
          phoneNumber: true,
          phoneNumberVerified: true,
          fullname: true,
        }),
      
      writeAttributes: new cognito.ClientAttributes()
        .withStandardAttributes({
          email: true,
          phoneNumber: true,
          fullname: true,
        }),
    });

    // Outputs
    new cdk.CfnOutput(this, 'UserPoolId', {
      value: this.userPool.userPoolId,
      description: 'Cognito User Pool ID',
      exportName: `KcmsUserPoolId-${props.environment}`,
    });

    new cdk.CfnOutput(this, 'UserPoolArn', {
      value: this.userPool.userPoolArn,
      description: 'Cognito User Pool ARN',
      exportName: `KcmsUserPoolArn-${props.environment}`,
    });

    new cdk.CfnOutput(this, 'UserPoolClientId', {
      value: this.userPoolClient.userPoolClientId,
      description: 'Cognito User Pool Client ID',
      exportName: `KcmsUserPoolClientId-${props.environment}`,
    });

    new cdk.CfnOutput(this, 'UserPoolDomain', {
      value: this.userPoolDomain.domainName,
      description: 'Cognito User Pool Domain',
      exportName: `KcmsUserPoolDomain-${props.environment}`,
    });

    new cdk.CfnOutput(this, 'CognitoDomainUrl', {
      value: `https://${props.domainPrefix}.auth.${cdk.Stack.of(this).region}.amazoncognito.com`,
      description: 'Cognito Hosted UI Domain URL',
      exportName: `KcmsCognitoDomainUrl-${props.environment}`,
    });

    new cdk.CfnOutput(this, 'AuthorityUrl', {
      value: `https://cognito-idp.${cdk.Stack.of(this).region}.amazonaws.com/${this.userPool.userPoolId}`,
      description: 'OIDC Authority URL',
      exportName: `KcmsAuthorityUrl-${props.environment}`,
    });
  }
}
