import * as cdk from 'aws-cdk-lib';
import * as apigatewayv2 from 'aws-cdk-lib/aws-apigatewayv2';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as nodejs from 'aws-cdk-lib/aws-lambda-nodejs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import {
  HttpLambdaAuthorizer,
  HttpLambdaResponseType,
} from 'aws-cdk-lib/aws-apigatewayv2-authorizers';
import {
  HttpLambdaIntegration,
} from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import { Construct } from 'constructs';
import * as path from 'path';
import { KairosConfig } from '../config';

export interface ApiStackProps extends cdk.StackProps {
  config: KairosConfig;
  vpc: ec2.IVpc;
  lambdaSecurityGroup: ec2.ISecurityGroup;
  userPool: cognito.IUserPool;
  userPoolClient: cognito.IUserPoolClient;
  databaseSecret: secretsmanager.ISecret;
  memberPhotosBucket: s3.IBucket;
  csvExportsBucket: s3.IBucket;
  formUploadsBucket: s3.IBucket;
}

/**
 * API Stack — HTTP API, Custom Authorizer, and all Lambda route integrations.
 *
 * All routes live in the same stack as the HTTP API to avoid cross-stack
 * cyclic dependency issues with API Gateway authorizer references.
 *
 * Requirements: 1.5, 36.9
 */
export class ApiStack extends cdk.Stack {
  public readonly httpApi: apigatewayv2.HttpApi;
  public readonly authorizer: HttpLambdaAuthorizer;
  public readonly authorizerFunction: lambda.IFunction;

  constructor(scope: Construct, id: string, props: ApiStackProps) {
    super(scope, id, props);

    const {
      config, vpc, lambdaSecurityGroup, userPool, userPoolClient,
      databaseSecret, memberPhotosBucket, csvExportsBucket, formUploadsBucket,
    } = props;

    // ---------------------------------------------------------------
    // HTTP API
    // ---------------------------------------------------------------
    this.httpApi = new apigatewayv2.HttpApi(this, 'HttpApi', {
      apiName: `${config.prefix}-api`,
      description: `Kairos ${config.env} HTTP API`,
      corsPreflight: {
        allowOrigins: config.webAppDomains,
        allowMethods: [
          apigatewayv2.CorsHttpMethod.GET,
          apigatewayv2.CorsHttpMethod.POST,
          apigatewayv2.CorsHttpMethod.PUT,
          apigatewayv2.CorsHttpMethod.DELETE,
          apigatewayv2.CorsHttpMethod.OPTIONS,
        ],
        allowHeaders: ['Content-Type', 'Authorization', 'X-Amz-Date', 'X-Api-Key', 'X-Amz-Security-Token'],
        maxAge: cdk.Duration.hours(1),
        allowCredentials: true,
      },
      disableExecuteApiEndpoint: false,
    });

    const defaultStage = this.httpApi.defaultStage?.node.defaultChild as apigatewayv2.CfnStage;
    if (defaultStage) {
      defaultStage.defaultRouteSettings = {
        throttlingRateLimit: config.apiThrottleRateLimit,
        throttlingBurstLimit: config.apiThrottleBurstLimit,
      };
    }

    // ---------------------------------------------------------------
    // Custom Domain for API Gateway
    // ---------------------------------------------------------------
    const apiDomainName = `${config.apiSubdomain}.${config.domain}`;
    if (config.apiCertArn) {
      const apiCert = acm.Certificate.fromCertificateArn(this, 'ApiCert', config.apiCertArn);

      const customDomain = new apigatewayv2.DomainName(this, 'ApiDomainName', {
        domainName: apiDomainName,
        certificate: apiCert,
      });

      new apigatewayv2.ApiMapping(this, 'ApiMapping', {
        api: this.httpApi,
        domainName: customDomain,
      });

      new cdk.CfnOutput(this, 'ApiCustomDomainTarget', {
        value: customDomain.regionalDomainName,
        description: 'API Gateway custom domain target (CNAME this in Cloudflare)',
        exportName: `${config.prefix}-api-custom-domain-target`,
      });

      new cdk.CfnOutput(this, 'ApiCustomDomain', {
        value: apiDomainName,
        description: 'API custom domain name',
        exportName: `${config.prefix}-api-custom-domain`,
      });
    }

    // ---------------------------------------------------------------
    // Custom Authorizer Lambda
    // ---------------------------------------------------------------
    const monorepoRoot = path.join(__dirname, '..', '..', '..');
    const apiSrc = path.join(monorepoRoot, 'apps', 'api', 'src');

    const sharedBundling: nodejs.BundlingOptions = {
      minify: true,
      sourceMap: true,
      target: 'es2022',
      externalModules: ['@aws-sdk/*'],
      esbuildArgs: {
        '--alias:@kairos/utils': './packages/utils/src/index.ts',
        '--alias:@kairos/database': './packages/database/src/index.ts',
      },
    };

    const authorizerFn = new nodejs.NodejsFunction(this, 'AuthorizerFn', {
      functionName: `${config.prefix}-authorizer`,
      description: 'Custom authorizer: JWT validation (no VPC — needs internet for JWKS)',
      runtime: lambda.Runtime.NODEJS_20_X,
      entry: path.join(apiSrc, 'auth', 'authorizer.ts'),
      handler: 'handler',
      memorySize: 512,
      timeout: cdk.Duration.seconds(10),
      architecture: lambda.Architecture.ARM_64,
      tracing: lambda.Tracing.ACTIVE,
      // NOT in VPC — needs internet access to fetch Cognito JWKS keys
      environment: {
        COGNITO_USER_POOL_ID: userPool.userPoolId,
        COGNITO_CLIENT_ID: userPoolClient.userPoolClientId,
        NODE_OPTIONS: '--enable-source-maps',
      },
      projectRoot: monorepoRoot,
      depsLockFilePath: path.join(monorepoRoot, 'package-lock.json'),
      bundling: sharedBundling,
    });
    this.authorizerFunction = authorizerFn;

    this.authorizer = new HttpLambdaAuthorizer('KairosAuthorizer', authorizerFn, {
      authorizerName: `${config.prefix}-authorizer`,
      responseTypes: [HttpLambdaResponseType.SIMPLE],
      identitySource: ['$request.header.Authorization'],
      resultsCacheTtl: cdk.Duration.seconds(config.authorizerCacheTtlSeconds),
    });

    // ---------------------------------------------------------------
    // Route helper
    // ---------------------------------------------------------------
    const sharedEnv: Record<string, string> = {
      DATABASE_SECRET_ARN: databaseSecret.secretArn,
      NODE_OPTIONS: '--enable-source-maps',
    };

    const route = (
      lid: string, entry: string,
      method: apigatewayv2.HttpMethod, routePath: string,
      opts?: {
        env?: Record<string, string>;
        grants?: (fn: lambda.IFunction) => void;
        skipAuth?: boolean;
        memory?: number;
        timeout?: number;
      },
    ) => {
      const fn = new nodejs.NodejsFunction(this, lid, {
        functionName: `${config.prefix}-${lid.replace(/([A-Z])/g, '-$1').toLowerCase().replace(/^-/, '')}`,
        runtime: lambda.Runtime.NODEJS_20_X,
        entry: path.join(apiSrc, entry),
        handler: 'handler',
        memorySize: opts?.memory ?? 512,
        timeout: cdk.Duration.seconds(opts?.timeout ?? 30),
        architecture: lambda.Architecture.ARM_64,
        tracing: lambda.Tracing.ACTIVE,
        vpc,
        vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_ISOLATED },
        securityGroups: [lambdaSecurityGroup],
        environment: { ...sharedEnv, ...opts?.env },
        projectRoot: monorepoRoot,
        depsLockFilePath: path.join(monorepoRoot, 'package-lock.json'),
        bundling: sharedBundling,
      });
      databaseSecret.grantRead(fn);
      if (opts?.grants) opts.grants(fn);

      this.httpApi.addRoutes({
        path: routePath,
        methods: [method],
        integration: new HttpLambdaIntegration(`${lid}Int`, fn),
        ...(opts?.skipAuth ? {} : { authorizer: this.authorizer }),
      });
      return fn;
    };

    const GET = apigatewayv2.HttpMethod.GET;
    const POST = apigatewayv2.HttpMethod.POST;
    const PUT = apigatewayv2.HttpMethod.PUT;
    const DELETE = apigatewayv2.HttpMethod.DELETE;
    const s3Write = (bucket: s3.IBucket) => (fn: lambda.IFunction) => bucket.grantWrite(fn);
    const s3RW = (bucket: s3.IBucket) => (fn: lambda.IFunction) => bucket.grantReadWrite(fn);

    // ================= AUTH (public) =================
    const registerFn = route('AuthRegister', 'auth/auth-register.ts', POST, '/v1/auth/register', {
      env: { COGNITO_USER_POOL_ID: userPool.userPoolId },
      skipAuth: true,
    });
    registerFn.addToRolePolicy(new iam.PolicyStatement({
      actions: ['cognito-idp:AdminCreateUser', 'cognito-idp:AdminSetUserPassword'],
      resources: [userPool.userPoolArn],
    }));

    // ================= MEMBERS =================
    route('MembersCreate', 'members/members-create.ts', POST, '/v1/members',
      { env: { MEMBER_PHOTOS_BUCKET: memberPhotosBucket.bucketName }, grants: s3Write(memberPhotosBucket) });
    route('MembersList', 'members/members-list.ts', GET, '/v1/members');
    route('MembersGet', 'members/members-get.ts', GET, '/v1/members/{memberId}');
    route('MembersUpdate', 'members/members-update.ts', PUT, '/v1/members/{memberId}',
      { env: { MEMBER_PHOTOS_BUCKET: memberPhotosBucket.bucketName }, grants: s3RW(memberPhotosBucket) });
    route('MembersDelete', 'members/members-delete.ts', DELETE, '/v1/members/{memberId}');
    route('MembersApprove', 'members/members-approve.ts', POST, '/v1/members/{memberId}/approve');
    route('MembersImport', 'members/members-import.ts', POST, '/v1/members/import');
    route('MembersExport', 'members/members-export.ts', GET, '/v1/members/export',
      { env: { CSV_EXPORTS_BUCKET: csvExportsBucket.bucketName }, grants: s3Write(csvExportsBucket) });
    route('MembersPhotoUploadUrl', 'members/members-photo-upload-url.ts', POST, '/v1/members/{memberId}/photo-upload-url',
      { env: { MEMBER_PHOTOS_BUCKET: memberPhotosBucket.bucketName }, grants: s3Write(memberPhotosBucket) });

    // ================= BRANCHES =================
    route('BranchesCreate', 'branches/branches-create.ts', POST, '/v1/branches');
    route('BranchesList', 'branches/branches-list.ts', GET, '/v1/branches', { skipAuth: true });
    route('BranchesGet', 'branches/branches-get.ts', GET, '/v1/branches/{branchId}');
    route('BranchesUpdate', 'branches/branches-update.ts', PUT, '/v1/branches/{branchId}');
    route('BranchesDelete', 'branches/branches-delete.ts', DELETE, '/v1/branches/{branchId}');
    route('BranchAssignPastor', 'branches/branches-assign-pastor.ts', POST, '/v1/branches/{branchId}/pastor');
    route('BranchAssignElder', 'branches/branches-assign-elder.ts', POST, '/v1/branches/{branchId}/elder');

    // ================= DEPARTMENTS =================
    route('DeptCreate', 'departments/departments-create.ts', POST, '/v1/departments');
    route('DeptList', 'departments/departments-list.ts', GET, '/v1/departments');
    route('DeptAssignMember', 'departments/departments-assign-member.ts', POST, '/v1/departments/{departmentId}/members');
    route('DeptApproveReq', 'departments/departments-approve-request.ts', POST, '/v1/departments/{departmentId}/approve');
    route('DeptAddFollowup', 'departments/departments-add-followup.ts', POST, '/v1/departments/{departmentId}/followups');
    route('DeptGetAlerts', 'departments/departments-get-alerts.ts', GET, '/v1/departments/{departmentId}/alerts');

    // ================= FELLOWSHIPS =================
    route('FellowCreate', 'fellowships/fellowships-create.ts', POST, '/v1/fellowships');
    route('FellowList', 'fellowships/fellowships-list.ts', GET, '/v1/fellowships');
    route('FellowGet', 'fellowships/fellowships-get.ts', GET, '/v1/fellowships/{fellowshipId}');
    route('FellowAddMember', 'fellowships/fellowships-add-member.ts', POST, '/v1/fellowships/{fellowshipId}/members');
    route('FellowSendMsg', 'fellowships/fellowships-send-message.ts', POST, '/v1/fellowships/{fellowshipId}/messages');

    // ================= ATTENDANCE =================
    route('AttRecordSvc', 'attendance/attendance-record-service.ts', POST, '/v1/attendance/services');
    route('AttListSvc', 'attendance/attendance-list-service.ts', GET, '/v1/attendance/services');
    route('AttRecordFellow', 'attendance/attendance-record-fellowship.ts', POST, '/v1/attendance/fellowships');
    route('AttListFellow', 'attendance/attendance-list-fellowship.ts', GET, '/v1/attendance/fellowships');
    route('AttGetTrends', 'attendance/attendance-get-trends.ts', GET, '/v1/attendance/trends');
    route('AttGetMissing', 'attendance/attendance-get-missing-members.ts', GET, '/v1/attendance/missing-members');
    route('AttExport', 'attendance/attendance-export.ts', GET, '/v1/attendance/export',
      { env: { CSV_EXPORTS_BUCKET: csvExportsBucket.bucketName }, grants: s3Write(csvExportsBucket) });

    // ================= OUTREACH & SOULS =================
    route('OutreachCreate', 'outreach/outreach-create-program.ts', POST, '/v1/outreach/programs');
    route('OutreachList', 'outreach/outreach-list-programs.ts', GET, '/v1/outreach/programs');
    route('OutreachGetProgram', 'outreach/outreach-get-program.ts', GET, '/v1/outreach/programs/{outreachId}');
    route('OutreachComplete', 'outreach/outreach-complete-program.ts', PUT, '/v1/outreach/programs/{outreachId}/complete');
    route('OutreachRegWorker', 'outreach/outreach-register-worker.ts', POST, '/v1/outreach/programs/{outreachId}/workers');
    route('OutreachOverride', 'outreach/outreach-override-branch.ts', POST, '/v1/outreach/override-branch');
    route('SoulsCapture', 'outreach/souls-capture.ts', POST, '/v1/souls');
    route('SoulsList', 'outreach/souls-list.ts', GET, '/v1/souls');
    route('SoulsFollowUpTracker', 'outreach/souls-get-follow-up-tracker.ts', GET, '/v1/souls/follow-up-tracker');
    route('SoulsGet', 'outreach/souls-get.ts', GET, '/v1/souls/{soulId}');
    route('SoulsLogFollowup', 'outreach/souls-log-followup.ts', POST, '/v1/souls/{soulId}/followups');
    route('SoulsUpdateStatus', 'outreach/souls-update-status.ts', PUT, '/v1/souls/{soulId}/status');
    route('SoulsReassign', 'outreach/souls-reassign.ts', PUT, '/v1/souls/{soulId}/reassign');
    route('SoulsGetAlerts', 'outreach/souls-get-alerts.ts', GET, '/v1/souls/alerts');
    route('SoulsConvFunnel', 'outreach/souls-get-conversion-funnel.ts', GET, '/v1/souls/conversion-funnel');

    // ================= DONATIONS =================
    route('DonationsOnline', 'donations/donations-create-online.ts', POST, '/v1/donations/online',
      { env: { STRIPE_SECRET_KEY_PARAM: `/${config.prefix}/stripe/secret-key` } });
    route('DonationsManual', 'donations/donations-create-manual.ts', POST, '/v1/donations/manual');
    route('DonationsList', 'donations/donations-list.ts', GET, '/v1/donations');
    route('DonationsReports', 'donations/donations-get-reports.ts', GET, '/v1/donations/reports');
    route('DonationsMemberSum', 'donations/donations-get-member-summary.ts', GET, '/v1/donations/member-summary');
    route('DonationsExport', 'donations/donations-export.ts', GET, '/v1/donations/export',
      { env: { CSV_EXPORTS_BUCKET: csvExportsBucket.bucketName }, grants: s3Write(csvExportsBucket) });
    // Stripe webhook — NO authorizer (Stripe verifies its own signature)
    route('DonationsWebhook', 'donations/donations-webhook.ts', POST, '/v1/donations/webhook',
      { env: { STRIPE_WEBHOOK_SECRET_ARN: `/${config.prefix}/stripe/webhook-secret` }, skipAuth: true });

    // ================= FORMS =================
    route('FormsCreate', 'forms/forms-create.ts', POST, '/v1/forms');
    route('FormsList', 'forms/forms-list.ts', GET, '/v1/forms');
    route('FormsGet', 'forms/forms-get.ts', GET, '/v1/forms/{formId}');
    route('FormsSubmit', 'forms/forms-submit.ts', POST, '/v1/forms/{formId}/submit');
    route('FormsListSubs', 'forms/forms-list-submissions.ts', GET, '/v1/forms/{formId}/submissions');
    route('FormsExportSubs', 'forms/forms-export-submissions.ts', GET, '/v1/forms/{formId}/submissions/export',
      { env: { CSV_EXPORTS_BUCKET: csvExportsBucket.bucketName }, grants: s3Write(csvExportsBucket) });
    route('FormsSaveTemplate', 'forms/forms-save-template.ts', POST, '/v1/forms/templates');
    route('FormsFromTemplate', 'forms/forms-create-from-template.ts', POST, '/v1/forms/from-template');
    route('FormsPrebuilt', 'forms/forms-handle-prebuilt.ts', POST, '/v1/forms/prebuilt/{formType}/submit');

    // ================= NOTIFICATIONS =================
    route('NotifCreate', 'notifications/notifications-create.ts', POST, '/v1/notifications');
    route('NotifList', 'notifications/notifications-list.ts', GET, '/v1/notifications');
    route('NotifMarkRead', 'notifications/notifications-mark-read.ts', PUT, '/v1/notifications/mark-read');
    route('NotifUnreadCount', 'notifications/notifications-get-unread-count.ts', GET, '/v1/notifications/unread-count');
    route('NotifBroadcast', 'notifications/notifications-send-broadcast.ts', POST, '/v1/notifications/broadcast');

    // ================= REPORTS =================
    route('RptAdminDash', 'reports/reports-get-admin-dashboard.ts', GET, '/v1/reports/dashboard/admin');
    route('RptPastorDash', 'reports/reports-get-pastor-dashboard.ts', GET, '/v1/reports/dashboard/pastor');
    route('RptLeaderDash', 'reports/reports-get-leader-dashboard.ts', GET, '/v1/reports/dashboard/leader');
    route('RptAttTrends', 'reports/reports-get-attendance-trends.ts', GET, '/v1/reports/attendance-trends');
    route('RptDonationSum', 'reports/reports-get-donation-summary.ts', GET, '/v1/reports/donation-summary');
    route('RptSoulFunnel', 'reports/reports-get-soul-funnel.ts', GET, '/v1/reports/soul-funnel');
    route('RptExportCsv', 'reports/reports-export-csv.ts', POST, '/v1/reports/export',
      { env: { CSV_EXPORTS_BUCKET: csvExportsBucket.bucketName }, grants: s3Write(csvExportsBucket) });

    // ================= ADMIN (invoke-only, no API routes) =================
    const migrateFn = new nodejs.NodejsFunction(this, 'DbMigrate', {
      functionName: `${config.prefix}-db-migrate`,
      description: 'Runs Drizzle SQL migration against Aurora',
      runtime: lambda.Runtime.NODEJS_20_X,
      entry: path.join(apiSrc, 'admin', 'db-migrate.ts'),
      handler: 'handler',
      memorySize: 512,
      timeout: cdk.Duration.minutes(5),
      architecture: lambda.Architecture.ARM_64,
      tracing: lambda.Tracing.ACTIVE,
      vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_ISOLATED },
      securityGroups: [lambdaSecurityGroup],
      environment: {
        DATABASE_SECRET_ARN: databaseSecret.secretArn,
        NODE_OPTIONS: '--enable-source-maps',
      },
      projectRoot: monorepoRoot,
      depsLockFilePath: path.join(monorepoRoot, 'package-lock.json'),
      bundling: {
        ...sharedBundling,
        commandHooks: {
          beforeBundling: () => [],
          afterBundling: (inputDir: string, outputDir: string) => [
            `mkdir -p ${outputDir}/migrations`,
            `cp ${inputDir}/packages/database/drizzle/*.sql ${outputDir}/migrations/`,
          ],
          beforeInstall: () => [],
        },
      },
    });
    databaseSecret.grantRead(migrateFn);

    const seedFn = new nodejs.NodejsFunction(this, 'DbSeed', {
      functionName: `${config.prefix}-db-seed`,
      description: 'Seeds Aurora with demo data',
      runtime: lambda.Runtime.NODEJS_20_X,
      entry: path.join(apiSrc, 'admin', 'db-seed.ts'),
      handler: 'handler',
      memorySize: 512,
      timeout: cdk.Duration.seconds(60),
      architecture: lambda.Architecture.ARM_64,
      tracing: lambda.Tracing.ACTIVE,
      vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_ISOLATED },
      securityGroups: [lambdaSecurityGroup],
      environment: {
        DATABASE_SECRET_ARN: databaseSecret.secretArn,
        NODE_OPTIONS: '--enable-source-maps',
      },
      projectRoot: monorepoRoot,
      depsLockFilePath: path.join(monorepoRoot, 'package-lock.json'),
      bundling: sharedBundling,
    });
    databaseSecret.grantRead(seedFn);

    // ---------------------------------------------------------------
    // Tags & Outputs
    // ---------------------------------------------------------------
    cdk.Tags.of(this).add('Project', 'kairos');
    cdk.Tags.of(this).add('Environment', config.env);

    new cdk.CfnOutput(this, 'HttpApiId', {
      value: this.httpApi.httpApiId,
      description: 'HTTP API ID',
      exportName: `${config.prefix}-http-api-id`,
    });
    new cdk.CfnOutput(this, 'HttpApiUrl', {
      value: this.httpApi.apiEndpoint,
      description: 'HTTP API endpoint URL',
      exportName: `${config.prefix}-http-api-url`,
    });
    new cdk.CfnOutput(this, 'AuthorizerFunctionArn', {
      value: authorizerFn.functionArn,
      description: 'Authorizer Lambda function ARN',
      exportName: `${config.prefix}-authorizer-fn-arn`,
    });
  }
}
