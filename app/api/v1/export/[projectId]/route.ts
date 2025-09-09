import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withMiddleware } from '@/lib/api/middleware';
import { handleApiError, ValidationError, UnauthorizedError, NotFoundError, ForbiddenError } from '@/lib/api/errors';
import { projectService } from '@/lib/db/services/project.service';
import { analysisService } from '@/lib/db/services/analysis.service';
import { ERROR_CODES, HTTP_STATUS } from '@/lib/config/constants';
import { authenticateRequest } from '@/lib/auth/middleware';

// Validation schema for query params
const exportQuerySchema = z.object({
  format: z.enum(['json', 'markdown', 'txt']).default('json'),
  includeAnalysis: z.coerce.boolean().default(false)
});


interface RouteParams {
  params: {
    projectId: string;
  };
}

// Helper function to format project as Markdown
function formatProjectAsMarkdown(project: any, analysis?: any): string {
  let markdown = `# ${project.title}\n\n`;
  
  if (project.description) {
    markdown += `## Description\n${project.description}\n\n`;
  }
  
  markdown += `## Metadata\n`;
  markdown += `- **Created:** ${project.createdAt}\n`;
  markdown += `- **Updated:** ${project.updatedAt}\n`;
  markdown += `- **Status:** ${project.status}\n\n`;
  
  markdown += `## Script Content\n\n`;
  markdown += '```\n';
  markdown += project.content;
  markdown += '\n```\n\n';
  
  if (analysis) {
    markdown += `## Latest Analysis\n\n`;
    markdown += `- **Status:** ${analysis.status}\n`;
    markdown += `- **Date:** ${analysis.createdAt}\n\n`;
    
    if (analysis.result) {
      markdown += `### Results\n\n`;
      markdown += '```json\n';
      markdown += JSON.stringify(analysis.result, null, 2);
      markdown += '\n```\n\n';
    }
    
    if (analysis.suggestions) {
      markdown += `### Suggestions\n\n`;
      markdown += '```json\n';
      markdown += JSON.stringify(analysis.suggestions, null, 2);
      markdown += '\n```\n\n';
    }
  }
  
  return markdown;
}

// GET /api/v1/export/[projectId] - Export project data
export async function GET(request: NextRequest, { params }: RouteParams) {
  return withMiddleware(request, async () => {
    try {
      // Authenticate user
      const user = await authenticateRequest(request);
      const userId = user.id;

      // Get project ID from params
      const projectId = params.projectId;
      if (!projectId) {
        throw new ValidationError('Project ID is required');
      }

      // Parse query parameters
      const searchParams = request.nextUrl.searchParams;
      const query = exportQuerySchema.parse({
        format: searchParams.get('format'),
        includeAnalysis: searchParams.get('includeAnalysis')
      });

      // Fetch project
      const project = await projectService.findById(projectId);
      if (!project) {
        throw new NotFoundError('Project');
      }

      // Verify user has access to this project
      if (project.userId !== userId) {
        throw new ForbiddenError('You do not have access to this project');
      }

      // Fetch latest analysis if requested
      let latestAnalysis = null;
      if (query.includeAnalysis) {
        latestAnalysis = await analysisService.getLatestForProject(projectId);
      }

      // Prepare export data
      const exportData = {
        project: {
          id: project.id,
          title: project.title,
          description: project.description,
          content: project.content,
          status: project.status,
          createdAt: project.createdAt.toISOString(),
          updatedAt: project.updatedAt.toISOString()
        },
        ...(latestAnalysis && {
          analysis: {
            id: latestAnalysis.id,
            status: latestAnalysis.status,
            result: latestAnalysis.result,
            suggestions: latestAnalysis.suggestions,
            errors: latestAnalysis.errors,
            createdAt: latestAnalysis.createdAt.toISOString(),
            completedAt: latestAnalysis.completedAt?.toISOString()
          }
        })
      };

      // Format response based on requested format
      let response: NextResponse;
      
      switch (query.format) {
        case 'markdown':
          const markdown = formatProjectAsMarkdown(exportData.project, exportData.analysis);
          response = new NextResponse(markdown, {
            status: HTTP_STATUS.OK,
            headers: {
              'Content-Type': 'text/markdown; charset=utf-8',
              'Content-Disposition': `attachment; filename="${project.title.replace(/[^a-z0-9]/gi, '_')}.md"`
            }
          });
          break;
          
        case 'txt':
          // Export just the script content as plain text
          response = new NextResponse(project.content, {
            status: HTTP_STATUS.OK,
            headers: {
              'Content-Type': 'text/plain; charset=utf-8',
              'Content-Disposition': `attachment; filename="${project.title.replace(/[^a-z0-9]/gi, '_')}.txt"`
            }
          });
          break;
          
        case 'json':
        default:
          response = new NextResponse(JSON.stringify(exportData, null, 2), {
            status: HTTP_STATUS.OK,
            headers: {
              'Content-Type': 'application/json; charset=utf-8',
              'Content-Disposition': `attachment; filename="${project.title.replace(/[^a-z0-9]/gi, '_')}.json"`
            }
          });
          break;
      }

      return response;
    } catch (error) {
      return handleApiError(error);
    }
  });
}