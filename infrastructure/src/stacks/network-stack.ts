import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { Construct } from 'constructs';
import { KairosConfig } from '../config';

export interface NetworkStackProps extends cdk.StackProps {
  config: KairosConfig;
}

/**
 * VPC and Network Stack for Kairos.
 *
 * Creates:
 * - VPC with CIDR 10.0.0.0/16
 * - 2 private subnets across 2 AZs (eu-west-2a, eu-west-2b)
 * - VPC endpoints for S3 (Gateway), Secrets Manager, Systems Manager
 * - Security groups for Lambda and Aurora
 *
 * Requirements: 35.5, 35.6
 */
export class NetworkStack extends cdk.Stack {
  public readonly vpc: ec2.IVpc;
  public readonly lambdaSecurityGroup: ec2.ISecurityGroup;
  public readonly auroraSecurityGroup: ec2.ISecurityGroup;

  constructor(scope: Construct, id: string, props: NetworkStackProps) {
    super(scope, id, props);

    const { config } = props;

    // ---------------------------------------------------------------
    // VPC — private subnets only (no public / NAT to save costs)
    // ---------------------------------------------------------------
    this.vpc = new ec2.Vpc(this, 'Vpc', {
      vpcName: `${config.prefix}-vpc`,
      ipAddresses: ec2.IpAddresses.cidr(config.vpcCidr),
      maxAzs: 2,
      natGateways: 0, // No NAT — use VPC endpoints instead
      subnetConfiguration: [
        {
          cidrMask: 24,
          name: 'private-isolated',
          subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
        },
      ],
    });

    // ---------------------------------------------------------------
    // Security Groups
    // ---------------------------------------------------------------

    // Lambda security group — allows outbound to Aurora and VPC endpoints
    this.lambdaSecurityGroup = new ec2.SecurityGroup(this, 'LambdaSg', {
      vpc: this.vpc,
      securityGroupName: `${config.prefix}-lambda-sg`,
      description: 'Security group for Lambda functions accessing VPC resources',
      allowAllOutbound: false,
    });

    // Aurora security group — allows inbound from Lambda on PostgreSQL port
    this.auroraSecurityGroup = new ec2.SecurityGroup(this, 'AuroraSg', {
      vpc: this.vpc,
      securityGroupName: `${config.prefix}-aurora-sg`,
      description: 'Security group for Aurora Serverless v2 cluster',
      allowAllOutbound: false,
    });

    // Allow Lambda → Aurora on port 5432
    this.auroraSecurityGroup.addIngressRule(
      this.lambdaSecurityGroup,
      ec2.Port.tcp(5432),
      'Allow Lambda to connect to Aurora PostgreSQL',
    );

    // Allow Lambda outbound to Aurora on port 5432
    this.lambdaSecurityGroup.addEgressRule(
      this.auroraSecurityGroup,
      ec2.Port.tcp(5432),
      'Allow Lambda to connect to Aurora PostgreSQL',
    );

    // Allow Lambda outbound HTTPS (443) for VPC endpoints
    this.lambdaSecurityGroup.addEgressRule(
      ec2.Peer.ipv4(config.vpcCidr),
      ec2.Port.tcp(443),
      'Allow Lambda HTTPS to VPC endpoints',
    );

    // ---------------------------------------------------------------
    // VPC Endpoints
    // ---------------------------------------------------------------

    // S3 Gateway Endpoint — no data transfer charges
    this.vpc.addGatewayEndpoint('S3Endpoint', {
      service: ec2.GatewayVpcEndpointAwsService.S3,
    });

    // Secrets Manager Interface Endpoint
    this.vpc.addInterfaceEndpoint('SecretsManagerEndpoint', {
      service: ec2.InterfaceVpcEndpointAwsService.SECRETS_MANAGER,
      privateDnsEnabled: true,
      securityGroups: [this.createEndpointSecurityGroup('secrets-manager')],
    });

    // Systems Manager (SSM) Interface Endpoint
    this.vpc.addInterfaceEndpoint('SsmEndpoint', {
      service: ec2.InterfaceVpcEndpointAwsService.SSM,
      privateDnsEnabled: true,
      securityGroups: [this.createEndpointSecurityGroup('ssm')],
    });

    // Cognito User Pools (IDP) Interface Endpoint — allows in-VPC Lambdas to call admin APIs
    this.vpc.addInterfaceEndpoint('CognitoIdpEndpoint', {
      service: ec2.InterfaceVpcEndpointAwsService.COGNITO_IDP,
      privateDnsEnabled: true,
      securityGroups: [this.createEndpointSecurityGroup('cognito-idp')],
    });

    // ---------------------------------------------------------------
    // Tags
    // ---------------------------------------------------------------
    cdk.Tags.of(this).add('Project', 'kairos');
    cdk.Tags.of(this).add('Environment', config.env);

    // ---------------------------------------------------------------
    // Outputs
    // ---------------------------------------------------------------
    new cdk.CfnOutput(this, 'VpcId', {
      value: this.vpc.vpcId,
      description: 'VPC ID',
      exportName: `${config.prefix}-vpc-id`,
    });

    new cdk.CfnOutput(this, 'LambdaSecurityGroupId', {
      value: this.lambdaSecurityGroup.securityGroupId,
      description: 'Lambda Security Group ID',
      exportName: `${config.prefix}-lambda-sg-id`,
    });

    new cdk.CfnOutput(this, 'AuroraSecurityGroupId', {
      value: this.auroraSecurityGroup.securityGroupId,
      description: 'Aurora Security Group ID',
      exportName: `${config.prefix}-aurora-sg-id`,
    });
  }

  /**
   * Creates a security group for a VPC interface endpoint.
   * Allows inbound HTTPS (443) from the VPC CIDR.
   */
  private createEndpointSecurityGroup(name: string): ec2.SecurityGroup {
    const sg = new ec2.SecurityGroup(this, `${name}-endpoint-sg`, {
      vpc: this.vpc,
      securityGroupName: `${this.node.tryGetContext('prefix') || 'kairos'}-${name}-endpoint-sg`,
      description: `Security group for ${name} VPC endpoint`,
      allowAllOutbound: false,
    });

    sg.addIngressRule(
      ec2.Peer.ipv4(this.vpc.vpcCidrBlock),
      ec2.Port.tcp(443),
      `Allow HTTPS from VPC to ${name} endpoint`,
    );

    return sg;
  }
}
