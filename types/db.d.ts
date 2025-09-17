import { User, Project, Analysis } from '@prisma/client';

export type { User, Project, Analysis };

export interface UserWithProjects extends User {
  projects: Project[];
}

export interface ProjectWithAnalyses extends Project {
  analyses: Analysis[];
}

export interface ProjectWithUser extends Project {
  user: User;
}

export interface ProjectWithCount extends Project {
  _count: {
    analyses: number;
  };
}

export interface AnalysisWithProject extends Analysis {
  project: Project;
}

export interface DatabaseHealthCheck {
  status: 'healthy' | 'unhealthy';
  latency?: number;
  error?: string;
}

export interface BulkDeleteResult {
  user: User;
  projectsDeleted: number;
  analysesDeleted: number;
}

export interface ProjectAnalysisCreationResult {
  project: Project;
  analysis: Analysis;
}