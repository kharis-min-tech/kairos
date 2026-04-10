import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as events from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as nodejs from 'aws-cdk-lib/aws-lambda-nodejs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import { Construct } from 'constructs';
import * as path from 'path';
import { KairosConfig } from '../config';

export interface AnalyticsStackProps extends cdk.StackProps {
  config: KairosConfig;
  /** VPC for Lambda functions that need database access */
  vpc: ec2.IVpc;
  /** Security group for Lambda functions in the VPC */
  lambdaSecurityGroup: ec2.ISecurityGroup;
  /** Aurora database secret for connection credentials */
  databaseSecret: secretsmanager.ISecret;
  /** S3 bucket for analytics exports (Parquet format) */
  analyticsExportsBucket: s3.IBucket;
}

/**
 * Analytics Stack for Kairos.
 *
 * Creates:
 * - analytics-export-to-s3 Lambda function
 * - EventBridge scheduled rule: triggers Lambda at 2 AM daily (cron(0 2 * * ? *))
 *
 * The Lambda exports database tables (members, donations, attendance, souls,
 * branches, departments, fellowships) to S3 in Parquet format for Power BI.
 *
 * Requirements: 30.1, 30.2, 30.3, 30.4, 30.6
 */
export class AnalyticsStack extends cdk.Stack {
  public readonly exportFunction: lambda.IFunction;
  public readonly scheduledRule: events.Rule;

  constructor(scope: Construct, id: string, props: AnalyticsStackProps) {
    super(scope, id, props);

    const {
      config,
      vpc,
      lambdaSecurityGroup,
      databaseSecret,
      analyticsExportsBucket,
    } = props;

    // Monorepo root — needed so esbuild can resolve @kairos/* workspace packages
    const monorepoRoot = path.join(__dirname, '..', '..', '..');

    // ---------------------------------------------------------------
    // Analytics Export Lambda
    // ---------------------------------------------------------------
    this.exportFunction = new nodejs.NodejsFunction(this, 'AnalyticsExportFn', {
      functionName: `${config.prefix}-analytics-export-to-s3`,
      description:
        'Nightly export of database tables to S3 in Parquet format for Power BI (Req 30)',
      runtime: lambda.Runtime.NODEJS_20_X,
      entry: path.join(
        monorepoRoot,
        'apps',
        'api',
        'src',
        'analytics',
        'analytics-export-to-s3.ts',
      ),
      handler: 'handler',
      memorySize: 1024,
      timeout: cdk.Duration.minutes(5),
      architecture: lambda.Architecture.ARM_64,
      tracing: lambda.Tracing.ACTIVE,
      vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_ISOLATED },
      securityGroups: [lambdaSecurityGroup],
      environment: {
        DATABASE_SECRET_ARN: databaseSecret.secretArn,
        ANALYTICS_EXPORT_BUCKET: analyticsExportsBucket.bucketName,
        NODE_OPTIONS: '--enable-source-maps',
      },
      projectRoot: monorepoRoot,
      depsLockFilePath: path.join(monorepoRoot, 'package-lock.json'),
      bundling: {
        minify: true,
        sourceMap: true,
        target: 'es2022',
        externalModules: ['@aws-sdk/*'],
        esbuildArgs: {
          '--alias:@kairos/utils': './packages/utils/src/index.ts',
          '--alias:@kairos/database': './packages/database/src/index.ts',
        },
      },
    });

    // Grant the Lambda read access to the database secret
    databaseSecret.grantRead(this.exportFunction);

    // Grant the Lambda write access to the analytics exports bucket
    analyticsExportsBucket.grantWrite(this.exportFunction);

    // ---------------------------------------------------------------
    // EventBridge Scheduled Rule — 2 AM daily (Req 30.3)
    // ---------------------------------------------------------------
    this.scheduledRule = new events.Rule(this, 'NightlyExportRule', {
      ruleName: `${config.prefix}-analytics-nightly-export`,
      description:
        'Triggers analytics-export-to-s3 Lambda at 2 AM daily (Req 30.3)',
      schedule: events.Schedule.cron({
        minute: '0',
        hour: '2',
        day: '*',
        month: '*',
        year: '*',
      }),
      enabled: true,
    });

    this.scheduledRule.addTarget(
      new targets.LambdaFunction(this.exportFunction, {
        retryAttempts: 2,
      }),
    );

    // ---------------------------------------------------------------
    // Tags
    // ---------------------------------------------------------------
    cdk.Tags.of(this).add('Project', 'kairos');
    cdk.Tags.of(this).add('Environment', config.env);

    // ---------------------------------------------------------------
    // Outputs
    // ---------------------------------------------------------------
    new cdk.CfnOutput(this, 'AnalyticsExportFunctionArn', {
      value: this.exportFunction.functionArn,
      description: 'Analytics export Lambda function ARN',
      exportName: `${config.prefix}-analytics-export-fn-arn`,
    });

    new cdk.CfnOutput(this, 'NightlyExportRuleArn', {
      value: this.scheduledRule.ruleArn,
      description: 'EventBridge nightly export rule ARN',
      exportName: `${config.prefix}-analytics-nightly-export-rule-arn`,
    });
  }
}
