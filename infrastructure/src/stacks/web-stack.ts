import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';
import { Construct } from 'constructs';
import * as path from 'path';
import { KairosConfig } from '../config';

export interface WebStackProps extends cdk.StackProps {
  config: KairosConfig;
}

/**
 * Web Hosting Stack — S3 + CloudFront for the Next.js static export.
 *
 * Serves the pre-built Next.js static site from S3 via CloudFront CDN.
 * All routing is client-side (SPA), so CloudFront returns index.html for 403/404.
 */
export class WebStack extends cdk.Stack {
  public readonly distribution: cloudfront.IDistribution;
  public readonly siteBucket: s3.IBucket;

  constructor(scope: Construct, id: string, props: WebStackProps) {
    super(scope, id, props);

    const { config } = props;

    // S3 bucket for static site files
    this.siteBucket = new s3.Bucket(this, 'SiteBucket', {
      bucketName: `${config.prefix}-ui`,
      encryption: s3.BucketEncryption.S3_MANAGED,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: config.env === 'prod'
        ? cdk.RemovalPolicy.RETAIN
        : cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: config.env !== 'prod',
    });

    // Custom domain + TLS certificate (cert must be in us-east-1 for CloudFront)
    const webDomainName = `${config.webSubdomain}.${config.domain}`;
    const certificate = config.cloudfrontCertArn
      ? acm.Certificate.fromCertificateArn(this, 'WebCert', config.cloudfrontCertArn)
      : undefined;

    // CloudFront distribution
    this.distribution = new cloudfront.Distribution(this, 'WebDistribution', {
      comment: `${config.prefix} web app`,
      defaultBehavior: {
        origin: origins.S3BucketOrigin.withOriginAccessControl(
          this.siteBucket as s3.Bucket,
        ),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
        allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD,
      },
      defaultRootObject: 'index.html',
      ...(certificate ? {
        domainNames: [webDomainName],
        certificate,
      } : {}),
      // SPA routing: return index.html for any path that doesn't match a file
      errorResponses: [
        {
          httpStatus: 403,
          responseHttpStatus: 200,
          responsePagePath: '/index.html',
          ttl: cdk.Duration.seconds(0),
        },
        {
          httpStatus: 404,
          responseHttpStatus: 200,
          responsePagePath: '/index.html',
          ttl: cdk.Duration.seconds(0),
        },
      ],
      priceClass: cloudfront.PriceClass.PRICE_CLASS_100,
      enabled: true,
    });

    // Deploy static site to S3 and invalidate CloudFront
    const monorepoRoot = path.join(__dirname, '..', '..', '..');
    new s3deploy.BucketDeployment(this, 'DeploySite', {
      sources: [s3deploy.Source.asset(path.join(monorepoRoot, 'apps', 'web', 'out'))],
      destinationBucket: this.siteBucket as s3.Bucket,
      distribution: this.distribution as cloudfront.Distribution,
      distributionPaths: ['/*'],
    });

    // Tags
    cdk.Tags.of(this).add('Project', 'kairos');
    cdk.Tags.of(this).add('Environment', config.env);

    // Outputs
    new cdk.CfnOutput(this, 'WebUrl', {
      value: `https://${this.distribution.distributionDomainName}`,
      description: 'Web app CloudFront URL',
      exportName: `${config.prefix}-web-url`,
    });

    new cdk.CfnOutput(this, 'WebDistributionId', {
      value: this.distribution.distributionId,
      description: 'Web app CloudFront distribution ID',
      exportName: `${config.prefix}-web-distribution-id`,
    });

    new cdk.CfnOutput(this, 'WebBucketName', {
      value: this.siteBucket.bucketName,
      description: 'Web app S3 bucket name',
      exportName: `${config.prefix}-web-bucket`,
    });

    new cdk.CfnOutput(this, 'WebCustomDomain', {
      value: webDomainName,
      description: 'Web app custom domain (CNAME this to the CloudFront domain)',
      exportName: `${config.prefix}-web-custom-domain`,
    });
  }
}
