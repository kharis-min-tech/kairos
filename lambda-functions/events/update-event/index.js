const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, UpdateCommand, GetCommand } = require('@aws-sdk/lib-dynamodb');

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

exports.handler = async (event) => {
  try {
    const { id } = event.pathParameters;
    const body = JSON.parse(event.body);

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

    // Build update expression
    let updateExpression = 'SET updatedAt = :updatedAt';
    let expressionAttributeValues = {
      ':updatedAt': new Date().toISOString(),
    };

    const allowedFields = [
      'title', 'description', 'startDate', 'endDate', 
      'location', 'capacity', 'registrationFee', 'isActive'
    ];

    allowedFields.forEach(field => {
      if (body[field] !== undefined) {
        updateExpression += `, ${field} = :${field}`;
        expressionAttributeValues[`:${field}`] = body[field];
      }
    });

    const updateCommand = new UpdateCommand({
      TableName: process.env.EVENTS_TABLE,
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
        path: `/events/${event.pathParameters?.id}`,
      }),
    };
  }
};