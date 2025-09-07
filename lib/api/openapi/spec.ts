import { env } from '@/lib/config/env';

export const openApiSpec = {
  openapi: '3.0.0',
  info: {
    title: 'Director-Actor-Collaborator API',
    description: 'API for AI-powered screenplay analysis and collaboration',
    version: env.get('NEXT_PUBLIC_API_VERSION') || 'v1',
    contact: {
      name: 'API Support',
      email: 'support@example.com'
    }
  },
  servers: [
    {
      url: env.get('NEXT_PUBLIC_APP_URL') + '/api',
      description: env.isDevelopment() ? 'Development server' : 'Production server'
    }
  ],
  tags: [
    {
      name: 'Health',
      description: 'Health check endpoints'
    },
    {
      name: 'Projects',
      description: 'Project management endpoints'
    },
    {
      name: 'Analysis',
      description: 'Script analysis endpoints'
    },
    {
      name: 'Auth',
      description: 'Authentication endpoints'
    }
  ],
  paths: {
    '/health': {
      get: {
        tags: ['Health'],
        summary: 'Health check endpoint',
        description: 'Returns the health status of the API',
        operationId: 'getHealth',
        responses: {
          '200': {
            description: 'API is healthy',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/HealthResponse'
                }
              }
            }
          }
        }
      }
    },
    '/v1/projects': {
      get: {
        tags: ['Projects'],
        summary: 'List projects',
        description: 'Returns a paginated list of projects',
        operationId: 'listProjects',
        parameters: [
          {
            $ref: '#/components/parameters/PageParam'
          },
          {
            $ref: '#/components/parameters/LimitParam'
          },
          {
            $ref: '#/components/parameters/SearchParam'
          }
        ],
        security: [
          {
            bearerAuth: []
          }
        ],
        responses: {
          '200': {
            description: 'List of projects',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ProjectListResponse'
                }
              }
            }
          },
          '401': {
            $ref: '#/components/responses/UnauthorizedError'
          }
        }
      },
      post: {
        tags: ['Projects'],
        summary: 'Create project',
        description: 'Creates a new project',
        operationId: 'createProject',
        security: [
          {
            bearerAuth: []
          }
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/CreateProjectRequest'
              }
            }
          }
        },
        responses: {
          '201': {
            description: 'Project created',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/Project'
                }
              }
            }
          },
          '400': {
            $ref: '#/components/responses/ValidationError'
          },
          '401': {
            $ref: '#/components/responses/UnauthorizedError'
          }
        }
      }
    },
    '/v1/analyze': {
      post: {
        tags: ['Analysis'],
        summary: 'Analyze script',
        description: 'Submit a script for AI analysis',
        operationId: 'analyzeScript',
        security: [
          {
            bearerAuth: []
          }
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/AnalysisRequest'
              }
            }
          }
        },
        responses: {
          '202': {
            description: 'Analysis started',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/AnalysisResponse'
                }
              }
            }
          },
          '400': {
            $ref: '#/components/responses/ValidationError'
          },
          '401': {
            $ref: '#/components/responses/UnauthorizedError'
          }
        }
      }
    }
  },
  components: {
    schemas: {
      ApiResponse: {
        type: 'object',
        required: ['success'],
        properties: {
          success: {
            type: 'boolean'
          },
          data: {
            type: 'object',
            nullable: true
          },
          error: {
            type: 'object',
            nullable: true,
            properties: {
              code: {
                type: 'string'
              },
              message: {
                type: 'string'
              },
              details: {
                type: 'object',
                nullable: true
              }
            }
          },
          meta: {
            type: 'object',
            properties: {
              timestamp: {
                type: 'string',
                format: 'date-time'
              },
              version: {
                type: 'string'
              },
              requestId: {
                type: 'string',
                nullable: true
              }
            }
          }
        }
      },
      HealthResponse: {
        allOf: [
          {
            $ref: '#/components/schemas/ApiResponse'
          },
          {
            type: 'object',
            properties: {
              data: {
                type: 'object',
                properties: {
                  status: {
                    type: 'string',
                    enum: ['healthy', 'degraded', 'unhealthy']
                  },
                  timestamp: {
                    type: 'string',
                    format: 'date-time'
                  },
                  uptime: {
                    type: 'number'
                  },
                  environment: {
                    type: 'string'
                  },
                  version: {
                    type: 'string'
                  },
                  responseTime: {
                    type: 'string'
                  }
                }
              }
            }
          }
        ]
      },
      Project: {
        type: 'object',
        required: ['id', 'name', 'createdAt', 'updatedAt', 'status'],
        properties: {
          id: {
            type: 'string',
            format: 'uuid'
          },
          name: {
            type: 'string',
            minLength: 1,
            maxLength: 255
          },
          description: {
            type: 'string',
            maxLength: 1000,
            nullable: true
          },
          createdAt: {
            type: 'string',
            format: 'date-time'
          },
          updatedAt: {
            type: 'string',
            format: 'date-time'
          },
          status: {
            type: 'string',
            enum: ['active', 'archived', 'draft']
          }
        }
      },
      CreateProjectRequest: {
        type: 'object',
        required: ['name'],
        properties: {
          name: {
            type: 'string',
            minLength: 1,
            maxLength: 255
          },
          description: {
            type: 'string',
            maxLength: 1000,
            nullable: true
          },
          status: {
            type: 'string',
            enum: ['active', 'archived', 'draft'],
            default: 'draft'
          }
        }
      },
      ProjectListResponse: {
        allOf: [
          {
            $ref: '#/components/schemas/ApiResponse'
          },
          {
            type: 'object',
            properties: {
              data: {
                type: 'object',
                properties: {
                  items: {
                    type: 'array',
                    items: {
                      $ref: '#/components/schemas/Project'
                    }
                  },
                  pagination: {
                    $ref: '#/components/schemas/Pagination'
                  }
                }
              }
            }
          }
        ]
      },
      AnalysisRequest: {
        type: 'object',
        required: ['projectId', 'scriptContent'],
        properties: {
          projectId: {
            type: 'string',
            format: 'uuid'
          },
          scriptContent: {
            type: 'string',
            minLength: 1
          },
          scriptType: {
            type: 'string',
            enum: ['screenplay', 'stageplay', 'other'],
            default: 'screenplay'
          },
          options: {
            type: 'object',
            properties: {
              includeCharacterAnalysis: {
                type: 'boolean',
                default: true
              },
              includeSceneBreakdown: {
                type: 'boolean',
                default: true
              },
              includeDialogueAnalysis: {
                type: 'boolean',
                default: true
              },
              includeThemeAnalysis: {
                type: 'boolean',
                default: true
              }
            }
          }
        }
      },
      AnalysisResponse: {
        type: 'object',
        required: ['id', 'projectId', 'status', 'createdAt'],
        properties: {
          id: {
            type: 'string',
            format: 'uuid'
          },
          projectId: {
            type: 'string',
            format: 'uuid'
          },
          status: {
            type: 'string',
            enum: ['pending', 'processing', 'completed', 'failed']
          },
          result: {
            type: 'object',
            nullable: true
          },
          error: {
            type: 'string',
            nullable: true
          },
          createdAt: {
            type: 'string',
            format: 'date-time'
          },
          completedAt: {
            type: 'string',
            format: 'date-time',
            nullable: true
          }
        }
      },
      Pagination: {
        type: 'object',
        required: ['page', 'limit', 'total', 'totalPages', 'hasNext', 'hasPrevious'],
        properties: {
          page: {
            type: 'integer',
            minimum: 1
          },
          limit: {
            type: 'integer',
            minimum: 1,
            maximum: 100
          },
          total: {
            type: 'integer',
            minimum: 0
          },
          totalPages: {
            type: 'integer',
            minimum: 0
          },
          hasNext: {
            type: 'boolean'
          },
          hasPrevious: {
            type: 'boolean'
          }
        }
      },
      ErrorResponse: {
        allOf: [
          {
            $ref: '#/components/schemas/ApiResponse'
          },
          {
            type: 'object',
            properties: {
              success: {
                type: 'boolean',
                enum: [false]
              }
            }
          }
        ]
      }
    },
    parameters: {
      PageParam: {
        in: 'query',
        name: 'page',
        schema: {
          type: 'integer',
          minimum: 1,
          default: 1
        },
        description: 'Page number'
      },
      LimitParam: {
        in: 'query',
        name: 'limit',
        schema: {
          type: 'integer',
          minimum: 1,
          maximum: 100,
          default: 20
        },
        description: 'Items per page'
      },
      SearchParam: {
        in: 'query',
        name: 'search',
        schema: {
          type: 'string'
        },
        description: 'Search query'
      }
    },
    responses: {
      UnauthorizedError: {
        description: 'Authentication required',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/ErrorResponse'
            }
          }
        }
      },
      ValidationError: {
        description: 'Validation failed',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/ErrorResponse'
            }
          }
        }
      },
      NotFoundError: {
        description: 'Resource not found',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/ErrorResponse'
            }
          }
        }
      },
      RateLimitError: {
        description: 'Rate limit exceeded',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/ErrorResponse'
            }
          }
        },
        headers: {
          'X-RateLimit-Limit': {
            schema: {
              type: 'integer'
            },
            description: 'Request limit per window'
          },
          'X-RateLimit-Remaining': {
            schema: {
              type: 'integer'
            },
            description: 'Remaining requests in window'
          },
          'X-RateLimit-Reset': {
            schema: {
              type: 'integer'
            },
            description: 'Time when rate limit resets (Unix timestamp)'
          },
          'Retry-After': {
            schema: {
              type: 'integer'
            },
            description: 'Seconds until rate limit resets'
          }
        }
      }
    },
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT'
      }
    }
  }
};