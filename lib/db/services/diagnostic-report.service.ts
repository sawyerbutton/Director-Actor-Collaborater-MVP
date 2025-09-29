import { prisma } from '../client'
import { DiagnosticReport, Prisma } from '@prisma/client'
import { BaseService } from './base.service'

export interface DiagnosticFinding {
  type: 'character' | 'timeline' | 'scene' | 'plot' | 'dialogue'
  severity: 'critical' | 'warning' | 'info'
  location: {
    act?: number
    scene?: number
    line?: number
    character?: string
  }
  description: string
  suggestion?: string
  confidence: number
}

export interface DiagnosticReportData {
  findings: DiagnosticFinding[]
  summary: string
  overallConfidence: number
  metadata?: {
    analysisTime?: number
    modelUsed?: string
    version?: string
  }
}

export class DiagnosticReportService extends BaseService {
  /**
   * Create or update a diagnostic report
   */
  async upsert(
    projectId: string,
    data: DiagnosticReportData
  ): Promise<DiagnosticReport> {
    const confidence = data.overallConfidence

    return await prisma.diagnosticReport.upsert({
      where: { projectId },
      create: {
        projectId,
        findings: data.findings as any,
        summary: data.summary,
        confidence
      },
      update: {
        findings: data.findings as any,
        summary: data.summary,
        confidence,
        updatedAt: new Date()
      }
    })
  }

  /**
   * Get report by project ID
   */
  async getByProjectId(projectId: string): Promise<DiagnosticReport | null> {
    return await prisma.diagnosticReport.findUnique({
      where: { projectId }
    })
  }

  /**
   * Get report with parsed findings
   */
  async getParsedReport(
    projectId: string
  ): Promise<(DiagnosticReport & { parsedFindings: DiagnosticFinding[] }) | null> {
    const report = await this.getByProjectId(projectId)

    if (!report) {
      return null
    }

    return {
      ...report,
      parsedFindings: report.findings as unknown as DiagnosticFinding[]
    }
  }

  /**
   * Get findings by type
   */
  async getFindingsByType(
    projectId: string,
    type: DiagnosticFinding['type']
  ): Promise<DiagnosticFinding[]> {
    const report = await this.getParsedReport(projectId)

    if (!report) {
      return []
    }

    return report.parsedFindings.filter(finding => finding.type === type)
  }

  /**
   * Get findings by severity
   */
  async getFindingsBySeverity(
    projectId: string,
    severity: DiagnosticFinding['severity']
  ): Promise<DiagnosticFinding[]> {
    const report = await this.getParsedReport(projectId)

    if (!report) {
      return []
    }

    return report.parsedFindings.filter(finding => finding.severity === severity)
  }

  /**
   * Get critical findings
   */
  async getCriticalFindings(projectId: string): Promise<DiagnosticFinding[]> {
    return await this.getFindingsBySeverity(projectId, 'critical')
  }

  /**
   * Add a finding to existing report
   */
  async addFinding(
    projectId: string,
    finding: DiagnosticFinding
  ): Promise<DiagnosticReport> {
    const report = await this.getParsedReport(projectId)

    if (!report) {
      throw new Error('Report not found')
    }

    const updatedFindings = [...report.parsedFindings, finding]

    return await prisma.diagnosticReport.update({
      where: { projectId },
      data: {
        findings: updatedFindings as any,
        updatedAt: new Date()
      }
    })
  }

  /**
   * Remove findings by type
   */
  async removeFindingsByType(
    projectId: string,
    type: DiagnosticFinding['type']
  ): Promise<DiagnosticReport> {
    const report = await this.getParsedReport(projectId)

    if (!report) {
      throw new Error('Report not found')
    }

    const updatedFindings = report.parsedFindings.filter(
      finding => finding.type !== type
    )

    return await prisma.diagnosticReport.update({
      where: { projectId },
      data: {
        findings: updatedFindings as any,
        updatedAt: new Date()
      }
    })
  }

  /**
   * Calculate statistics for a report
   */
  async getStatistics(projectId: string): Promise<{
    total: number
    byType: Record<DiagnosticFinding['type'], number>
    bySeverity: Record<DiagnosticFinding['severity'], number>
    averageConfidence: number
  } | null> {
    const report = await this.getParsedReport(projectId)

    if (!report) {
      return null
    }

    const findings = report.parsedFindings

    const byType: Record<string, number> = {}
    const bySeverity: Record<string, number> = {}
    let totalConfidence = 0

    findings.forEach(finding => {
      // Count by type
      byType[finding.type] = (byType[finding.type] || 0) + 1

      // Count by severity
      bySeverity[finding.severity] = (bySeverity[finding.severity] || 0) + 1

      // Sum confidence
      totalConfidence += finding.confidence
    })

    return {
      total: findings.length,
      byType: byType as Record<DiagnosticFinding['type'], number>,
      bySeverity: bySeverity as Record<DiagnosticFinding['severity'], number>,
      averageConfidence: findings.length > 0 ? totalConfidence / findings.length : 0
    }
  }

  /**
   * Delete a report
   */
  async delete(projectId: string): Promise<DiagnosticReport> {
    return await prisma.diagnosticReport.delete({
      where: { projectId }
    })
  }

  /**
   * Check if report exists
   */
  async exists(projectId: string): Promise<boolean> {
    const count = await prisma.diagnosticReport.count({
      where: { projectId }
    })
    return count > 0
  }
}

export const diagnosticReportService = new DiagnosticReportService()