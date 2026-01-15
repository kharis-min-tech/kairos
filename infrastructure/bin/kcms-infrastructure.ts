#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { KcmsAuthStack } from '../lib/kcms-auth-stack';
import { KcmsFrontendStack } from '../lib/kcms-frontend-stack';

const app = new cdk.App();

// Get environment configuration
const env = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION || 'eu-north-1',
};

// Environment-specific configuration
const config = {
  dev: {
    domainPrefix: 'kcms-dev',
    callbackUrls: [
      'http://localhost:3001',
      'http://localhost:3001/dashboard',
      'http://127.0.0.1:3001',
      'http://127.0.0.1:3001/dashboard',
      // Add more for flexibility
      'http://localhost:3000',
      'http://localhost:3000/dashboard',
    ],
    logoutUrls: [
      'http://localhost:3001',
      'http://127.0.0.1:3001',
      'http://localhost:3000',
    ],
  },
  staging: {
    domainPrefix: 'kcms-staging',
    callbackUrls: ['https://staging.kcms.example.com', 'https://staging.kcms.example.com/dashboard'],
    logoutUrls: ['https://staging.kcms.example.com'],
  },
  prod: {
    domainPrefix: 'kcms-prod',
    callbackUrls: ['https://kcms.example.com', 'https://kcms.example.com/dashboard'],
    logoutUrls: ['https://kcms.example.com'],
  },
};

// Determine environment (default to dev)
const environment = (process.env.ENVIRONMENT || 'dev') as keyof typeof config;
const envConfig = config[environment];

// Authentication Stack
const authStack = new KcmsAuthStack(app, `KcmsAuthStack-${environment}`, {
  env,
  description: `KCMS Authentication Stack (${environment})`,
  domainPrefix: envConfig.domainPrefix,
  callbackUrls: envConfig.callbackUrls,
  logoutUrls: envConfig.logoutUrls,
  environment,
});

// Frontend Stack (CloudFront + S3)
const frontendStack = new KcmsFrontendStack(app, `KcmsFrontendStack-${environment}`, {
  env,
  description: `KCMS Frontend Stack (${environment})`,
  userPool: authStack.userPool,
  userPoolClient: authStack.userPoolClient,
  environment,
});

// Add tags to all resources
cdk.Tags.of(app).add('Project', 'KCMS');
cdk.Tags.of(app).add('Environment', environment);
cdk.Tags.of(app).add('ManagedBy', 'CDK');

app.synth();
