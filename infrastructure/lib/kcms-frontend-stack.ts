import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import { S3BucketOrigin } from 'aws-cdk-lib/aws-cloudfront-origins';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import { Construct } from 'constructs';

export interface KcmsFrontendStackProps extends cdk.StackProps {
  userPool: cognito.UserPool;
  userPoolClient: cognito.UserPoolClient;
  environment: string;
}

export class KcmsFrontendStack extends cdk.Stack {
  public readonly bucket: s3.Bucket;
  public readonly distribution: cloudfront.Distribution;

  constructor(scope: Construct, id: string, props: KcmsFrontendStackProps) {
    super(scope, id, props);

    // S3 Bucket for hosting
    this.bucket = new s3.Bucket(this, 'KcmsFrontendBucket', {
      bucketName: `kcms-frontend-${cdk.Stack.of(this).account}-${props.environment}`,
      
      // Security
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      enforceSSL: true,
      
      // Lifecycle
      removalPolicy: props.environment === 'prod' 
        ? cdk.RemovalPolicy.RETAIN 
        : cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: props.environment !== 'prod',
      
      // Versioning
      versioned: props.environment === 'prod',
      
      // CORS for API calls
      cors: [
        {
          allowedMethods: [
            s3.HttpMethods.GET,
            s3.HttpMethods.HEAD,
          ],
          allowedOrigins: ['*'],
          allowedHeaders: ['*'],
        },
      ],
    });

    // CloudFront Distribution
    this.distribution = new cloudfront.Distribution(this, 'KcmsDistribution', {
      comment: `KCMS Frontend Distribution (${props.environment})`,
      
      // Default behavior
      defaultBehavior: {
        origin: S3BucketOrigin.withOriginAccessControl(this.bucket),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
        cachedMethods: cloudfront.CachedMethods.CACHE_GET_HEAD_OPTIONS,
        compress: true,
        cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
      },
      
      // Default root object
      defaultRootObject: 'index.html',
      
      // Error responses for SPA
      errorResponses: [
        {
          httpStatus: 403,
          responseHttpStatus: 200,
          responsePagePath: '/index.html',
          ttl: cdk.Duration.minutes(5),
        },
        {
          httpStatus: 404,
          responseHttpStatus: 200,
          responsePagePath: '/index.html',
          ttl: cdk.Duration.minutes(5),
        },
      ],
      
      // Price class
      priceClass: props.environment === 'prod'
        ? cloudfront.PriceClass.PRICE_CLASS_ALL
        : cloudfront.PriceClass.PRICE_CLASS_100,
      
      // Enable IPv6
      enableIpv6: true,
      
      // HTTP version
      httpVersion: cloudfront.HttpVersion.HTTP2_AND_3,
      
      // Minimum protocol version
      minimumProtocolVersion: cloudfront.SecurityPolicyProtocol.TLS_V1_2_2021,
    });

    // Outputs
    new cdk.CfnOutput(this, 'BucketName', {
      value: this.bucket.bucketName,
      description: 'S3 Bucket Name',
      exportName: `KcmsBucketName-${props.environment}`,
    });

    new cdk.CfnOutput(this, 'DistributionId', {
      value: this.distribution.distributionId,
      description: 'CloudFront Distribution ID',
      exportName: `KcmsDistributionId-${props.environment}`,
    });

    new cdk.CfnOutput(this, 'DistributionDomainName', {
      value: this.distribution.distributionDomainName,
      description: 'CloudFront Distribution Domain Name',
      exportName: `KcmsDistributionDomain-${props.environment}`,
    });

    new cdk.CfnOutput(this, 'WebsiteUrl', {
      value: `https://${this.distribution.distributionDomainName}`,
      description: 'Website URL',
      exportName: `KcmsWebsiteUrl-${props.environment}`,
    });

    // Output configuration for frontend app
    new cdk.CfnOutput(this, 'FrontendConfig', {
      value: JSON.stringify({
        userPoolId: props.userPool.userPoolId,
        userPoolClientId: props.userPoolClient.userPoolClientId,
        region: cdk.Stack.of(this).region,
        cognitoDomain: `https://${props.userPool.userPoolId}.auth.${cdk.Stack.of(this).region}.amazoncognito.com`,
      }),
      description: 'Frontend Configuration (JSON)',
    });
  }
}
