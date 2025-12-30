exports.handler = async (event) => {
  const openApiSpec = {
    openapi: "3.0.0",
    info: {
      title: "Kairos Church Management System API",
      description: "Complete REST API for church management operations",
      version: "1.0.0"
    },
    servers: [
      {
        url: process.env.API_GATEWAY_URL || "https://your-api-gateway-url.amazonaws.com/prod",
        description: "AWS Production Server"
      }
    ],
    paths: {
      "/": {
        get: {
          summary: "API Health Check",
          responses: {
            "200": {
              description: "API is healthy"
            }
          }
        }
      },
      "/members": {
        get: {
          tags: ["members"],
          summary: "Get all members",
          responses: {
            "200": {
              description: "List of members"
            }
          }
        },
        post: {
          tags: ["members"],
          summary: "Create member",
          responses: {
            "201": {
              description: "Member created"
            }
          }
        }
      },
      "/members/{id}": {
        get: {
          tags: ["members"],
          summary: "Get member by ID",
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: {
                type: "string"
              }
            }
          ],
          responses: {
            "200": {
              description: "Member details"
            }
          }
        },
        put: {
          tags: ["members"],
          summary: "Update member",
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: {
                type: "string"
              }
            }
          ],
          responses: {
            "200": {
              description: "Member updated"
            }
          }
        },
        delete: {
          tags: ["members"],
          summary: "Delete member",
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: {
                type: "string"
              }
            }
          ],
          responses: {
            "204": {
              description: "Member deleted"
            }
          }
        }
      },
      "/departments": {
        get: {
          tags: ["departments"],
          summary: "Get all departments",
          responses: {
            "200": {
              description: "List of departments"
            }
          }
        },
        post: {
          tags: ["departments"],
          summary: "Create department",
          responses: {
            "201": {
              description: "Department created"
            }
          }
        }
      },
      "/departments/{id}": {
        get: {
          tags: ["departments"],
          summary: "Get department by ID",
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: {
                type: "string"
              }
            }
          ],
          responses: {
            "200": {
              description: "Department details"
            }
          }
        },
        put: {
          tags: ["departments"],
          summary: "Update department",
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: {
                type: "string"
              }
            }
          ],
          responses: {
            "200": {
              description: "Department updated"
            }
          }
        },
        delete: {
          tags: ["departments"],
          summary: "Delete department",
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: {
                type: "string"
              }
            }
          ],
          responses: {
            "204": {
              description: "Department deleted"
            }
          }
        }
      },
      "/events": {
        get: {
          tags: ["events"],
          summary: "Get all events",
          responses: {
            "200": {
              description: "List of events"
            }
          }
        },
        post: {
          tags: ["events"],
          summary: "Create event",
          responses: {
            "201": {
              description: "Event created"
            }
          }
        }
      },
      "/events/{id}": {
        get: {
          tags: ["events"],
          summary: "Get event by ID",
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: {
                type: "string"
              }
            }
          ],
          responses: {
            "200": {
              description: "Event details"
            }
          }
        },
        put: {
          tags: ["events"],
          summary: "Update event",
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: {
                type: "string"
              }
            }
          ],
          responses: {
            "200": {
              description: "Event updated"
            }
          }
        },
        delete: {
          tags: ["events"],
          summary: "Delete event",
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: {
                type: "string"
              }
            }
          ],
          responses: {
            "204": {
              description: "Event deleted"
            }
          }
        }
      }
    }
  };

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
    body: JSON.stringify(openApiSpec),
  };
};