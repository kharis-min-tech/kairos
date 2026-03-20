/**
 * Environment configuration for Kairos CDK stacks.
 * Supports staging and production environments with different resource sizing.
 */

export type Environment = 'staging' | 'prod';

export interface KairosConfig {
  /** Environment name */
  env: Environment;
  /** AWS region */
  region: string;
  /** Resource name prefix (e.g., kairos-staging or kairos-prod) */
  prefix: string;
  /** VPC CIDR block */
  vpcCidr: string;
  /** Aurora min ACUs */
  auroraMinAcu: number;
  /** Aurora max ACUs */
  auroraMaxAcu: number;
  /** Aurora multi-AZ */
  auroraMultiAz: boolean;
  /** Backup retention days */
  backupRetentionDays: number;
  /** API throttle rate limit (requests per second) */
  apiThrottleRateLimit: number;
  /** API throttle burst limit */
  apiThrottleBurstLimit: number;
  /** Cognito JWT token validity in hours */
  jwtTokenValidityHours: number;
  /** Web app domain(s) for CORS */
  webAppDomains: string[];
  /** Authorizer cache TTL in seconds (0 to disable caching) */
  authorizerCacheTtlSeconds: number;
  /** Root domain (e.g., khar.is) */
  domain: string;
  /** Web subdomain (e.g., staging → staging.khar.is) */
  webSubdomain: string;
  /** API subdomain (e.g., api-staging → api-staging.khar.is) */
  apiSubdomain: string;
  /** ACM certificate ARN in us-east-1 (for CloudFront) */
  cloudfrontCertArn: string;
  /** ACM certificate ARN in the API region (for API Gateway custom domain) */
  apiCertArn: string;
}

const baseConfig = {
  region: 'eu-west-2',
  vpcCidr: '10.0.0.0/16',
  backupRetentionDays: 7,
  jwtTokenValidityHours: 24,
};

export const stagingConfig: KairosConfig = {
  ...baseConfig,
  env: 'staging',
  prefix: 'kairos-staging',
  auroraMinAcu: 0.5,
  auroraMaxAcu: 2,
  auroraMultiAz: false,
  apiThrottleRateLimit: 100,
  apiThrottleBurstLimit: 50,
  webAppDomains: ['https://staging.khar.is'],
  authorizerCacheTtlSeconds: 300,
  domain: 'khar.is',
  webSubdomain: 'staging',
  apiSubdomain: 'api-staging',
  cloudfrontCertArn: 'arn:aws:acm:us-east-1:742213192328:certificate/0d59a91b-3bcf-4c0c-85ea-ad39617fd559',
  apiCertArn: 'arn:aws:acm:eu-west-2:742213192328:certificate/e15a9326-affd-430b-91fd-63ee5b202bec',
};

export const prodConfig: KairosConfig = {
  ...baseConfig,
  env: 'prod',
  prefix: 'kairos-prod',
  auroraMinAcu: 0.5,
  auroraMaxAcu: 16,
  auroraMultiAz: true,
  apiThrottleRateLimit: 1000,
  apiThrottleBurstLimit: 500,
  webAppDomains: ['https://app.khar.is'],
  authorizerCacheTtlSeconds: 300,
  domain: 'khar.is',
  webSubdomain: 'app',
  apiSubdomain: 'api',
  cloudfrontCertArn: '', // TODO: create prod cert in us-east-1
  apiCertArn: '', // TODO: create prod cert in eu-west-2
};

export function getConfig(env: Environment): KairosConfig {
  switch (env) {
    case 'staging':
      return stagingConfig;
    case 'prod':
      return prodConfig;
    default:
      throw new Error(`Unknown environment: ${env}`);
  }
}
