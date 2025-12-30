const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, DeleteCommand, GetCommand } = require('@aws-sdk/lib-dynamodb');

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

exports.handler = async (event) => {
  try {
    const { id } = event.pathParameters;

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

    const deleteCommand = new DeleteCommand({
      TableName: process.env.DEPARTMENTS_TABLE,
      Key: { id },
    });

    await docClient.send(deleteCommand);

    return {
      statusCode: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
      },
      body: '',
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