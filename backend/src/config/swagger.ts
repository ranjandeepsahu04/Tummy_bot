import swaggerJSDoc from 'swagger-jsdoc';

const options: swaggerJSDoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'WhatsApp Food Ordering API',
      version: '1.0.0',
      description: 'Production API documentation for WhatsApp Food Ordering System, Webhook Handler, catalog management, and Admin Dashboard.'
    },
    servers: [
      {
        url: 'http://localhost:5000/api',
        description: 'Local Development Server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      }
    }
  },
  apis: ['./src/routes/*.ts', './src/server.ts']
};

export const swaggerSpec = swaggerJSDoc(options);
