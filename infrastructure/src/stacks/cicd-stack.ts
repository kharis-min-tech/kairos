import * as cdk from 'aws-cdk-lib';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';
import { KairosConfig } from '../config';

export interface CicdStackProps extends cdk.StackProps {
  config: KairosConfig;
  /** GitHub org/user name, e.g. "kharis-github" */
  githubOrg: string;
  /** GitHub repo name, e.g. "kairos" */
  githubRepo: string;
}

/**
 * Creates the GitHub Actions OIDC provider (once per account) and a
 * deploy role that GitHub Actions can assume via short-lived tokens.
 * No static AWS credentials needed.
 */
export class CicdStack extends cdk.Stack {
  public readonly deployRole: iam.Role;

  constructor(scope: Construct, id: string, props: CicdStackProps) {
    super(scope, id, props);

    const { config, githubOrg, githubRepo } = props;

    // OIDC provider — one per AWS account, CDK handles idempotency
    const githubProvider = new iam.OpenIdConnectProvider(this, 'GithubOidcProvider', {
      url: 'https://token.actions.githubusercontent.com',
      clientIds: ['sts.amazonaws.com'],
    });

    // Role that GitHub Actions assumes
    this.deployRole = new iam.Role(this, 'DeployRole', {
      roleName: `${config.prefix}-github-actions-deploy`,
      assumedBy: new iam.WebIdentityPrincipal(githubProvider.openIdConnectProviderArn, {
        StringEquals: {
          'token.actions.githubusercontent.com:aud': 'sts.amazonaws.com',
        },
        StringLike: {
          // Allow any branch/tag/PR in this repo
          'token.actions.githubusercontent.com:sub': `repo:${githubOrg}/${githubRepo}:*`,
        },
      }),
      description: `GitHub Actions deploy role for Kairos ${config.env}`,
      maxSessionDuration: cdk.Duration.hours(1),
    });

    // CDK deploy needs these permissions
    this.deployRole.addManagedPolicy(
      iam.ManagedPolicy.fromAwsManagedPolicyName('AdministratorAccess'),
    );

    new cdk.CfnOutput(this, 'DeployRoleArn', {
      value: this.deployRole.roleArn,
      description: 'Set this as AWS_STAGING_ROLE_ARN in GitHub secrets',
      exportName: `${config.prefix}-deploy-role-arn`,
    });
  }
}
