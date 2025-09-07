import { prisma } from './client';
import { Prisma } from '@prisma/client';

export async function createProjectWithAnalysis(data: {
  userId: string;
  title: string;
  description?: string;
  content: string;
  status?: string;
}) {
  return await prisma.$transaction(async (tx) => {
    const project = await tx.project.create({
      data: {
        userId: data.userId,
        title: data.title,
        description: data.description,
        content: data.content,
        status: data.status || 'draft',
      },
    });

    const analysis = await tx.analysis.create({
      data: {
        projectId: project.id,
        status: 'pending',
      },
    });

    return { project, analysis };
  });
}

export async function deleteUserWithAllData(userId: string) {
  return await prisma.$transaction(async (tx) => {
    // Get all project IDs for the user
    const projects = await tx.project.findMany({
      where: { userId },
      select: { id: true },
    });

    const projectIds = projects.map(p => p.id);

    // Delete all analyses for user's projects
    const deletedAnalyses = await tx.analysis.deleteMany({
      where: { projectId: { in: projectIds } },
    });

    // Delete all projects
    const deletedProjects = await tx.project.deleteMany({
      where: { userId },
    });

    // Delete the user
    const deletedUser = await tx.user.delete({
      where: { id: userId },
    });

    return {
      user: deletedUser,
      projectsDeleted: deletedProjects.count,
      analysesDeleted: deletedAnalyses.count,
    };
  });
}

export async function bulkCreateProjects(
  userId: string,
  projects: Array<{
    title: string;
    description?: string;
    content: string;
    status?: string;
  }>
) {
  return await prisma.$transaction(async (tx) => {
    const createdProjects = await Promise.all(
      projects.map(projectData =>
        tx.project.create({
          data: {
            ...projectData,
            userId,
            status: projectData.status || 'draft',
          },
        })
      )
    );

    return createdProjects;
  });
}