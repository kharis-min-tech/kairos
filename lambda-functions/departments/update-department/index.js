const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, UpdateCommand, GetCommand } = require('@aws-sdk/lib-dynamodb');

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

exports.handler = async (event) => {
  try {
    const { id } = event.pathParameters;
    const body = JSON.parse(event.body);

    // Check if department exists
    const getCommand = new GetCommand({
      TableName: process.env.DEPARTMENTS_TABLE,
      Key: { id },
    });

    const existingDepartment = await docClient.send(getCommand);

    if (!existingDepartment.Item) {
      return {
        statusCode: 404,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({
          statusCode: 404,
          message: 'Department not found',
          error: 'Not Found',
          timestamp: new Date().toISOString(),
          path: `/departments/${id}`,
        }),
      };
    }

    // Build update expression
    let updateExpression = 'SET updatedAt = :updatedAt';
    let expressionAttributeValues = {
      ':updatedAt': new Date().toISOString(),
    };

    const allowedFields = ['name', 'description', 'leaderId', 'isActive'];

    allowedFields.forEach(field => {
      if (body[field] !== undefined) {
        updateExpression += `, ${field} = :${field}`;
        expressionAttributeValues[`:${field}`] = body[field];
      }
    });

    const updateCommand = new UpdateCommand({
      TableName: process.env.DEPARTMENTS_TABLE,
      Key: { id },
      UpdateExpression: updateExpression,
      ExpressionAttributeValues: expressionAttributeValues,
      ReturnValues: 'ALL_NEW',
    });

    const result = await docClient.send(updateCommand);

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify(result.Attributes),
    };
  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        statusCode: 500,
        message: 'Internal server error',
        error: 'Internal Server Error',
        timestamp: new Date().toISOString(),
        path: `/departments/${event.pathParameters?.id}`,
      }),
    };
  }
};