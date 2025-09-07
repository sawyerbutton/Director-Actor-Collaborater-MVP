import { NextRequest, NextResponse } from 'next/server';
import { env } from '@/lib/config/env';
import { openApiSpec } from '@/lib/api/openapi/spec';
import { UnauthorizedError } from '@/lib/api/errors';
import { withMiddleware } from '@/lib/api/middleware';
import { withErrorBoundary } from '@/lib/api/errors';

const SWAGGER_UI_HTML = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>API Documentation</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5.9.0/swagger-ui.css">
  <style>
    body {
      margin: 0;
      padding: 0;
    }
  </style>
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5.9.0/swagger-ui-bundle.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5.9.0/swagger-ui-standalone-preset.js"></script>
  <script>
    window.onload = function() {
      window.ui = SwaggerUIBundle({
        url: '/api/docs/spec',
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

export async function GET(request: NextRequest) {
  return withMiddleware(request, async () => {
    return withErrorBoundary(async () => {
      // Check if API docs are enabled
      if (!env.get('ENABLE_API_DOCS')) {
        throw new UnauthorizedError('API documentation is disabled');
      }

      // Only allow in development mode unless explicitly enabled
      if (env.isProduction() && env.get('ENABLE_API_DOCS') !== 'true') {
        throw new UnauthorizedError('API documentation is not available in production');
      }

      // Check if requesting the spec or the UI
      const url = new URL(request.url);
      if (url.pathname.endsWith('/spec')) {
        // Return the OpenAPI spec as JSON
        return NextResponse.json(openApiSpec);
      }

      // Return the Swagger UI HTML
      return new NextResponse(SWAGGER_UI_HTML, {
        headers: {
          'Content-Type': 'text/html'
        }
      });
    });
  });
}