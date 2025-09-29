import { prisma } from '../client'
import { AnalysisJob, JobType, JobStatus, Prisma } from '@prisma/client'
import { BaseService } from './base.service'

export class AnalysisJobService extends BaseService {
  /**
   * Create a new analysis job
   */
  async create(data: {
    projectId: string
    type: JobType
    metadata?: any
  }): Promise<AnalysisJob> {
    return await prisma.analysisJob.create({
      data: {
        projectId: data.projectId,
        type: data.type,
        status: JobStatus.QUEUED,
        metadata: data.metadata || {}
      }
    })
  }

  /**
   * Get job by ID
   */
  async getById(id: string): Promise<AnalysisJob | null> {
    return await prisma.analysisJob.findUnique({
      where: { id }
    })
  }

  /**
   * Get all jobs for a project
   */
  async getByProjectId(
    projectId: string,
    options?: {
      type?: JobType
      status?: JobStatus
      orderBy?: 'asc' | 'desc'
    }
  ): Promise<AnalysisJob[]> {
    const where: Prisma.AnalysisJobWhereInput = { projectId }

    if (options?.type) {
      where.type = options.type
    }
    if (options?.status) {
      where.status = options.status
    }

    return await prisma.analysisJob.findMany({
      where,
      orderBy: { createdAt: options?.orderBy ?? 'desc' }
    })
  }

  /**
   * Update job status
   */
  async updateStatus(
    id: string,
    status: JobStatus,
    data?: {
      result?: any
      error?: string
    }
  ): Promise<AnalysisJob> {
    const updateData: Prisma.AnalysisJobUpdateInput = { status }

    if (status === JobStatus.PROCESSING && !data?.error) {
      updateData.startedAt = new Date()
    }

    if (status === JobStatus.COMPLETED || status === JobStatus.FAILED) {
      updateData.completedAt = new Date()
    }

    if (data?.result) {
      updateData.result = data.result
    }

    if (data?.error) {
      updateData.error = data.error
    }

    return await prisma.analysisJob.update({
      where: { id },
      data: updateData
    })
  }

  /**
   * Start processing a job
   */
  async startProcessing(id: string): Promise<AnalysisJob> {
    return await this.updateStatus(id, JobStatus.PROCESSING)
  }

  /**
   * Complete a job with result
   */
  async complete(id: string, result: any): Promise<AnalysisJob> {
    return await this.updateStatus(id, JobStatus.COMPLETED, { result })
  }

  /**
   * Fail a job with error
   */
  async fail(id: string, error: string): Promise<AnalysisJob> {
    return await this.updateStatus(id, JobStatus.FAILED, { error })
  }

  /**
   * Cancel a job
   */
  async cancel(id: string): Promise<AnalysisJob> {
    return await this.updateStatus(id, JobStatus.CANCELLED)
  }

  /**
   * Get next queued job
   */
  async getNextQueued(type?: JobType): Promise<AnalysisJob | null> {
    const where: Prisma.AnalysisJobWhereInput = {
      status: JobStatus.QUEUED
    }

    if (type) {
      where.type = type
    }

    return await prisma.analysisJob.findFirst({
      where,
      orderBy: { createdAt: 'asc' }
    })
  }

  /**
   * Clean up old completed/failed jobs
   */
  async cleanupOldJobs(daysToKeep: number = 7): Promise<number> {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep)

    const result = await prisma.analysisJob.deleteMany({
      where: {
        OR: [
          { status: JobStatus.COMPLETED },
          { status: JobStatus.FAILED },
          { status: JobStatus.CANCELLED }
        ],
        completedAt: {
          lt: cutoffDate
        }
      }
    })

    return result.count
  }

  /**
   * Get job statistics for a project
   */
  async getStatistics(projectId: string): Promise<{
    total: number
    queued: number
    processing: number
    completed: number
    failed: number
    cancelled: number
  }> {
    const jobs = await prisma.analysisJob.groupBy({
      by: ['status'],
      where: { projectId },
      _count: true
    })

    const stats = {
      total: 0,
      queued: 0,
      processing: 0,
      completed: 0,
      failed: 0,
      cancelled: 0
    }

    jobs.forEach(job => {
      const count = job._count
      stats.total += count

      switch (job.status) {
        case JobStatus.QUEUED:
          stats.queued = count
          break
        case JobStatus.PROCESSING:
          stats.processing = count
          break
        case JobStatus.COMPLETED:
          stats.completed = count
          break
        case JobStatus.FAILED:
          stats.failed = count
          break
        case JobStatus.CANCELLED:
          stats.cancelled = count
          break
      }
    })

    return stats
  }

  /**
   * Retry a failed job
   */
  async retry(id: string): Promise<AnalysisJob> {
    const job = await prisma.analysisJob.findUnique({
      where: { id },
      select: { status: true }
    })

    if (!job || job.status !== JobStatus.FAILED) {
      throw new Error('Job not found or not in failed state')
    }

    return await prisma.analysisJob.update({
      where: { id },
      data: {
        status: JobStatus.QUEUED,
        error: null,
        result: Prisma.JsonNull,
        startedAt: null,
        completedAt: null
      }
    })
  }
}

export const analysisJobService = new AnalysisJobService()