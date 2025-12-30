const fs = require('fs');
const path = require('path');

// Read the OpenAPI spec from the repository
const openApiSpec = {
  "openapi": "3.0.0",
  "info": {
    "title": "Kairos Church Management System API",
    "description": "Comprehensive REST API for managing church operations including:\n- Member management and profiles\n- Department organization and leadership\n- Event planning and registration\n- Communication and messaging\n- Fellowship group coordination\n- Financial tracking and reporting\n- Form creation and submissions\n- Outreach and evangelism activities\n- Security and role-based access control\n- System settings and configuration\n\nThis API follows OpenAPI 3.0 specification and provides complete\ndocumentation for all endpoints, data models, and validation rules.",
    "version": "1.0.0",
    "contact": {
      "name": "Kairos Development Team",
      "url": "https://github.com/kairos-church/kairos",
      "email": "dev@kairos-church.org"
    },
    "license": {
      "name": "MIT",
      "url": "https://opensource.org/licenses/MIT"
    }
  },
  "servers": [
    {
      "url": "https://your-api-gateway-url.amazonaws.com/prod",
      "description": "AWS Production Server"
    },
    {
      "url": "http://localhost:3333/api",
      "description": "Local Development Server"
    }
  ],
  "paths": {
    "/": {
      "get": {
        "summary": "API Health Check",
        "description": "Returns basic API information and health status",
        "responses": {
          "200": {
            "description": "API is healthy and running",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "message": {
                      "type": "string",
                      "example": "Welcome to Kairos Church Management System API"
                    },
                    "version": {
                      "type": "string",
                      "example": "1.0.0"
                    },
                    "status": {
                      "type": "string",
                      "example": "healthy"
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    "/members": {
      "get": {
        "tags": ["members"],
        "summary": "Get all members",
        "description": "Retrieve a list of all church members with optional filtering and pagination",
        "parameters": [
          {
            "name": "page",
            "in": "query",
            "description": "Page number for pagination",
            "schema": {
              "type": "integer",
              "minimum": 1,
              "default": 1
            }
          },
          {
            "name": "limit",
            "in": "query",
            "description": "Number of items per page",
            "schema": {
              "type": "integer",
              "minimum": 1,
              "maximum": 100,
              "default": 10
            }
          },
          {
            "name": "search",
            "in": "query",
            "description": "Search term for member names or email",
            "schema": {
              "type": "string"
            }
          },
          {
            "name": "department",
            "in": "query",
            "description": "Filter by department ID",
            "schema": {
              "type": "string"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "List of members retrieved successfully",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "data": {
                      "type": "array",
                      "items": {
                        "$ref": "#/components/schemas/Member"
                      }
                    },
                    "pagination": {
                      "$ref": "#/components/schemas/PaginationMeta"
                    }
                  }
                }
              }
            }
          }
        }
      },
      "post": {
        "tags": ["members"],
        "summary": "Create a new member",
        "description": "Add a new member to the church management system",
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/CreateMemberDto"
              }
            }
          }
        },
        "responses": {
          "201": {
            "description": "Member created successfully",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Member"
                }
              }
            }
          },
          "400": {
            "description": "Invalid input data",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ErrorResponse"
                }
              }
            }
          }
        }
      }
    },
    "/members/{id}": {
      "get": {
        "tags": ["members"],
        "summary": "Get member by ID",
        "description": "Retrieve a specific member by their unique identifier",
        "parameters": [
          {
            "name": "id",
            "in": "path",
            "required": true,
            "description": "Member ID",
            "schema": {
              "type": "string"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "Member retrieved successfully",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Member"
                }
              }
            }
          },
          "404": {
            "description": "Member not found",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ErrorResponse"
                }
              }
            }
          }
        }
      },
      "put": {
        "tags": ["members"],
        "summary": "Update member",
        "description": "Update an existing member's information",
        "parameters": [
          {
            "name": "id",
            "in": "path",
            "required": true,
            "description": "Member ID",
            "schema": {
              "type": "string"
            }
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/UpdateMemberDto"
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Member updated successfully",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Member"
                }
              }
            }
          },
          "404": {
            "description": "Member not found",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ErrorResponse"
                }
              }
            }
          }
        }
      },
      "delete": {
        "tags": ["members"],
        "summary": "Delete member",
        "description": "Remove a member from the system",
        "parameters": [
          {
            "name": "id",
            "in": "path",
            "required": true,
            "description": "Member ID",
            "schema": {
              "type": "string"
            }
          }
        ],
        "responses": {
          "204": {
            "description": "Member deleted successfully"
          },
          "404": {
            "description": "Member not found",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ErrorResponse"
                }
              }
            }
          }
        }
      }
    }
  },
  "components": {
    "schemas": {
      "Member": {
        "type": "object",
        "properties": {
          "id": {
            "type": "string",
            "description": "Unique identifier for the member",
            "example": "mem_123456789"
          },
          "firstName": {
            "type": "string",
            "description": "Member's first name",
            "example": "John"
          },
          "lastName": {
            "type": "string",
            "description": "Member's last name",
            "example": "Doe"
          },
          "email": {
            "type": "string",
            "format": "email",
            "description": "Member's email address",
            "example": "john.doe@example.com"
          },
          "phone": {
            "type": "string",
            "description": "Member's phone number",
            "example": "+1234567890"
          },
          "dateOfBirth": {
            "type": "string",
            "format": "date",
            "description": "Member's date of birth",
            "example": "1990-01-15"
          },
          "gender": {
            "type": "string",
            "enum": ["male", "female", "other"],
            "description": "Member's gender",
            "example": "male"
          },
          "maritalStatus": {
            "type": "string",
            "enum": ["single", "married", "divorced", "widowed"],
            "description": "Member's marital status",
            "example": "married"
          },
          "address": {
            "type": "string",
            "description": "Member's address",
            "example": "123 Main St, City, State 12345"
          },
          "joinDate": {
            "type": "string",
            "format": "date",
            "description": "Date when member joined the church",
            "example": "2020-01-01"
          },
          "departmentId": {
            "type": "string",
            "description": "ID of the department the member belongs to",
            "example": "dept_123"
          },
          "isActive": {
            "type": "boolean",
            "description": "Whether the member is currently active",
            "example": true
          },
          "createdAt": {
            "type": "string",
            "format": "date-time",
            "description": "Timestamp when the member was created"
          },
          "updatedAt": {
            "type": "string",
            "format": "date-time",
            "description": "Timestamp when the member was last updated"
          }
        }
      },
      "CreateMemberDto": {
        "type": "object",
        "required": ["firstName", "lastName", "email"],
        "properties": {
          "firstName": {
            "type": "string",
            "minLength": 1,
            "maxLength": 50,
            "description": "Member's first name",
            "example": "John"
          },
          "lastName": {
            "type": "string",
            "minLength": 1,
            "maxLength": 50,
            "description": "Member's last name",
            "example": "Doe"
          },
          "email": {
            "type": "string",
            "format": "email",
            "description": "Member's email address",
            "example": "john.doe@example.com"
          },
          "phone": {
            "type": "string",
            "description": "Member's phone number",
            "example": "+1234567890"
          },
          "dateOfBirth": {
            "type": "string",
            "format": "date",
            "description": "Member's date of birth",
            "example": "1990-01-15"
          },
          "gender": {
            "type": "string",
            "enum": ["male", "female", "other"],
            "description": "Member's gender",
            "example": "male"
          },
          "maritalStatus": {
            "type": "string",
            "enum": ["single", "married", "divorced", "widowed"],
            "description": "Member's marital status",
            "example": "married"
          },
          "address": {
            "type": "string",
            "description": "Member's address",
            "example": "123 Main St, City, State 12345"
          },
          "departmentId": {
            "type": "string",
            "description": "ID of the department the member belongs to",
            "example": "dept_123"
          }
        }
      },
      "UpdateMemberDto": {
        "type": "object",
        "properties": {
          "firstName": {
            "type": "string",
            "minLength": 1,
            "maxLength": 50,
            "description": "Member's first name",
            "example": "John"
          },
          "lastName": {
            "type": "string",
            "minLength": 1,
            "maxLength": 50,
            "description": "Member's last name",
            "example": "Doe"
          },
          "email": {
            "type": "string",
            "format": "email",
            "description": "Member's email address",
            "example": "john.doe@example.com"
          },
          "phone": {
            "type": "string",
            "description": "Member's phone number",
            "example": "+1234567890"
          },
          "dateOfBirth": {
            "type": "string",
            "format": "date",
            "description": "Member's date of birth",
            "example": "1990-01-15"
          },
          "gender": {
            "type": "string",
            "enum": ["male", "female", "other"],
            "description": "Member's gender",
            "example": "male"
          },
          "maritalStatus": {
            "type": "string",
            "enum": ["single", "married", "divorced", "widowed"],
            "description": "Member's marital status",
            "example": "married"
          },
          "address": {
            "type": "string",
            "description": "Member's address",
            "example": "123 Main St, City, State 12345"
          },
          "departmentId": {
            "type": "string",
            "description": "ID of the department the member belongs to",
            "example": "dept_123"
          },
          "isActive": {
            "type": "boolean",
            "description": "Whether the member is currently active",
            "example": true
          }
        }
      },
      "PaginationMeta": {
        "type": "object",
        "properties": {
          "page": {
            "type": "integer",
            "description": "Current page number",
            "example": 1
          },
          "limit": {
            "type": "integer",
            "description": "Number of items per page",
            "example": 10
          },
          "total": {
            "type": "integer",
            "description": "Total number of items",
            "example": 100
          },
          "totalPages": {
            "type": "integer",
            "description": "Total number of pages",
            "example": 10
          },
          "hasNext": {
            "type": "boolean",
            "description": "Whether there is a next page",
            "example": true
          },
          "hasPrev": {
            "type": "boolean",
            "description": "Whether there is a previous page",
            "example": false
          }
        }
      },
      "ErrorResponse": {
        "type": "object",
        "properties": {
          "statusCode": {
            "type": "integer",
            "description": "HTTP status code",
            "example": 400
          },
          "message": {
            "type": "string",
            "description": "Error message",
            "example": "Validation failed"
          },
          "error": {
            "type": "string",
            "description": "Error type",
            "example": "Bad Request"
          },
          "timestamp": {
            "type": "string",
            "format": "date-time",
            "description": "Timestamp when the error occurred"
          },
          "path": {
            "type": "string",
            "description": "API path where the error occurred",
            "example": "/members"
          }
        }
      }
    }
  }
};

const swaggerUIHTML = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Kairos Church Management System API</title>
  <link rel="stylesheet" type="text/css" href="https://unpkg.com/swagger-ui-dist@4.15.5/swagger-ui.css" />
  <style>
    html {
      box-sizing: border-box;
      overflow: -moz-scrollbars-vertical;
      overflow-y: scroll;
    }
    *, *:before, *:after {
      box-sizing: inherit;
    }
    body {
      margin:0;
      background: #fafafa;
    }
  </style>
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@4.15.5/swagger-ui-bundle.js"></script>
  <script src="https://unpkg.com/swagger-ui-dist@4.15.5/swagger-ui-standalone-preset.js"></script>
  <script>
    window.onload = function() {
      const ui = SwaggerUIBundle({
        spec: ${JSON.stringify(openApiSpec, null, 2)},
        dom_id: '#swagger-ui',
        deepLinking: true,
        presets: [
          SwaggerUIBundle.presets.apis,
          SwaggerUIStandalonePreset
        ],
        plugins: [
          SwaggerUIBundle.plugins.DownloadUrl
        ],
        layout: "StandaloneLayout"
      });
    };
  </script>
</body>
</html>
`;

exports.handler = async (event) => {
  try {
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'text/html',
     }
};
    };
), }ocs',
     : '/d   path     ring(),
).toISOStDate(new imestamp:    t     r Error',
 ServeInternalror: '        ererror',
rver  senalterage: 'Inss    me 500,
    usCode:      stat  y({
ngif JSON.stri    body:    },
  
  '*',Origin': llow-rol-Acess-Cont
        'Acn/json',atiopplicType': 'at-Conten '      {
 s:      headerode: 500,
 tatusC
      srn {tureror);
    ror:', er'Erole.error(ns) {
    coh (error } catc;
 ,
    }rUIHTMLody: swagge },
      b,
     igin': '*'ow-Orl-Alls-Contro     'Acces