# 🚀 AWS Deployment Instructions for Kairos API

## Prerequisites
1. AWS CLI installed and configured
2. Node.js 18+ installed
3. AWS CDK installed: `npm install -g aws-cdk`

## Deployment Steps

### 1. Install Dependencies
```bash
npm install
```

### 2. Bootstrap CDK (First time only)
```bash
npm run bootstrap
```

### 3. Deploy to AWS
```bash
npm run deploy
```

### 4. Get Your API URLs
After deployment, you'll get output like:
```
KairosApiStack.ApiGatewayUrl = https://xxxxxxxxxx.execute-api.us-east-1.amazonaws.com/prod/
```

## 🎯 Your AWS API Endpoints

Replace `https://your-api-gateway-url` with your actual API Gateway URL:

### Health Check & Documentation
- `GET https://your-api-gateway-url/` - API Health Check
- `GET https://your-api-gateway-url/docs` - **🎁 BONUS: Interactive Swagger UI Documentation**
- `GET https://your-api-gateway-url/openapi.json` - OpenAPI JSON specification

### Members API (5 endpoints)
- `GET https://your-api-gateway-url/members` - Get all members
- `POST https://your-api-gateway-url/members` - Create member
- `GET https://your-api-gateway-url/members/{id}` - Get specific member
- `PUT https://your-api-gateway-url/members/{id}` - Update member
- `DELETE https://your-api-gateway-url/members/{id}` - Delete member

### Departments API (5 endpoints)
- `GET https://your-api-gateway-url/departments` - Get all departments
- `POST https://your-api-gateway-url/departments` - Create department
- `GET https://your-api-gateway-url/departments/{id}` - Get specific department
- `PUT https://your-api-gateway-url/departments/{id}` - Update department
- `DELETE https://your-api-gateway-url/departments/{id}` - Delete department

### Events API (5 endpoints)
- `GET https://your-api-gateway-url/events` - Get all events
- `POST https://your-api-gateway-url/events` - Create event
- `GET https://your-api-gateway-url/events/{id}` - Get specific event
- `PUT https://your-api-gateway-url/events/{id}` - Update event
- `DELETE https://your-api-gateway-url/events/{id}` - Delete event

## 🎁 Bonus Features Included

### Advanced Query Parameters
- **Pagination**: `?page=1&limit=10`
- **Search**: `?search=john` (for members)
- **Department Filter**: `?department=dept_123` (for members)
- **Date Filter**: `?startDate=2024-01-01&endDate=2024-12-31` (for events)

### Example API Calls
```bash
# Get members with pagination
curl "https://your-api-gateway-url/members?page=1&limit=5"

# Search members
curl "https://your-api-gateway-url/members?search=john"

# Create a new member
curl -X POST "https://your-api-gateway-url/members" \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "John",
    "lastName": "Doe", 
    "email": "john.doe@example.com"
  }'

# Get events in date range
curl "https://your-api-gateway-url/events?startDate=2024-01-01&endDate=2024-12-31"
```

## 💰 Cost Optimization
- Uses DynamoDB On-Demand pricing (pay per request)
- Lambda functions only charge when invoked
- API Gateway charges per API call
- Estimated cost: $5-20/month for moderate usage

## 🔧 Cleanup
To remove all AWS resources:
```bash
npm run destroy
```

## 📊 AWS Resources Created
- **3 DynamoDB Tables**: Members, Departments, Events
- **15 Lambda Functions**: Complete CRUD operations + Documentation
- **1 API Gateway**: RESTful API endpoints
- **IAM Roles**: Secure permissions for Lambda functions

**Total: 17 API endpoints including interactive Swagger docs! 🎉**