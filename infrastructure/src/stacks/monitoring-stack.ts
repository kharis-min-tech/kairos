import * as cdk from 'aws-cdk-lib';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as apigatewayv2 from 'aws-cdk-lib/aws-apigatewayv2';
import { Construct } from 'constructs';
import { KairosConfig } from '../config';

export interface MonitoringStackProps extends cdk.StackProps {
  config: KairosConfig;
  httpApi: apigatewayv2.IHttpApi;
  databaseCluster: rds.IDatabaseCluster;
  /** All Lambda function names to monitor */
  lambdaFunctionNames: string[];
}

/**
 * Monitoring Stack — CloudWatch alarms, dashboards, and X-Ray tracing config.
 *
 * Task 36.1: CloudWatch alarms (Lambda errors, duration, API 5xx, Aurora CPU/connections)
 * Task 36.2: CloudWatch dashboards (API, Lambda, Database performance)
 * Task 36.3: X-Ray tracing (configured per-function in ApiStack)
 *
 * Requirements: 35.7, Monitoring
 */
export class MonitoringStack extends cdk.Stack {
  public readonly dashboard: cloudwatch.Dashboard;

  constructor(scope: Construct, id: string, props: MonitoringStackProps) {
    super(scope, id, props);

    const { config, httpApi, databaseCluster, lambdaFunctionNames } = props;

    // ---------------------------------------------------------------
    // Task 36.1: CloudWatch Alarms
    // ---------------------------------------------------------------
    this.createAlarms(config, httpApi, databaseCluster, lambdaFunctionNames);

    // ---------------------------------------------------------------
    // Task 36.2: CloudWatch Dashboards
    // ---------------------------------------------------------------
    this.dashboard = this.createDashboard(config, httpApi, databaseCluster, lambdaFunctionNames);

    // ---------------------------------------------------------------
    // Task 36.3: X-Ray Sampling Rule (10% sampling rate)
    // Tracing is enabled per-function in ApiStack and AnalyticsStack.
    // ---------------------------------------------------------------
    new cdk.CfnResource(this, 'XRaySamplingRule', {
      type: 'AWS::XRay::SamplingRule',
      properties: {
        SamplingRule: {
          RuleName: `${config.prefix}-sampling-rule`,
          Priority: 1000,
          FixedRate: 0.1, // 10% sampling rate
          ReservoirSize: 1, // 1 request per second guaranteed
          ServiceName: '*',
          ServiceType: '*',
          Host: '*',
          ResourceARN: '*',
          HTTPMethod: '*',
          URLPath: '*',
          Version: 1,
        },
      },
    });

    // ---------------------------------------------------------------
    // Tags
    // ---------------------------------------------------------------
    cdk.Tags.of(this).add('Project', 'kairos');
    cdk.Tags.of(this).add('Environment', config.env);
  }

  /**
   * Task 36.1: Create CloudWatch alarms for critical metrics.
   */
  private createAlarms(
    config: KairosConfig,
    httpApi: apigatewayv2.IHttpApi,
    databaseCluster: rds.IDatabaseCluster,
    lambdaFunctionNames: string[],
  ): void {
    // --- Lambda Error Rate > 5% (aggregated across all functions) ---
    const lambdaErrors = new cloudwatch.MathExpression({
      expression: 'errors / invocations * 100',
      usingMetrics: {
        errors: new cloudwatch.Metric({
          namespace: 'AWS/Lambda',
          metricName: 'Errors',
          statistic: 'Sum',
          period: cdk.Duration.minutes(5),
        }),
        invocations: new cloudwatch.Metric({
          namespace: 'AWS/Lambda',
          metricName: 'Invocations',
          statistic: 'Sum',
          period: cdk.Duration.minutes(5),
        }),
      },
      period: cdk.Duration.minutes(5),
    });

    new cloudwatch.Alarm(this, 'LambdaErrorRateAlarm', {
      alarmName: `${config.prefix}-lambda-error-rate`,
      alarmDescription: 'Lambda error rate exceeds 5% across all functions',
      metric: lambdaErrors,
      threshold: 5,
      evaluationPeriods: 3,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    });

    // --- Lambda Duration > 10s (p99, aggregated) ---
    new cloudwatch.Alarm(this, 'LambdaDurationAlarm', {
      alarmName: `${config.prefix}-lambda-duration-p99`,
      alarmDescription: 'Lambda p99 duration exceeds 10 seconds',
      metric: new cloudwatch.Metric({
        namespace: 'AWS/Lambda',
        metricName: 'Duration',
        statistic: 'p99',
        period: cdk.Duration.minutes(5),
      }),
      threshold: 10_000, // 10 seconds in milliseconds
      evaluationPeriods: 3,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    });

    // --- API Gateway 5xx Errors > 1% ---
    const api5xxRate = new cloudwatch.MathExpression({
      expression: 'errors5xx / totalRequests * 100',
      usingMetrics: {
        errors5xx: new cloudwatch.Metric({
          namespace: 'AWS/ApiGateway',
          metricName: '5xx',
          dimensionsMap: { ApiId: httpApi.apiId },
          statistic: 'Sum',
          period: cdk.Duration.minutes(5),
        }),
        totalRequests: new cloudwatch.Metric({
          namespace: 'AWS/ApiGateway',
          metricName: 'Count',
          dimensionsMap: { ApiId: httpApi.apiId },
          statistic: 'Sum',
          period: cdk.Duration.minutes(5),
        }),
      },
      period: cdk.Duration.minutes(5),
    });

    new cloudwatch.Alarm(this, 'ApiGateway5xxAlarm', {
      alarmName: `${config.prefix}-api-5xx-rate`,
      alarmDescription: 'API Gateway 5xx error rate exceeds 1%',
      metric: api5xxRate,
      threshold: 1,
      evaluationPeriods: 3,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    });

    // --- Aurora CPU Utilization > 80% ---
    new cloudwatch.Alarm(this, 'AuroraCpuAlarm', {
      alarmName: `${config.prefix}-aurora-cpu`,
      alarmDescription: 'Aurora CPU utilization exceeds 80%',
      metric: databaseCluster.metricCPUUtilization({
        period: cdk.Duration.minutes(5),
        statistic: 'Average',
      }),
      threshold: 80,
      evaluationPeriods: 3,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    });

    // --- Aurora Connections > 80% of max ---
    // Aurora Serverless v2 max connections ≈ 2000 * ACUs. For staging (2 ACU max) = ~4000.
    // We use a fixed threshold based on environment.
    const maxConnections = config.auroraMaxAcu * 2000;
    const connectionThreshold = Math.floor(maxConnections * 0.8);

    new cloudwatch.Alarm(this, 'AuroraConnectionsAlarm', {
      alarmName: `${config.prefix}-aurora-connections`,
      alarmDescription: `Aurora connections exceed 80% of max (${connectionThreshold})`,
      metric: databaseCluster.metricDatabaseConnections({
        period: cdk.Duration.minutes(5),
        statistic: 'Average',
      }),
      threshold: connectionThreshold,
      evaluationPeriods: 3,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    });
  }

  /**
   * Task 36.2: Create CloudWatch dashboards for API, Lambda, and Database performance.
   */
  private createDashboard(
    config: KairosConfig,
    httpApi: apigatewayv2.IHttpApi,
    databaseCluster: rds.IDatabaseCluster,
    lambdaFunctionNames: string[],
  ): cloudwatch.Dashboard {
    const apiDimensions = { ApiId: httpApi.apiId };

    // --- API Performance Widgets ---
    const apiLatencyWidget = new cloudwatch.GraphWidget({
      title: 'API Latency (ms)',
      width: 12,
      left: [
        new cloudwatch.Metric({
          namespace: 'AWS/ApiGateway',
          metricName: 'Latency',
          dimensionsMap: apiDimensions,
          statistic: 'p50',
          period: cdk.Duration.minutes(5),
          label: 'p50',
        }),
        new cloudwatch.Metric({
          namespace: 'AWS/ApiGateway',
          metricName: 'Latency',
          dimensionsMap: apiDimensions,
          statistic: 'p90',
          period: cdk.Duration.minutes(5),
          label: 'p90',
        }),
        new cloudwatch.Metric({
          namespace: 'AWS/ApiGateway',
          metricName: 'Latency',
          dimensionsMap: apiDimensions,
          statistic: 'p99',
          period: cdk.Duration.minutes(5),
          label: 'p99',
        }),
      ],
    });

    const apiErrorsWidget = new cloudwatch.GraphWidget({
      title: 'API Errors',
      width: 12,
      left: [
        new cloudwatch.Metric({
          namespace: 'AWS/ApiGateway',
          metricName: '4xx',
          dimensionsMap: apiDimensions,
          statistic: 'Sum',
          period: cdk.Duration.minutes(5),
          label: '4xx',
        }),
        new cloudwatch.Metric({
          namespace: 'AWS/ApiGateway',
          metricName: '5xx',
          dimensionsMap: apiDimensions,
          statistic: 'Sum',
          period: cdk.Duration.minutes(5),
          label: '5xx',
        }),
      ],
    });

    const apiRequestsWidget = new cloudwatch.GraphWidget({
      title: 'API Requests',
      width: 12,
      left: [
        new cloudwatch.Metric({
          namespace: 'AWS/ApiGateway',
          metricName: 'Count',
          dimensionsMap: apiDimensions,
          statistic: 'Sum',
          period: cdk.Duration.minutes(5),
          label: 'Total Requests',
        }),
      ],
    });

    // --- Lambda Performance Widgets ---
    const lambdaDurationWidget = new cloudwatch.GraphWidget({
      title: 'Lambda Duration (ms)',
      width: 12,
      left: [
        new cloudwatch.Metric({
          namespace: 'AWS/Lambda',
          metricName: 'Duration',
          statistic: 'p50',
          period: cdk.Duration.minutes(5),
          label: 'p50',
        }),
        new cloudwatch.Metric({
          namespace: 'AWS/Lambda',
          metricName: 'Duration',
          statistic: 'p90',
          period: cdk.Duration.minutes(5),
          label: 'p90',
        }),
        new cloudwatch.Metric({
          namespace: 'AWS/Lambda',
          metricName: 'Duration',
          statistic: 'p99',
          period: cdk.Duration.minutes(5),
          label: 'p99',
        }),
      ],
    });

    const lambdaErrorsWidget = new cloudwatch.GraphWidget({
      title: 'Lambda Errors & Throttles',
      width: 12,
      left: [
        new cloudwatch.Metric({
          namespace: 'AWS/Lambda',
          metricName: 'Errors',
          statistic: 'Sum',
          period: cdk.Duration.minutes(5),
          label: 'Errors',
        }),
        new cloudwatch.Metric({
          namespace: 'AWS/Lambda',
          metricName: 'Throttles',
          statistic: 'Sum',
          period: cdk.Duration.minutes(5),
          label: 'Throttles',
        }),
      ],
    });

    const lambdaInvocationsWidget = new cloudwatch.GraphWidget({
      title: 'Lambda Invocations',
      width: 12,
      left: [
        new cloudwatch.Metric({
          namespace: 'AWS/Lambda',
          metricName: 'Invocations',
          statistic: 'Sum',
          period: cdk.Duration.minutes(5),
          label: 'Invocations',
        }),
        new cloudwatch.Metric({
          namespace: 'AWS/Lambda',
          metricName: 'ConcurrentExecutions',
          statistic: 'Maximum',
          period: cdk.Duration.minutes(5),
          label: 'Concurrent Executions',
        }),
      ],
    });

    // --- Database Performance Widgets ---
    const dbCpuWidget = new cloudwatch.GraphWidget({
      title: 'Aurora CPU Utilization (%)',
      width: 12,
      left: [
        databaseCluster.metricCPUUtilization({
          period: cdk.Duration.minutes(5),
          statistic: 'Average',
          label: 'CPU %',
        }),
      ],
    });

    const dbConnectionsWidget = new cloudwatch.GraphWidget({
      title: 'Aurora Database Connections',
      width: 12,
      left: [
        databaseCluster.metricDatabaseConnections({
          period: cdk.Duration.minutes(5),
          statistic: 'Average',
          label: 'Connections',
        }),
      ],
    });

    const dbCapacityWidget = new cloudwatch.GraphWidget({
      title: 'Aurora Serverless Capacity (ACUs)',
      width: 12,
      left: [
        new cloudwatch.Metric({
          namespace: 'AWS/RDS',
          metricName: 'ServerlessDatabaseCapacity',
          dimensionsMap: { DBClusterIdentifier: `${config.prefix}-aurora-cluster` },
          statistic: 'Average',
          period: cdk.Duration.minutes(5),
          label: 'ACUs',
        }),
      ],
    });

    // --- Assemble Dashboard ---
    const dashboard = new cloudwatch.Dashboard(this, 'KairosDashboard', {
      dashboardName: `${config.prefix}-dashboard`,
      defaultInterval: cdk.Duration.hours(3),
    });

    // Row 1: API Performance
    dashboard.addWidgets(
      new cloudwatch.TextWidget({ markdown: '# API Performance', width: 24, height: 1 }),
    );
    dashboard.addWidgets(apiLatencyWidget, apiErrorsWidget);
    dashboard.addWidgets(apiRequestsWidget);

    // Row 2: Lambda Performance
    dashboard.addWidgets(
      new cloudwatch.TextWidget({ markdown: '# Lambda Performance', width: 24, height: 1 }),
    );
    dashboard.addWidgets(lambdaDurationWidget, lambdaErrorsWidget);
    dashboard.addWidgets(lambdaInvocationsWidget);

    // Row 3: Database Performance
    dashboard.addWidgets(
      new cloudwatch.TextWidget({ markdown: '# Database Performance', width: 24, height: 1 }),
    );
    dashboard.addWidgets(dbCpuWidget, dbConnectionsWidget);
    dashboard.addWidgets(dbCapacityWidget);

    return dashboard;
  }
}
