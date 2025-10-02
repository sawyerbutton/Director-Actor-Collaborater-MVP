import { prisma } from '../client'
import { ScriptVersion, Prisma } from '@prisma/client'
import { BaseService } from './base.service'

export class ScriptVersionService extends BaseService {
  /**
   * Create a new script version
   */
  async create(data: {
    projectId: string
    content: string
    changeLog?: string
  }): Promise<ScriptVersion> {
    // Get the next version number for this project
    const latestVersion = await prisma.scriptVersion.findFirst({
      where: { projectId: data.projectId },
      orderBy: { version: 'desc' },
      select: { version: true }
    })

    const nextVersion = (latestVersion?.version ?? 0) + 1

    return await prisma.scriptVersion.create({
      data: {
        ...data,
        version: nextVersion
      }
    })
  }

  /**
   * Get all versions for a project
   */
  async getByProjectId(
    projectId: string,
    options?: {
      orderBy?: 'asc' | 'desc'
      limit?: number
    }
  ): Promise<ScriptVersion[]> {
    return await prisma.scriptVersion.findMany({
      where: { projectId },
      orderBy: { version: options?.orderBy ?? 'desc' },
      take: options?.limit
    })
  }

  /**
   * Get a specific version
   */
  async getByVersion(
    projectId: string,
    version: number
  ): Promise<ScriptVersion | null> {
    return await prisma.scriptVersion.findUnique({
      where: {
        projectId_version: {
          projectId,
          version
        }
      }
    })
  }

  /**
   * Get the latest version for a project
   */
  async getLatest(projectId: string): Promise<ScriptVersion | null> {
    return await prisma.scriptVersion.findFirst({
      where: { projectId },
      orderBy: { version: 'desc' }
    })
  }

  /**
   * Delete old versions (keep latest N versions)
   */
  async pruneOldVersions(
    projectId: string,
    keepCount: number = 10
  ): Promise<number> {
    const versions = await prisma.scriptVersion.findMany({
      where: { projectId },
      orderBy: { version: 'desc' },
      select: { id: true, version: true }
    })

    if (versions.length <= keepCount) {
      return 0
    }

    const versionsToDelete = versions.slice(keepCount)
    const deleteResult = await prisma.scriptVersion.deleteMany({
      where: {
        id: {
          in: versionsToDelete.map(v => v.id)
        }
      }
    })

    return deleteResult.count
  }

  /**
   * Compare two versions
   */
  async compareVersions(
    projectId: string,
    fromVersion: number,
    toVersion: number
  ): Promise<{
    from: ScriptVersion | null
    to: ScriptVersion | null
    changeLog?: string
  }> {
    const [from, to] = await Promise.all([
      this.getByVersion(projectId, fromVersion),
      this.getByVersion(projectId, toVersion)
    ])

    return {
      from,
      to,
      changeLog: to?.changeLog ?? undefined
    }
  }
}

export const scriptVersionService = new ScriptVersionService()