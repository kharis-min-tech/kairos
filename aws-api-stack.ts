import * as cdk from 'aws-cdk-lib';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';

export class KairosApiStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // DynamoDB Tables
    const membersTable = new dynamodb.Table(this, 'MembersTable', {
      tableName: 'kairos-members',
      partitionKey: { name: 'id', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const departmentsTable = new dynamodb.Table(this, 'DepartmentsTable', {
      tableName: 'kairos-departments',
      partitionKey: { name: 'id', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const eventsTable = new dynamodb.Table(this, 'EventsTable', {
      tableName: 'kairos-events',
      partitionKey: { name: 'id', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // Lambda Layer for shared dependencies
    const sharedLayer = new lambda.LayerVersion(this, 'SharedLayer', {
      code: lambda.Code.fromAsset('lambda-layers/shared'),
      compatibleRuntimes: [lambda.Runtime.NODEJS_18_X],
      description: 'Shared utilities and AWS SDK',
    });

    // API Gateway
    const api = new apigateway.RestApi(this, 'KairosApi', {
      restApiName: 'Kairos Church Management API',
      description: 'REST API for Kairos Church Management System',
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: ['Content-Type', 'X-Amz-Date', 'Authorization', 'X-Api-Key'],
      },
    });

    // Health Check Lambda
    const healthCheckLambda = new lambda.Function(this, 'HealthCheckFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromInline(`
        exports.handler = async (event) => {
          return {
            statusCode: 200,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
            },
            body: JSON.stringify({
              message: 'Welcome to Kairos Church Management System API',
              version: '1.0.0',
              status: 'healthy',
              timestamp: new Date().toISOString()
            })
          };
        };
      `),
      layers: [sharedLayer],
    });

    // Members Lambda Functions
    const getMembersLambda = new lambda.Function(this, 'GetMembersFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('lambda-functions/members/get-members'),
      environment: {
        MEMBERS_TABLE: membersTable.tableName,
      },
      layers: [sharedLayer],
    });

    const createMemberLambda = new lambda.Function(this, 'CreateMemberFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('lambda-functions/members/create-member'),
      environment: {
        MEMBERS_TABLE: membersTable.tableName,
      },
      layers: [sharedLayer],
    });

    const getMemberLambda = new lambda.Function(this, 'GetMemberFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('lambda-functions/members/get-member'),
      environment: {
        MEMBERS_TABLE: membersTable.tableName,
      },
      layers: [sharedLayer],
    });

    const updateMemberLambda = new lambda.Function(this, 'UpdateMemberFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('lambda-functions/members/update-member'),
      environment: {
        MEMBERS_TABLE: membersTable.tableName,
      },
      layers: [sharedLayer],
    });

    const deleteMemberLambda = new lambda.Function(this, 'DeleteMemberFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('lambda-functions/members/delete-member'),
      environment: {
        MEMBERS_TABLE: membersTable.tableName,
      },
      layers: [sharedLayer],
    });

    // Departments Lambda Functions
    const getDepartmentsLambda = new lambda.Function(this, 'GetDepartmentsFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('lambda-functions/departments/get-departments'),
      environment: {
        DEPARTMENTS_TABLE: departmentsTable.tableName,
      },
      layers: [sharedLayer],
    });

    const createDepartmentLambda = new lambda.Function(this, 'CreateDepartmentFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('lambda-functions/departments/create-department'),
      environment: {
        DEPARTMENTS_TABLE: departmentsTable.tableName,
      },
      layers: [sharedLayer],
    });

    const getDepartmentLambda = new lambda.Function(this, 'GetDepartmentFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('lambda-functions/departments/get-department'),
      environment: {
        DEPARTMENTS_TABLE: departmentsTable.tableName,
      },
      layers: [sharedLayer],
    });

    const updateDepartmentLambda = new lambda.Function(this, 'UpdateDepartmentFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('lambda-functions/departments/update-department'),
      environment: {
        DEPARTMENTS_TABLE: departmentsTable.tableName,
      },
      layers: [sharedLayer],
    });

    const deleteDepartmentLambda = new lambda.Function(this, 'DeleteDepartmentFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('lambda-functions/departments/delete-department'),
      environment: {
        DEPARTMENTS_TABLE: departmentsTable.tableName,
      },
      layers: [sharedLayer],
    });

    // Events Lambda Functions
    const getEventsLambda = new lambda.Function(this, 'GetEventsFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('lambda-functions/events/get-events'),
      environment: {
        EVENTS_TABLE: eventsTable.tableName,
      },
      layers: [sharedLayer],
    });

    const createEventLambda = new lambda.Function(this, 'CreateEventFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('lambda-functions/events/create-event'),
      environment: {
        EVENTS_TABLE: eventsTable.tableName,
      },
      layers: [sharedLayer],
    });

    const getEventLambda = new lambda.Function(this, 'GetEventFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('lambda-functions/events/get-event'),
      environment: {
        EVENTS_TABLE: eventsTable.tableName,
      },
      layers: [sharedLayer],
    });

    const updateEventLambda = new lambda.Function(this, 'UpdateEventFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('lambda-functions/events/update-event'),
      environment: {
        EVENTS_TABLE: eventsTable.tableName,
      },
      layers: [sharedLayer],
    });

    const deleteEventLambda = new lambda.Function(this, 'DeleteEventFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('lambda-functions/events/delete-event'),
      environment: {
        EVENTS_TABLE: eventsTable.tableName,
      },
      layers: [sharedLayer],
    });

    // Grant DynamoDB permissions
    membersTable.grantReadWriteData(getMembersLambda);
    membersTable.grantReadWriteData(createMemberLambda);
    membersTable.grantReadWriteData(getMemberLambda);
    membersTable.grantReadWriteData(updateMemberLambda);
    membersTable.grantReadWriteData(deleteMemberLambda);

    departmentsTable.grantReadWriteData(getDepartmentsLambda);
    departmentsTable.grantReadWriteData(createDepartmentLambda);
    departmentsTable.grantReadWriteData(getDepartmentLambda);
    departmentsTable.grantReadWriteData(updateDepartmentLambda);
    departmentsTable.grantReadWriteData(deleteDepartmentLambda);

    eventsTable.grantReadWriteData(getEventsLambda);
    eventsTable.grantReadWriteData(createEventLambda);
    eventsTable.grantReadWriteData(getEventLambda);
    eventsTable.grantReadWriteData(updateEventLambda);
    eventsTable.grantReadWriteData(deleteEventLambda);

    // API Gateway Routes
    
    // Health Check
    api.root.addMethod('GET', new apigateway.LambdaIntegration(healthCheckLambda));

    // Members Routes
    const membersResource = api.root.addResource('members');
    membersResource.addMethod('GET', new apigateway.LambdaIntegration(getMembersLambda));
    membersResource.addMethod('POST', new apigateway.LambdaIntegration(createMemberLambda));

    const memberResource = membersResource.addResource('{id}');
    memberResource.addMethod('GET', new apigateway.LambdaIntegration(getMemberLambda));
    memberResource.addMethod('PUT', new apigateway.LambdaIntegration(updateMemberLambda));
    memberResource.addMethod('DELETE', new apigateway.LambdaIntegration(deleteMemberLambda));

    // Departments Routes
    const departmentsResource = api.root.addResource('departments');
    departmentsResource.addMethod('GET', new apigateway.LambdaIntegration(getDepartmentsLambda));
    departmentsResource.addMethod('POST', new apigateway.LambdaIntegration(createDepartmentLambda));

    const departmentResource = departmentsResource.addResource('{id}');
    departmentResource.addMethod('GET', new apigateway.LambdaIntegration(getDepartmentLambda));
    departmentResource.addMethod('PUT', new apigateway.LambdaIntegration(updateDepartmentLambda));
    departmentResource.addMethod('DELETE', new apigateway.LambdaIntegration(deleteDepartmentLambda));

    // Events Routes
    const eventsResource = api.root.addResource('events');
    eventsResource.addMethod('GET', new apigateway.LambdaIntegration(getEventsLambda));
    eventsResource.addMethod('POST', new apigateway.LambdaIntegration(createEventLambda));

    const eventResource = eventsResource.addResource('{id}');
    eventResource.addMethod('GET', new apigateway.LambdaIntegration(getEventLambda));
    eventResource.addMethod('PUT', new apigateway.LambdaIntegration(updateEventLambda));
    eventResource.addMethod('DELETE', new apigateway.LambdaIntegration(deleteEventLambda));

    // Outputs
    new cdk.CfnOutput(this, 'ApiGatewayUrl', {
      value: api.url,
      description: 'API Gateway URL',
    });

    new cdk.CfnOutput(this, 'MembersTableName', {
      value: membersTable.tableName,
      description: 'Members DynamoDB Table Name',
    });

    new cdk.CfnOutput(this, 'DepartmentsTableName', {
      value: departmentsTable.tableName,
      description: 'Departments DynamoDB Table Name',
    });

    new cdk.CfnOutput(this, 'EventsTableName', {
      value: eventsTable.tableName,
      description: 'Events DynamoDB Table Name',
    });
  }
}