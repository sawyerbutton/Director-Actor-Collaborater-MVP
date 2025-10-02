import { prisma } from '../client'
import { RevisionDecision, ActType, Prisma } from '@prisma/client'
import { BaseService, NotFoundError } from './base.service'

export interface Proposal {
  id: string
  title: string
  description: string
  approach?: string
  pros: string[]
  cons: string[]
  dramaticImpact?: string
}

export interface DramaticAction {
  scene: string
  action: string
  reveals: string
}

export interface CreateDecisionData {
  projectId: string
  act: ActType
  focusName: string
  focusContext: Record<string, any>
  proposals: Proposal[]
}

export interface ExecuteDecisionData {
  userChoice: string
  generatedChanges: DramaticAction[]
}

export class RevisionDecisionService extends BaseService {
  /**
   * Create a new revision decision with proposals
   */
  async create(data: CreateDecisionData): Promise<RevisionDecision> {
    try {
      return await prisma.revisionDecision.create({
        data: {
          projectId: data.projectId,
          act: data.act,
          focusName: data.focusName,
          focusContext: data.focusContext as any,
          proposals: data.proposals as any,
          version: 1
        }
      })
    } catch (error) {
      return this.handleError(error)
    }
  }

  /**
   * Update decision with user choice and generated changes
   */
  async execute(
    decisionId: string,
    data: ExecuteDecisionData
  ): Promise<RevisionDecision> {
    try {
      const decision = await prisma.revisionDecision.findUnique({
        where: { id: decisionId }
      })

      if (!decision) {
        throw new NotFoundError('Decision not found')
      }

      return await prisma.revisionDecision.update({
        where: { id: decisionId },
        data: {
          userChoice: data.userChoice,
          generatedChanges: data.generatedChanges as any,
          updatedAt: new Date()
        }
      })
    } catch (error) {
      return this.handleError(error)
    }
  }

  /**
   * Get decision by ID with typed proposals and changes
   */
  async getById(
    decisionId: string
  ): Promise<
    (RevisionDecision & {
      parsedProposals: Proposal[]
      parsedChanges?: DramaticAction[]
    }) | null
  > {
    const decision = await prisma.revisionDecision.findUnique({
      where: { id: decisionId }
    })

    if (!decision) {
      return null
    }

    return {
      ...decision,
      parsedProposals: decision.proposals as unknown as Proposal[],
      parsedChanges: decision.generatedChanges
        ? (decision.generatedChanges as unknown as DramaticAction[])
        : undefined
    }
  }

  /**
   * Get all decisions for a project
   */
  async getByProjectId(projectId: string): Promise<RevisionDecision[]> {
    return await prisma.revisionDecision.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' }
    })
  }

  /**
   * Get decisions by project and act
   */
  async getByProjectAndAct(
    projectId: string,
    act: ActType
  ): Promise<RevisionDecision[]> {
    return await prisma.revisionDecision.findMany({
      where: { projectId, act },
      orderBy: { createdAt: 'desc' }
    })
  }

  /**
   * Get all decisions with parsed data
   */
  async getParsedDecisions(projectId: string): Promise<
    Array<
      RevisionDecision & {
        parsedProposals: Proposal[]
        parsedChanges?: DramaticAction[]
      }
    >
  > {
    const decisions = await this.getByProjectId(projectId)

    return decisions.map(decision => ({
      ...decision,
      parsedProposals: decision.proposals as unknown as Proposal[],
      parsedChanges: decision.generatedChanges
        ? (decision.generatedChanges as unknown as DramaticAction[])
        : undefined
    }))
  }

  /**
   * Get latest decision for a project and act
   */
  async getLatest(
    projectId: string,
    act: ActType
  ): Promise<RevisionDecision | null> {
    return await prisma.revisionDecision.findFirst({
      where: { projectId, act },
      orderBy: { createdAt: 'desc' }
    })
  }

  /**
   * Check if a decision has been executed
   */
  async isExecuted(decisionId: string): Promise<boolean> {
    const decision = await prisma.revisionDecision.findUnique({
      where: { id: decisionId },
      select: { userChoice: true, generatedChanges: true }
    })

    return !!(decision?.userChoice && decision?.generatedChanges)
  }

  /**
   * Get execution statistics for a project
   */
  async getStatistics(projectId: string): Promise<{
    total: number
    executed: number
    pending: number
    byAct: Record<ActType, number>
  }> {
    const decisions = await this.getByProjectId(projectId)

    const stats = {
      total: decisions.length,
      executed: 0,
      pending: 0,
      byAct: {} as Record<ActType, number>
    }

    decisions.forEach(decision => {
      // Count executed vs pending
      if (decision.userChoice && decision.generatedChanges) {
        stats.executed++
      } else {
        stats.pending++
      }

      // Count by act
      stats.byAct[decision.act] = (stats.byAct[decision.act] || 0) + 1
    })

    return stats
  }

  /**
   * Rollback a decision (soft delete by versioning)
   */
  async rollback(decisionId: string): Promise<RevisionDecision> {
    try {
      return await prisma.revisionDecision.update({
        where: { id: decisionId },
        data: {
          userChoice: null,
          generatedChanges: Prisma.JsonNull,
          updatedAt: new Date()
        }
      })
    } catch (error) {
      return this.handleError(error)
    }
  }

  /**
   * Delete a decision permanently
   */
  async delete(decisionId: string): Promise<RevisionDecision> {
    try {
      return await prisma.revisionDecision.delete({
        where: { id: decisionId }
      })
    } catch (error) {
      return this.handleError(error)
    }
  }

  /**
   * Check if decision exists
   */
  async exists(decisionId: string): Promise<boolean> {
    const count = await prisma.revisionDecision.count({
      where: { id: decisionId }
    })
    return count > 0
  }
}

export const revisionDecisionService = new RevisionDecisionService()
