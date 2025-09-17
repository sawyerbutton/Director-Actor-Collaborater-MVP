#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { openApiSpec } from '../lib/api/openapi/spec';

const DOCS_OUTPUT_DIR = path.join(process.cwd(), 'docs', 'api');

async function generateApiDocs() {
  console.log('Generating API documentation...');

  // Ensure output directory exists
  if (!fs.existsSync(DOCS_OUTPUT_DIR)) {
    fs.mkdirSync(DOCS_OUTPUT_DIR, { recursive: true });
  }

  // Write OpenAPI spec as JSON
  const specPath = path.join(DOCS_OUTPUT_DIR, 'openapi.json');
  fs.writeFileSync(specPath, JSON.stringify(openApiSpec, null, 2));
  console.log(`✓ OpenAPI spec written to ${specPath}`);

  // Generate Markdown documentation
  const markdown = generateMarkdown(openApiSpec);
  const mdPath = path.join(DOCS_OUTPUT_DIR, 'api-reference.md');
  fs.writeFileSync(mdPath, markdown);
  console.log(`✓ Markdown documentation written to ${mdPath}`);

  console.log('API documentation generated successfully!');
}

function generateMarkdown(spec: any): string {
  let md = `# ${spec.info.title}\n\n`;
  md += `Version: ${spec.info.version}\n\n`;
  md += `${spec.info.description}\n\n`;

  // Add server information
  md += '## Servers\n\n';
  spec.servers.forEach((server: any) => {
    md += `- **${server.description}**: \`${server.url}\`\n`;
  });
  md += '\n';

  // Add authentication information
  if (spec.components?.securitySchemes) {
    md += '## Authentication\n\n';
    Object.entries(spec.components.securitySchemes).forEach(([name, scheme]: [string, any]) => {
      md += `### ${name}\n\n`;
      if (scheme.type === 'http' && scheme.scheme === 'bearer') {
        md += 'Bearer token authentication. Include the JWT token in the Authorization header:\n';
        md += '```\nAuthorization: Bearer <token>\n```\n\n';
      }
    });
  }

  // Add endpoints
  md += '## Endpoints\n\n';
  Object.entries(spec.paths).forEach(([path, methods]: [string, any]) => {
    Object.entries(methods).forEach(([method, operation]: [string, any]) => {
      md += `### ${method.toUpperCase()} ${path}\n\n`;
      
      if (operation.summary) {
        md += `**${operation.summary}**\n\n`;
      }
      
      if (operation.description) {
        md += `${operation.description}\n\n`;
      }
      
      if (operation.tags) {
        md += `**Tags:** ${operation.tags.join(', ')}\n\n`;
      }
      
      if (operation.security) {
        md += '**Authentication:** Required\n\n';
      }
      
      // Parameters
      if (operation.parameters) {
        md += '**Parameters:**\n\n';
        md += '| Name | In | Type | Required | Description |\n';
        md += '|------|-------|--------|-----------|-------------|\n';
        operation.parameters.forEach((param: any) => {
          const p = param.$ref ? resolveRef(spec, param.$ref) : param;
          md += `| ${p.name} | ${p.in} | ${p.schema?.type || 'any'} | ${p.required ? 'Yes' : 'No'} | ${p.description || '-'} |\n`;
        });
        md += '\n';
      }
      
      // Request body
      if (operation.requestBody) {
        md += '**Request Body:**\n\n';
        if (operation.requestBody.required) {
          md += 'Required\n\n';
        }
        const content = operation.requestBody.content?.['application/json'];
        if (content?.schema?.$ref) {
          const schemaName = content.schema.$ref.split('/').pop();
          md += `Schema: \`${schemaName}\`\n\n`;
        }
      }
      
      // Responses
      md += '**Responses:**\n\n';
      Object.entries(operation.responses).forEach(([code, response]: [string, any]) => {
        const res = response.$ref ? resolveRef(spec, response.$ref) : response;
        md += `- **${code}**: ${res.description}\n`;
      });
      md += '\n---\n\n';
    });
  });

  // Add schemas
  if (spec.components?.schemas) {
    md += '## Schemas\n\n';
    Object.entries(spec.components.schemas).forEach(([name, schema]: [string, any]) => {
      md += `### ${name}\n\n`;
      if (schema.type === 'object' && schema.properties) {
        md += '| Property | Type | Required | Description |\n';
        md += '|----------|------|----------|-------------|\n';
        Object.entries(schema.properties).forEach(([prop, details]: [string, any]) => {
          const required = schema.required?.includes(prop) ? 'Yes' : 'No';
          const type = details.type || 'any';
          const format = details.format ? ` (${details.format})` : '';
          md += `| ${prop} | ${type}${format} | ${required} | ${details.description || '-'} |\n`;
        });
        md += '\n';
      }
    });
  }

  return md;
}

function resolveRef(spec: any, ref: string): any {
  const path = ref.replace('#/', '').split('/');
  let result = spec;
  for (const segment of path) {
    result = result[segment];
  }
  return result;
}

// Run if executed directly
if (require.main === module) {
  generateApiDocs().catch(console.error);
}

export { generateApiDocs };