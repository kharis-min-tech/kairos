const fs = require('fs');
const path = require('path');

// Read the OpenAPI spec
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
      "url": process.env.API_GATEWAY_URL || "https://your-api-gateway-url.amazonaws.com/prod",
      "description": "AWS Production Server"
    },
    {
      "url": "http://localhost:3333/api",
      "description": "Local Development Server"
    }
  ],
  "tags": [
    {
      "name": "members",
      "description": "Member management operations - Create, read, update, and manage church member profiles"
    },
    {
      "name": "departments",
      "description": "Department management operations - Organize church departments and leadership"
    },
    {
      "name": "events",
      "description": "Event management operations - Plan, schedule, and manage church events"
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
    },
    "/departments": {
      "get": {
        "tags": ["departments"],
        "summary": "Get all departments",
        "description": "Retrieve a list of all church departments",
        "responses": {
          "200": {
            "description": "List of departments retrieved successfully",
            "content": {
              "application/json": {
                "schema": {
                  "type": "array",
                  "items": {
                    "$ref": "#/components/schemas/Department"
                  }
                }
              }
            }
          }
        }
      },
      "post": {
        "tags": ["departments"],
        "summary": "Create a new department",
        "description": "Add a new department to the church",
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/CreateDepartmentDto"
              }
            }
          }
        },
        "responses": {
          "201": {
            "description": "Department created successfully",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Department"
                }
              }
            }
          }
        }
      }
    },
    "/departments/{id}": {
      "get": {
        "tags": ["departments"],
        "summary": "Get department by ID",
        "description": "Retrieve a specific department by its unique identifier",
        "parameters": [
          {
            "name": "id",
            "in": "path",
            "required": true,
            "description": "Department ID",
            "schema": {
              "type": "string"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "Department retrieved successfully",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Department"
                }
              }
            }
          },
          "404": {
            "description": "Department not found",
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
        "tags": ["departments"],
        "summary": "Update department",
        "description": "Update an existing department's information",
        "parameters": [
          {
            "name": "id",
            "in": "path",
            "required": true,
            "description": "Department ID",
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
                "$ref": "#/components/schemas/UpdateDepartmentDto"
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Department updated successfully",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Department"
                }
              }
            }
          },
          "404": {
            "description": "Department not found",
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
        "tags": ["departments"],
        "summary": "Delete department",
        "description": "Remove a department from the system",
        "parameters": [
          {
            "name": "id",
            "in": "path",
            "required": true,
            "description": "Department ID",
            "schema": {
              "type": "string"
            }
          }
        ],
        "responses": {
          "204": {
            "description": "Department deleted successfully"
          },
          "404": {
            "description": "Department not found",
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
    "/events": {
      "get": {
        "tags": ["events"],
        "summary": "Get all events",
        "description": "Retrieve a list of all church events",
        "parameters": [
          {
            "name": "startDate",
            "in": "query",
            "description": "Filter events starting from this date",
            "schema": {
              "type": "string",
              "format": "date"
            }
          },
          {
            "name": "endDate",
            "in": "query",
            "description": "Filter events ending before this date",
            "schema": {
              "type": "string",
              "format": "date"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "List of events retrieved successfully",
            "content": {
              "application/json": {
                "schema": {
                  "type": "array",
                  "items": {
                    "$ref": "#/components/schemas/Event"
                  }
                }
              }
            }
          }
        }
      },
      "post": {
        "tags": ["events"],
        "summary": "Create a new event",
        "description": "Add a new event to the church calendar",
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/CreateEventDto"
              }
            }
          }
        },
        "responses": {
          "201": {
            "description": "Event created successfully",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Event"
                }
              }
            }
          }
        }
      }
    },
    "/events/{id}": {
      "get": {
        "tags": ["events"],
        "summary": "Get event by ID",
        "description": "Retrieve a specific event by its unique identifier",
        "parameters": [
          {
            "name": "id",
            "in": "path",
            "required": true,
            "description": "Event ID",
            "schema": {
              "type": "string"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "Event retrieved successfully",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Event"
                }
              }
            }
          },
          "404": {
            "description": "Event not found",
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
        "tags": ["events"],
        "summary": "Update event",
        "description": "Update an existing event's information",
        "parameters": [
          {
            "name": "id",
            "in": "path",
            "required": true,
            "description": "Event ID",
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
                "$ref": "#/components/schemas/UpdateEventDto"
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Event updated successfully",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Event"
                }
              }
            }
          },
          "404": {
            "description": "Event not found",
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
        "tags": ["events"],
        "summary": "Delete event",
        "description": "Remove an event from the system",
        "parameters": [
          {
            "name": "id",
            "in": "path",
            "required": true,
            "description": "Event ID",
            "schema": {
              "type": "string"
            }
          }
        ],
        "responses": {
          "204": {
            "description": "Event deleted successfully"
          },
          "404": {
            "description": "Event not found",
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
      "Department": {
        "type": "object",
        "properties": {
          "id": {
            "type": "string",
            "description": "Unique identifier for the department",
            "example": "dept_123456789"
          },
          "name": {
            "type": "string",
            "description": "Department name",
            "example": "Youth Ministry"
          },
          "description": {
            "type": "string",
            "description": "Department description",
            "example": "Ministry focused on youth development and engagement"
          },
          "leaderId": {
            "type": "string",
            "description": "ID of the department leader",
            "example": "mem_123456789"
          },
          "isActive": {
            "type": "boolean",
            "description": "Whether the department is currently active",
            "example": true
          },
          "createdAt": {
            "type": "string",
            "format": "date-time",
            "description": "Timestamp when the department was created"
          },
          "updatedAt": {
            "type": "string",
            "format": "date-time",
            "description": "Timestamp when the department was last updated"
          }
        }
      },
      "CreateDepartmentDto": {
        "type": "object",
        "required": ["name"],
        "properties": {
          "name": {
            "type": "string",
            "minLength": 1,
            "maxLength": 100,
            "description": "Department name",
            "example": "Youth Ministry"
          },
          "description": {
            "type": "string",
            "description": "Department description",
            "example": "Ministry focused on youth development and engagement"
          },
          "leaderId": {
            "type": "string",
            "description": "ID of the department leader",
            "example": "mem_123456789"
          }
        }
      },
      "UpdateDepartmentDto": {
        "type": "object",
        "properties": {
          "name": {
            "type": "string",
            "minLength": 1,
            "maxLength": 100,
            "description": "Department name",
            "example": "Youth Ministry"
          },
          "description": {
            "type": "string",
            "description": "Department description",
            "example": "Ministry focused on youth development and engagement"
          },
          "leaderId": {
            "type": "string",
            "description": "ID of the department leader",
            "example": "mem_123456789"
          },
          "isActive": {
            "type": "boolean",
            "description": "Whether the department is currently active",
            "example": true
          }
        }
      },
      "Event": {
        "type": "object",
        "properties": {
          "id": {
            "type": "string",
            "description": "Unique identifier for the event",
            "example": "evt_123456789"
          },
          "title": {
            "type": "string",
            "description": "Event title",
            "example": "Sunday Service"
          },
          "description": {
            "type": "string",
            "description": "Event description",
            "example": "Weekly Sunday worship service"
          },
          "startDate": {
            "type": "string",
            "format": "date-time",
            "description": "Event start date and time",
            "example": "2024-01-07T10:00:00Z"
          },
          "endDate": {
            "type": "string",
            "format": "date-time",
            "description": "Event end date and time",
            "example": "2024-01-07T12:00:00Z"
          },
          "location": {
            "type": "string",
            "description": "Event location",
            "example": "Main Sanctuary"
          },
          "capacity": {
            "type": "integer",
            "description": "Maximum number of attendees",
            "example": 500
          },
          "registrationFee": {
            "type": "number",
            "format": "decimal",
            "description": "Registration fee for the event",
            "example": 0.00
          },
          "isActive": {
            "type": "boolean",
            "description": "Whether the event is currently active",
            "example": true
          },
          "createdAt": {
            "type": "string",
            "format": "date-time",
            "description": "Timestamp when the event was created"
          },
          "updatedAt": {
            "type": "string",
            "format": "date-time",
            "description": "Timestamp when the event was last updated"
          }
        }
      },
      "CreateEventDto": {
        "type": "object",
        "required": ["title", "startDate", "endDate"],
        "properties": {
          "title": {
            "type": "string",
            "minLength": 1,
            "maxLength": 200,
            "description": "Event title",
            "example": "Sunday Service"
          },
          "description": {
            "type": "string",
            "description": "Event description",
            "example": "Weekly Sunday worship service"
          },
          "startDate": {
            "type": "string",
            "format": "date-time",
            "description": "Event start date and time",
            "example": "2024-01-07T10:00:00Z"
          },
          "endDate": {
            "type": "string",
            "format": "date-time",
            "description": "Event end date and time",
            "example": "2024-01-07T12:00:00Z"
          },
          "location": {
            "type": "string",
            "description": "Event location",
            "example": "Main Sanctuary"
          },
          "capacity": {
            "type": "integer",
            "minimum": 1,
            "description": "Maximum number of attendees",
            "example": 500
          },
          "registrationFee": {
            "type": "number",
            "format": "decimal",
            "minimum": 0,
            "description": "Registration fee for the event",
            "example": 0.00
          }
        }
      },
      "UpdateEventDto": {
        "type": "object",
        "properties": {
          "title": {
            "type": "string",
            "minLength": 1,
            "maxLength": 200,
            "description": "Event title",
            "example": "Sunday Service"
          },
          "description": {
            "type": "string",
            "description": "Event description",
            "example": "Weekly Sunday worship service"
          },
          "startDate": {
            "type": "string",
            "format": "date-time",
            "description": "Event start date and time",
            "example": "2024-01-07T10:00:00Z"
          },
          "endDate": {
            "type": "string",
            "format": "date-time",
            "description": "Event end date and time",
            "example": "2024-01-07T12:00:00Z"
          },
          "location": {
            "type": "string",
            "description": "Event location",
            "example": "Main Sanctuary"
          },
          "capacity": {
            "type": "integer",
            "minimum": 1,
            "description": "Maximum number of attendees",
            "example": 500
          },
          "registrationFee": {
            "type": "number",
            "format": "decimal",
            "minimum": 0,
            "description": "Registration fee for the event",
            "example": 0.00
          },
          "isActive": {
            "type": "boolean",
            "description": "Whether the event is currently active",
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

exports.handler = async (event) => {
  try {
    // Update the server URL with the actual API Gateway URL
    if (process.env.API_GATEWAY_URL) {
      openApiSpec.servers[0].url = process.env.API_GATEWAY_URL;
    }

    const swaggerHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Kairos Church Management System API Documentation</title>
    <link rel="stylesheet" type="text/css" href="https://unpkg.com/swagger-ui-dist@5.10.3/swagger-ui.css" />
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
        .swagger-ui .topbar {
            background-color: #2c3e50;
        }
        .swagger-ui .topbar .download-url-wrapper .select-label {
            color: #fff;
        }
        .swagger-ui .topbar .download-url-wrapper input[type=text] {
            border: 2px solid #34495e;
        }
        .swagger-ui .info .title {
            color: #2c3e50;
        }
    </style>
</head>
<body>
    <div id="swagger-ui"></div>
    <script src="https://unpkg.com/swagger-ui-dist@5.10.3/swagger-ui-bundle.js"></script>
    <script src="https://unpkg.com/swagger-ui-dist@5.10.3/swagger-ui-standalone-preset.js"></script>
    <script>
        window.onload = function() {
            const ui = SwaggerUIBundle({
                url: window.location.origin + window.location.pathname.replace('/docs', '/openapi.json'),
                spec: ${JSON.stringify(openApiSpec)},
                dom_id: '#swagger-ui',
                deepLinking: true,
                presets: [
                    SwaggerUIBundle.presets.apis,
                    SwaggerUIStandalonePreset
                ],
                plugins: [
                    SwaggerUIBundle.plugins.DownloadUrl
                ],
                layout: "StandaloneLayout",
                tryItOutEnabled: true,
                requestInterceptor: function(request) {
                    // Add any custom headers or modifications here
                    return request;
                },
                responseInterceptor: function(response) {
                    // Handle responses here
                    return response;
                }
            });
        };
    </script>
</body>
</html>`;

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'text/html',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      },
      body: swaggerHtml,
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
        path: '/docs',
      }),
    };
  }
};