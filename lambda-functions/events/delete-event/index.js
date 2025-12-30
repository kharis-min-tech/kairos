const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, DeleteCommand, GetCommand } = require('@aws-sdk/lib-dynamodb');

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

exports.handler = async (event) => {
  try {
    const { id } = event.pathParameters;

    // Check if event exists
    const getCommand = new GetCommand({
      TableName: process.env.EVENTS_TABLE,
      Key: { id },
    });

    const existingEvent = await docClient.send(getCommand);

    if (!existingEvent.Item) {
      return {
        statusCode: 404,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({
          statusCode: 404,
          message: 'Event not found',
          error: 'Not Found',
          timestamp: new Date().toISOString(),
          path: `/events/${id}`,
        }),
      };
    }

    const deleteCommand = new DeleteCommand({
      TableName: process.env.EVENTS_TABLE,
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
        path: `/events/${event.pathParameters?.id}`,
      }),
    };
  }
};