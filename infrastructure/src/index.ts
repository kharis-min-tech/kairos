#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { getConfig, Environment } from './config';
import { NetworkStack } from './stacks/network-stack';
import { DatabaseStack } from './stacks/database-stack';
import { StorageStack } from './stacks/storage-stack';
import { AuthStack } from './stacks/auth-stack';
import { ApiStack } from './stacks/api-stack';
import { AnalyticsStack } from './stacks/analytics-stack';
import { MonitoringStack } from './stacks/monitoring-stack';
import { WebStack } from './stacks/web-stack';

/**
 * Kairos CDK Application Entry Point.
 *
 * Deploys all infrastructure stacks for the specified environment.
 * Usage:
 *   npx cdk synth -c env=staging
 *   npx cdk deploy --all -c env=staging
 *   npx cdk deploy --all -c env=prod
 */
const app = new cdk.App();

// Resolve environment from CDK context (default: staging)
const envName = (app.node.tryGetContext('env') || 'staging') as Environment;
const config = getConfig(envName);

const awsEnv: cdk.Environment = {
  region: config.region,
};

// ---------------------------------------------------------------
// 1. Network Stack — VPC, subnets, security groups, VPC endpoints
// ---------------------------------------------------------------
const networkStack = new NetworkStack(app, `${config.prefix}-network`, {
  config,
  env: awsEnv,
  description: `Kairos ${config.env} - VPC, subnets, security groups, VPC endpoints`,
});

// ---------------------------------------------------------------
// 2. Database Stack — Aurora Serverless v2 (PostgreSQL 15)
// ---------------------------------------------------------------
const databaseStack = new DatabaseStack(app, `${config.prefix}-database`, {
  config,
  vpc: networkStack.vpc,
  auroraSecurityGroup: networkStack.auroraSecurityGroup,
  env: awsEnv,
  description: `Kairos ${config.env} - Aurora Serverless v2 PostgreSQL 15`,
});
databaseStack.addDependency(networkStack);

// ---------------------------------------------------------------
// 3. Storage Stack — S3 buckets + CloudFront CDN
// ---------------------------------------------------------------
const storageStack = new StorageStack(app, `${config.prefix}-storage`, {
  config,
  env: awsEnv,
  description: `Kairos ${config.env} - S3 buckets and CloudFront distribution`,
});

// ---------------------------------------------------------------
// 4. Auth Stack — Cognito User Pool
// ---------------------------------------------------------------
const authStack = new AuthStack(app, `${config.prefix}-auth`, {
  config,
  env: awsEnv,
  description: `Kairos ${config.env} - Cognito User Pool and client`,
});

// ---------------------------------------------------------------
// 5. API Stack — API Gateway HTTP API + Custom Authorizer + All Routes
// ---------------------------------------------------------------
const apiStack = new ApiStack(app, `${config.prefix}-api`, {
  config,
  vpc: networkStack.vpc,
  lambdaSecurityGroup: networkStack.lambdaSecurityGroup,
  userPool: authStack.userPool,
  userPoolClient: authStack.userPoolClient,
  databaseSecret: databaseStack.clusterSecret,
  memberPhotosBucket: storageStack.memberPhotosBucket,
  csvExportsBucket: storageStack.csvExportsBucket,
  formUploadsBucket: storageStack.formUploadsBucket,
  env: awsEnv,
  description: `Kairos ${config.env} - API Gateway HTTP API with all Lambda routes`,
});
apiStack.addDependency(networkStack);
apiStack.addDependency(authStack);
apiStack.addDependency(databaseStack);
apiStack.addDependency(storageStack);

// ---------------------------------------------------------------
// 6. Analytics Stack — EventBridge scheduled export to S3
// ---------------------------------------------------------------
const analyticsStack = new AnalyticsStack(app, `${config.prefix}-analytics`, {
  config,
  vpc: networkStack.vpc,
  lambdaSecurityGroup: networkStack.lambdaSecurityGroup,
  databaseSecret: databaseStack.clusterSecret,
  analyticsExportsBucket: storageStack.analyticsExportsBucket,
  env: awsEnv,
  description: `Kairos ${config.env} - Analytics nightly export (EventBridge + Lambda)`,
});
analyticsStack.addDependency(networkStack);
analyticsStack.addDependency(databaseStack);
analyticsStack.addDependency(storageStack);

// ---------------------------------------------------------------
// 7. Monitoring Stack — CloudWatch alarms, dashboards
// ---------------------------------------------------------------
const monitoringStack = new MonitoringStack(app, `${config.prefix}-monitoring`, {
  config,
  httpApi: apiStack.httpApi,
  databaseCluster: databaseStack.cluster,
  lambdaFunctionNames: [], // Lambda metrics are aggregated across all functions
  env: awsEnv,
  description: `Kairos ${config.env} - CloudWatch alarms and dashboards`,
});
monitoringStack.addDependency(apiStack);
monitoringStack.addDependency(databaseStack);

// ---------------------------------------------------------------
// 8. Web Stack — S3 + CloudFront for Next.js static site
// ---------------------------------------------------------------
const webStack = new WebStack(app, `${config.prefix}-web`, {
  config,
  env: awsEnv,
  description: `Kairos ${config.env} - Next.js static site (S3 + CloudFront)`,
});

app.synth();
