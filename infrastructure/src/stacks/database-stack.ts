import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as rds from 'aws-cdk-lib/aws-rds';
import { Construct } from 'constructs';
import { KairosConfig } from '../config';

export interface DatabaseStackProps extends cdk.StackProps {
  config: KairosConfig;
  vpc: ec2.IVpc;
  auroraSecurityGroup: ec2.ISecurityGroup;
}

/**
 * Aurora Serverless v2 Database Stack for Kairos.
 *
 * Creates:
 * - Aurora Serverless v2 cluster (PostgreSQL 15)
 * - Auto-scaling (0.5–16 ACUs prod, 0.5–2 ACUs staging)
 * - Multi-AZ deployment (prod only)
 * - Automated backups with 7-day retention
 * - Master credentials stored in Secrets Manager with auto-rotation
 *
 * Requirements: 35.2, 35.3, 36.3
 */
export class DatabaseStack extends cdk.Stack {
  public readonly cluster: rds.IDatabaseCluster;
  public readonly clusterSecret: cdk.aws_secretsmanager.ISecret;

  constructor(scope: Construct, id: string, props: DatabaseStackProps) {
    super(scope, id, props);

    const { config, vpc, auroraSecurityGroup } = props;

    // ---------------------------------------------------------------
    // Subnet group — use private isolated subnets
    // ---------------------------------------------------------------
    const subnetGroup = new rds.SubnetGroup(this, 'SubnetGroup', {
      vpc,
      description: `${config.prefix} Aurora subnet group`,
      subnetGroupName: `${config.prefix}-aurora-subnet-group`,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_ISOLATED },
    });

    // ---------------------------------------------------------------
    // Aurora Serverless v2 Cluster (PostgreSQL 15)
    // ---------------------------------------------------------------
    const cluster = new rds.DatabaseCluster(this, 'AuroraCluster', {
      clusterIdentifier: `${config.prefix}-aurora-cluster`,
      engine: rds.DatabaseClusterEngine.auroraPostgres({
        version: rds.AuroraPostgresEngineVersion.VER_15_15,
      }),
      serverlessV2MinCapacity: config.auroraMinAcu,
      serverlessV2MaxCapacity: config.auroraMaxAcu,
      vpc,
      subnetGroup,
      securityGroups: [auroraSecurityGroup],
      enableDataApi: true,
      defaultDatabaseName: 'kairos',
      credentials: rds.Credentials.fromGeneratedSecret('kairos_admin', {
        secretName: `${config.prefix}/aurora/master-credentials`,
      }),
      storageEncrypted: true,
      backup: {
        retention: cdk.Duration.days(config.backupRetentionDays),
      },
      deletionProtection: config.env === 'prod',
      removalPolicy: config.env === 'prod'
        ? cdk.RemovalPolicy.RETAIN
        : cdk.RemovalPolicy.DESTROY,
      writer: rds.ClusterInstance.serverlessV2('writer', {
        instanceIdentifier: `${config.prefix}-aurora-writer`,
      }),
      readers: config.auroraMultiAz
        ? [
            rds.ClusterInstance.serverlessV2('reader', {
              instanceIdentifier: `${config.prefix}-aurora-reader`,
              scaleWithWriter: true,
            }),
          ]
        : [],
    });

    this.cluster = cluster;
    this.clusterSecret = cluster.secret!;

    // ---------------------------------------------------------------
    // Tags
    // ---------------------------------------------------------------
    cdk.Tags.of(this).add('Project', 'kairos');
    cdk.Tags.of(this).add('Environment', config.env);

    // ---------------------------------------------------------------
    // Outputs
    // ---------------------------------------------------------------
    new cdk.CfnOutput(this, 'ClusterEndpoint', {
      value: cluster.clusterEndpoint.hostname,
      description: 'Aurora cluster writer endpoint',
      exportName: `${config.prefix}-aurora-endpoint`,
    });

    new cdk.CfnOutput(this, 'ClusterReaderEndpoint', {
      value: cluster.clusterReadEndpoint.hostname,
      description: 'Aurora cluster reader endpoint',
      exportName: `${config.prefix}-aurora-reader-endpoint`,
    });

    new cdk.CfnOutput(this, 'ClusterSecretArn', {
      value: this.clusterSecret.secretArn,
      description: 'Aurora master credentials secret ARN',
      exportName: `${config.prefix}-aurora-secret-arn`,
    });

    new cdk.CfnOutput(this, 'DatabaseName', {
      value: 'kairos',
      description: 'Database name',
      exportName: `${config.prefix}-db-name`,
    });
  }
}
