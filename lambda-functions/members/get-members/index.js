const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, ScanCommand } = require('@aws-sdk/lib-dynamodb');

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

exports.handler = async (event) => {
  try {
    const { queryStringParameters } = event;
    const page = parseInt(queryStringParameters?.page) || 1;
    const limit = parseInt(queryStringParameters?.limit) || 10;
    const search = queryStringParameters?.search;
    const department = queryStringParameters?.department;

    let params = {
      TableName: process.env.MEMBERS_TABLE,
    };

    // Add filter expressions if needed
    if (search || department) {
      let filterExpression = '';
      let expressionAttributeValues = {};
      let expressionAttributeNames = {};

      if (search) {
        filterExpression += 'contains(firstName, :search) OR contains(lastName, :search) OR contains(email, :search)';
        expressionAttributeValues[':search'] = search;
      }

      if (department) {
        if (filterExpression) filterExpression += ' AND ';
        filterExpression += 'departmentId = :department';
        expressionAttributeValues[':department'] = department;
      }

      params.FilterExpression = filterExpression;
      params.ExpressionAttributeValues = expressionAttributeValues;
      if (Object.keys(expressionAttributeNames).length > 0) {
        params.ExpressionAttributeNames = expressionAttributeNames;
      }
    }

    const command = new ScanCommand(params);
    const result = await docClient.send(command);

    // Simple pagination (for production, use LastEvaluatedKey)
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedItems = result.Items.slice(startIndex, endIndex);

    const response = {
      data: paginatedItems,
      pagination: {
        page,
        limit,
        total: result.Items.length,
        totalPages: Math.ceil(result.Items.length / limit),
        hasNext: endIndex < result.Items.length,
        hasPrev: page > 1,
      },
    };

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify(response),
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
        path: '/members',
      }),
    };
  }
};