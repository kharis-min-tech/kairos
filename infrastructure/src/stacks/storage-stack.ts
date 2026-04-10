import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import { Construct } from 'constructs';
import { KairosConfig } from '../config';

export interface StorageStackProps extends cdk.StackProps {
  config: KairosConfig;
}

/**
 * S3 and CloudFront Stack for Kairos.
 *
 * Creates:
 * - S3 buckets: member-photos, form-uploads, csv-exports, analytics-exports
 * - S3 bucket policies and CORS configuration
 * - CloudFront distribution with S3 origin (member-photos bucket)
 *
 * Requirements: 32.5
 */
export class StorageStack extends cdk.Stack {
  public readonly memberPhotosBucket: s3.IBucket;
  public readonly formUploadsBucket: s3.IBucket;
  public readonly csvExportsBucket: s3.IBucket;
  public readonly analyticsExportsBucket: s3.IBucket;
  public readonly distribution: cloudfront.IDistribution;

  constructor(scope: Construct, id: string, props: StorageStackProps) {
    super(scope, id, props);

    const { config } = props;

    // ---------------------------------------------------------------
    // S3 Buckets
    // ---------------------------------------------------------------

    // Member photos — served via CloudFront
    this.memberPhotosBucket = new s3.Bucket(this, 'MemberPhotosBucket', {
      bucketName: `${config.prefix}-member-photos`,
      encryption: s3.BucketEncryption.S3_MANAGED,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      versioned: false,
      removalPolicy: config.env === 'prod'
        ? cdk.RemovalPolicy.RETAIN
        : cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: config.env !== 'prod',
      cors: [
        {
          allowedMethods: [s3.HttpMethods.GET, s3.HttpMethods.PUT],
          allowedOrigins: config.webAppDomains,
          allowedHeaders: ['*'],
          maxAge: 3600,
        },
      ],
    });

    // Form uploads
    this.formUploadsBucket = new s3.Bucket(this, 'FormUploadsBucket', {
      bucketName: `${config.prefix}-form-uploads`,
      encryption: s3.BucketEncryption.S3_MANAGED,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      versioned: false,
      removalPolicy: config.env === 'prod'
        ? cdk.RemovalPolicy.RETAIN
        : cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: config.env !== 'prod',
      cors: [
        {
          allowedMethods: [s3.HttpMethods.GET, s3.HttpMethods.PUT],
          allowedOrigins: config.webAppDomains,
          allowedHeaders: ['*'],
          maxAge: 3600,
        },
      ],
    });

    // CSV exports
    this.csvExportsBucket = new s3.Bucket(this, 'CsvExportsBucket', {
      bucketName: `${config.prefix}-csv-exports`,
      encryption: s3.BucketEncryption.S3_MANAGED,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      versioned: false,
      lifecycleRules: [
        {
          expiration: cdk.Duration.days(30), // Auto-delete exports after 30 days
        },
      ],
      removalPolicy: config.env === 'prod'
        ? cdk.RemovalPolicy.RETAIN
        : cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: config.env !== 'prod',
    });

    // Analytics exports (Parquet format for Power BI)
    // Requirement 30.5: Retain last 30 days of exports in S3
    this.analyticsExportsBucket = new s3.Bucket(this, 'AnalyticsExportsBucket', {
      bucketName: `${config.prefix}-analytics-exports`,
      encryption: s3.BucketEncryption.S3_MANAGED,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      versioned: false,
      lifecycleRules: [
        {
          expiration: cdk.Duration.days(30), // Auto-delete exports older than 30 days (Req 30.5)
        },
      ],
      removalPolicy: config.env === 'prod'
        ? cdk.RemovalPolicy.RETAIN
        : cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: config.env !== 'prod',
    });

    // ---------------------------------------------------------------
    // CloudFront Distribution — serves member photos from S3
    // ---------------------------------------------------------------
    this.distribution = new cloudfront.Distribution(this, 'Distribution', {
      comment: `${config.prefix} CDN for member photos and static assets`,
      defaultBehavior: {
        origin: origins.S3BucketOrigin.withOriginAccessControl(
          this.memberPhotosBucket as s3.Bucket,
        ),
        viewerProtocolPolicy:
          cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
        allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD,
      },
      priceClass: cloudfront.PriceClass.PRICE_CLASS_100, // EU + NA only — cost-effective
      enabled: true,
    });

    // ---------------------------------------------------------------
    // Tags
    // ---------------------------------------------------------------
    cdk.Tags.of(this).add('Project', 'kairos');
    cdk.Tags.of(this).add('Environment', config.env);

    // ---------------------------------------------------------------
    // Outputs
    // ---------------------------------------------------------------
    new cdk.CfnOutput(this, 'MemberPhotosBucketName', {
      value: this.memberPhotosBucket.bucketName,
      description: 'Member photos S3 bucket name',
      exportName: `${config.prefix}-member-photos-bucket`,
    });

    new cdk.CfnOutput(this, 'FormUploadsBucketName', {
      value: this.formUploadsBucket.bucketName,
      description: 'Form uploads S3 bucket name',
      exportName: `${config.prefix}-form-uploads-bucket`,
    });

    new cdk.CfnOutput(this, 'CsvExportsBucketName', {
      value: this.csvExportsBucket.bucketName,
      description: 'CSV exports S3 bucket name',
      exportName: `${config.prefix}-csv-exports-bucket`,
    });

    new cdk.CfnOutput(this, 'AnalyticsExportsBucketName', {
      value: this.analyticsExportsBucket.bucketName,
      description: 'Analytics exports S3 bucket name',
      exportName: `${config.prefix}-analytics-exports-bucket`,
    });

    new cdk.CfnOutput(this, 'CloudFrontDomainName', {
      value: this.distribution.distributionDomainName,
      description: 'CloudFront distribution domain name',
      exportName: `${config.prefix}-cloudfront-domain`,
    });

    new cdk.CfnOutput(this, 'CloudFrontDistributionId', {
      value: this.distribution.distributionId,
      description: 'CloudFront distribution ID',
      exportName: `${config.prefix}-cloudfront-distribution-id`,
    });
  }
}
