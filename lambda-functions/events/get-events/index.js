const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, ScanCommand } = require('@aws-sdk/lib-dynamodb');

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

exports.handler = async (event) => {
  try {
    const { queryStringParameters } = event;
    const startDate = queryStringParameters?.startDate;
    const endDate = queryStringParameters?.endDate;

    let params = {
      TableName: process.env.EVENTS_TABLE,
    };

    // Add filter expressions for date filtering
    if (startDate || endDate) {
      let filterExpression = '';
      let expressionAttributeValues = {};

      if (startDate && endDate) {
        filterExpression = 'startDate >= :startDate AND endDate <= :endDate';
        expressionAttributeValues[':startDate'] = startDate;
        expressionAttributeValues[':endDate'] = endDate;
      } else if (startDate) {
        filterExpression = 'startDate >= :startDate';
        expressionAttributeValues[':startDate'] = startDate;
      } else if (endDate) {
        filterExpression = 'endDate <= :endDate';
        expressionAttributeValues[':endDate'] = endDate;
      }

      params.FilterExpression = filterExpression;
      params.ExpressionAttributeValues = expressionAttributeValues;
    }

    const command = new ScanCommand(params);
    const result = await docClient.send(command);

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify(result.Items),
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