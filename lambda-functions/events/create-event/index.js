const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand } = require('@aws-sdk/lib-dynamodb');
const { v4: uuidv4 } = require('uuid');

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

exports.handler = async (event) => {
  try {
    const body = JSON.parse(event.body);
    
    // Validate required fields
    if (!body.title || !body.startDate || !body.endDate) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({
          statusCode: 400,
          message: 'title, startDate, and endDate are required',
          error: 'Bad Request',
          timestamp: new Date().toISOString(),
          path: '/events',
        }),
      };
    }

    const eventItem = {
      id: `evt_${uuidv4()}`,
      title: body.title,
      description: body.description || null,
      startDate: body.startDate,
      endDate: body.endDate,
      location: body.location || null,
      capacity: body.capacity || null,
      registrationFee: body.registrationFee || 0,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const command = new PutCommand({
      TableName: process.env.EVENTS_TABLE,
      Item: eventItem,
    });

    await docClient.send(command);

    return {
      statusCode: 201,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify(eventItem),
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
        path: '/events',
      }),
    };
  }
};