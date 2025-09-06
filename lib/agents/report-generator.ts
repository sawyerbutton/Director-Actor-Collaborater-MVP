import {
  ConsistencyAnalysisResult,
  AnalysisReport,
  LogicError,
  LogicErrorType,
  ErrorSeverity
} from '@/types/analysis';
import { REPORT_CONFIG } from './constants';

export class ReportGenerator {
  private result: ConsistencyAnalysisResult;

  constructor(result: ConsistencyAnalysisResult) {
    this.result = result;
  }

  generateFullReport(): AnalysisReport {
    return {
      summary: this.generateSummary(),
      detailedAnalysis: this.result,
      recommendations: this.generateRecommendations(),
      confidence: this.calculateConfidence()
    };
  }

  generateMarkdownReport(): string {
    const report = this.generateFullReport();
    const sections: string[] = [];

    sections.push('# Script Consistency Analysis Report');
    sections.push(`\n## Summary`);
    sections.push(`- **Overall Consistency**: ${report.summary.overallConsistency.toUpperCase()}`);
    sections.push(`- **Total Issues Found**: ${report.summary.totalIssues}`);
    sections.push(`- **Critical Issues**: ${report.summary.criticalIssues}`);
    sections.push(`- **Confidence Score**: ${(report.confidence * 100).toFixed(1)}%`);
    sections.push(`- **Analysis Time**: ${report.detailedAnalysis.analysisMetadata.processingTime}ms`);

    if (report.summary.primaryConcerns.length > 0) {
      sections.push(`\n### Primary Concerns`);
      report.summary.primaryConcerns.forEach(concern => {
        sections.push(`- ${concern}`);
      });
    }

    sections.push(`\n## Error Distribution`);
    sections.push(this.generateDistributionTable());

    sections.push(`\n## Detailed Findings`);
    const errorsBySeverity = this.groupErrorsBySeverity();
    
    (['critical', 'high', 'medium', 'low'] as ErrorSeverity[]).forEach(severity => {
      const errors = errorsBySeverity[severity];
      if (errors && errors.length > 0) {
        sections.push(`\n### ${this.formatSeverity(severity)} Issues (${errors.length})`);
        errors.forEach((error, index) => {
          sections.push(this.formatError(error, index + 1));
        });
      }
    });

    if (report.recommendations.length > 0) {
      sections.push(`\n## Recommendations`);
      report.recommendations.forEach((rec, index) => {
        sections.push(`${index + 1}. ${rec}`);
      });
    }

    sections.push(`\n## Metadata`);
    sections.push(`- Script ID: ${report.detailedAnalysis.scriptId}`);
    sections.push(`- Analyzed At: ${report.detailedAnalysis.analyzedAt.toISOString()}`);
    sections.push(`- Model Used: ${report.detailedAnalysis.analysisMetadata.modelUsed}`);
    if (report.detailedAnalysis.analysisMetadata.tokensUsed) {
      sections.push(`- Tokens Used: ${report.detailedAnalysis.analysisMetadata.tokensUsed}`);
    }

    return sections.join('\n');
  }

  generateJSONReport(): string {
    return JSON.stringify(this.generateFullReport(), null, 2);
  }

  generateHTMLReport(): string {
    const report = this.generateFullReport();
    
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Script Consistency Analysis Report</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 1200px; margin: 0 auto; padding: 20px; }
        h1 { color: #2c3e50; border-bottom: 3px solid #3498db; padding-bottom: 10px; }
        h2 { color: #34495e; margin-top: 30px; }
        h3 { color: #7f8c8d; }
        .summary { background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .summary-stat { display: inline-block; margin: 10px 20px 10px 0; }
        .summary-label { font-weight: bold; color: #7f8c8d; }
        .summary-value { font-size: 1.2em; color: #2c3e50; }
        .overall-excellent { color: #27ae60; }
        .overall-good { color: #3498db; }
        .overall-fair { color: #f39c12; }
        .overall-poor { color: #e74c3c; }
        .error { background: #fff; border-left: 4px solid; padding: 15px; margin: 15px 0; border-radius: 4px; }
        .error-critical { border-color: #e74c3c; background: #fee; }
        .error-high { border-color: #f39c12; background: #fff9e6; }
        .error-medium { border-color: #3498db; background: #e6f3ff; }
        .error-low { border-color: #95a5a6; background: #f8f9fa; }
        .error-header { display: flex; justify-content: space-between; margin-bottom: 10px; }
        .error-type { font-weight: bold; color: #2c3e50; }
        .error-severity { padding: 2px 8px; border-radius: 4px; color: white; font-size: 0.85em; }
        .severity-critical { background: #e74c3c; }
        .severity-high { background: #f39c12; }
        .severity-medium { background: #3498db; }
        .severity-low { background: #95a5a6; }
        .error-location { color: #7f8c8d; font-size: 0.9em; margin: 5px 0; }
        .error-description { margin: 10px 0; }
        .error-suggestion { color: #27ae60; font-style: italic; margin-top: 10px; }
        .recommendations { background: #e8f5e9; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .recommendation { margin: 10px 0; padding-left: 20px; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }
        th { background: #f8f9fa; font-weight: bold; }
        .confidence-bar { background: #e0e0e0; height: 20px; border-radius: 10px; overflow: hidden; }
        .confidence-fill { background: #3498db; height: 100%; transition: width 0.3s; }
    </style>
</head>
<body>
    <h1>Script Consistency Analysis Report</h1>
    
    <div class="summary">
        <div class="summary-stat">
            <span class="summary-label">Overall Consistency:</span>
            <span class="summary-value overall-${report.summary.overallConsistency}">${report.summary.overallConsistency.toUpperCase()}</span>
        </div>
        <div class="summary-stat">
            <span class="summary-label">Total Issues:</span>
            <span class="summary-value">${report.summary.totalIssues}</span>
        </div>
        <div class="summary-stat">
            <span class="summary-label">Critical Issues:</span>
            <span class="summary-value">${report.summary.criticalIssues}</span>
        </div>
        <div class="summary-stat">
            <span class="summary-label">Confidence:</span>
            <span class="summary-value">${(report.confidence * 100).toFixed(1)}%</span>
        </div>
        <div class="confidence-bar">
            <div class="confidence-fill" style="width: ${report.confidence * 100}%"></div>
        </div>
    </div>

    ${report.summary.primaryConcerns.length > 0 ? `
    <h2>Primary Concerns</h2>
    <ul>
        ${report.summary.primaryConcerns.map(concern => `<li>${concern}</li>`).join('')}
    </ul>
    ` : ''}

    <h2>Error Distribution</h2>
    ${this.generateHTMLDistributionTable()}

    <h2>Detailed Findings</h2>
    ${this.generateHTMLErrors()}

    ${report.recommendations.length > 0 ? `
    <div class="recommendations">
        <h2>Recommendations</h2>
        ${report.recommendations.map((rec, i) => `<div class="recommendation">${i + 1}. ${rec}</div>`).join('')}
    </div>
    ` : ''}

    <h2>Analysis Metadata</h2>
    <table>
        <tr><th>Property</th><th>Value</th></tr>
        <tr><td>Script ID</td><td>${report.detailedAnalysis.scriptId}</td></tr>
        <tr><td>Analyzed At</td><td>${new Date(report.detailedAnalysis.analyzedAt).toLocaleString()}</td></tr>
        <tr><td>Processing Time</td><td>${report.detailedAnalysis.analysisMetadata.processingTime}ms</td></tr>
        <tr><td>Model Used</td><td>${report.detailedAnalysis.analysisMetadata.modelUsed}</td></tr>
        ${report.detailedAnalysis.analysisMetadata.tokensUsed ? 
          `<tr><td>Tokens Used</td><td>${report.detailedAnalysis.analysisMetadata.tokensUsed}</td></tr>` : ''}
    </table>
</body>
</html>`;
  }

  private generateSummary() {
    const criticalCount = this.result.errorsBySeverity['critical'] || 0;
    const highCount = this.result.errorsBySeverity['high'] || 0;
    
    let overallConsistency: 'excellent' | 'good' | 'fair' | 'poor';
    if (this.result.totalErrors === 0) {
      overallConsistency = 'excellent';
    } else if (criticalCount === 0 && highCount <= 2) {
      overallConsistency = 'good';
    } else if (criticalCount <= 1 && highCount <= 5) {
      overallConsistency = 'fair';
    } else {
      overallConsistency = 'poor';
    }

    return {
      overallConsistency,
      criticalIssues: criticalCount,
      totalIssues: this.result.totalErrors,
      primaryConcerns: this.identifyPrimaryConcerns()
    };
  }

  private identifyPrimaryConcerns(): string[] {
    const concerns: string[] = [];
    
    const criticalCount = this.result.errorsBySeverity[ErrorSeverity.CRITICAL] || 0;
    if (criticalCount > 0) {
      concerns.push(`${criticalCount} critical issue${criticalCount > 1 ? 's' : ''} requiring immediate attention`);
    }

    const sortedErrorTypes = Object.entries(this.result.errorsByType)
      .sort(([, a], [, b]) => b - a)
      .filter(([, count]) => count > 0);

    sortedErrorTypes.slice(0, 2).forEach(([type, count]) => {
      const percentage = (count / this.result.totalErrors) * 100;
      if (percentage > 25) {
        concerns.push(`High concentration of ${this.formatErrorType(type as LogicErrorType)} errors (${count} issues, ${percentage.toFixed(0)}%)`);
      }
    });

    return concerns.slice(0, 3);
  }

  private generateRecommendations(): string[] {
    const recommendations: string[] = [];
    
    if (this.result.errorsBySeverity['critical'] > 0) {
      recommendations.push('Priority 1: Address all critical errors immediately - these break fundamental story logic');
    }

    if (this.result.errorsBySeverity['high'] > 3) {
      recommendations.push('Priority 2: Review and fix high-severity issues that disrupt audience understanding');
    }

    const dominantErrorType = this.findDominantErrorType();
    if (dominantErrorType) {
      const typeRecommendations: Record<LogicErrorType, string> = {
        'timeline': 'Create a detailed timeline document mapping all temporal references and events',
        'character': 'Develop comprehensive character bibles tracking traits, knowledge, and relationships',
        'plot': 'Review plot structure ensuring all setups have payoffs and causal chains are clear',
        'dialogue': 'Conduct dialogue passes to ensure natural conversation flow and answered questions',
        'scene': 'Map location geography and verify all scene transitions are logically possible'
      };
      recommendations.push(typeRecommendations[dominantErrorType]);
    }

    if (this.result.totalErrors > 15) {
      recommendations.push('Consider a comprehensive script review session focusing on internal consistency');
    }

    if (this.result.totalErrors > 0 && this.result.totalErrors <= 5) {
      recommendations.push('Script is nearly ready - address the few remaining issues for a polished final version');
    }

    return recommendations;
  }

  private calculateConfidence(): number {
    let confidence = 0.75;
    
    if (this.result.analysisMetadata.tokensUsed && this.result.analysisMetadata.tokensUsed > 2000) {
      confidence += 0.10;
    }
    
    if (this.result.errors.every(e => e.context || e.suggestion)) {
      confidence += 0.10;
    }
    
    if (this.result.analysisMetadata.processingTime < 8000) {
      confidence += 0.05;
    }
    
    return Math.min(confidence, 1.0);
  }

  private groupErrorsBySeverity(): Record<ErrorSeverity, LogicError[]> {
    const grouped: Record<ErrorSeverity, LogicError[]> = {
      'critical': [],
      'high': [],
      'medium': [],
      'low': []
    };
    
    this.result.errors.forEach(error => {
      grouped[error.severity].push(error);
    });
    
    return grouped;
  }

  private findDominantErrorType(): LogicErrorType | null {
    let maxCount = 0;
    let dominantType: LogicErrorType | null = null;
    
    Object.entries(this.result.errorsByType).forEach(([type, count]) => {
      if (count > maxCount && count >= this.result.totalErrors * REPORT_CONFIG.DOMINANT_ERROR_THRESHOLD) {
        maxCount = count;
        dominantType = type as LogicErrorType;
      }
    });
    
    return dominantType;
  }

  private generateDistributionTable(): string {
    const rows: string[] = [];
    rows.push('| Error Type | Count | Percentage |');
    rows.push('|------------|-------|------------|');
    
    Object.entries(this.result.errorsByType).forEach(([type, count]) => {
      const percentage = this.result.totalErrors > 0 
        ? ((count / this.result.totalErrors) * 100).toFixed(1)
        : '0.0';
      rows.push(`| ${this.formatErrorType(type as LogicErrorType)} | ${count} | ${percentage}% |`);
    });
    
    rows.push('');
    rows.push('| Severity | Count | Percentage |');
    rows.push('|----------|-------|------------|');
    
    Object.entries(this.result.errorsBySeverity).forEach(([severity, count]) => {
      const percentage = this.result.totalErrors > 0
        ? ((count / this.result.totalErrors) * 100).toFixed(1)
        : '0.0';
      rows.push(`| ${this.formatSeverity(severity as ErrorSeverity)} | ${count} | ${percentage}% |`);
    });
    
    return rows.join('\n');
  }

  private generateHTMLDistributionTable(): string {
    let html = '<table><thead><tr><th>Error Type</th><th>Count</th><th>Percentage</th></tr></thead><tbody>';
    
    Object.entries(this.result.errorsByType).forEach(([type, count]) => {
      const percentage = this.result.totalErrors > 0
        ? ((count / this.result.totalErrors) * 100).toFixed(1)
        : '0.0';
      html += `<tr><td>${this.formatErrorType(type as LogicErrorType)}</td><td>${count}</td><td>${percentage}%</td></tr>`;
    });
    
    html += '</tbody></table>';
    
    html += '<table><thead><tr><th>Severity</th><th>Count</th><th>Percentage</th></tr></thead><tbody>';
    
    Object.entries(this.result.errorsBySeverity).forEach(([severity, count]) => {
      const percentage = this.result.totalErrors > 0
        ? ((count / this.result.totalErrors) * 100).toFixed(1)
        : '0.0';
      html += `<tr><td>${this.formatSeverity(severity as ErrorSeverity)}</td><td>${count}</td><td>${percentage}%</td></tr>`;
    });
    
    html += '</tbody></table>';
    
    return html;
  }

  private generateHTMLErrors(): string {
    const errorsBySeverity = this.groupErrorsBySeverity();
    let html = '';
    
    (['critical', 'high', 'medium', 'low'] as ErrorSeverity[]).forEach(severity => {
      const errors = errorsBySeverity[severity];
      if (errors && errors.length > 0) {
        html += `<h3>${this.formatSeverity(severity)} Issues (${errors.length})</h3>`;
        errors.forEach(error => {
          html += this.formatHTMLError(error);
        });
      }
    });
    
    return html;
  }

  private formatError(error: LogicError, index: number): string {
    const lines: string[] = [];
    lines.push(`\n#### ${index}. ${this.formatErrorType(error.type)} Error`);
    lines.push(`- **Severity**: ${this.formatSeverity(error.severity)}`);
    lines.push(`- **Location**: ${this.formatLocation(error.location)}`);
    lines.push(`- **Description**: ${error.description}`);
    
    if (error.suggestion) {
      lines.push(`- **Suggestion**: ${error.suggestion}`);
    }
    
    if (error.context) {
      lines.push(`- **Context**: \`${error.context}\``);
    }
    
    if (error.relatedElements && error.relatedElements.length > 0) {
      lines.push(`- **Related Elements**: ${error.relatedElements.join(', ')}`);
    }
    
    return lines.join('\n');
  }

  private formatHTMLError(error: LogicError): string {
    return `
    <div class="error error-${error.severity}">
        <div class="error-header">
            <span class="error-type">${this.formatErrorType(error.type)}</span>
            <span class="error-severity severity-${error.severity}">${this.formatSeverity(error.severity)}</span>
        </div>
        <div class="error-location">${this.formatLocation(error.location)}</div>
        <div class="error-description">${error.description}</div>
        ${error.suggestion ? `<div class="error-suggestion">💡 ${error.suggestion}</div>` : ''}
        ${error.context ? `<div class="error-context"><em>${error.context}</em></div>` : ''}
    </div>`;
  }

  private formatErrorType(type: LogicErrorType): string {
    const formatted: Record<LogicErrorType, string> = {
      'timeline': 'Timeline',
      'character': 'Character',
      'plot': 'Plot',
      'dialogue': 'Dialogue',
      'scene': 'Scene'
    };
    return formatted[type] || type;
  }

  private formatSeverity(severity: ErrorSeverity): string {
    return severity.charAt(0).toUpperCase() + severity.slice(1);
  }

  private formatLocation(location: any): string {
    const parts: string[] = [];
    
    if (location.sceneNumber !== undefined) {
      parts.push(`Scene ${location.sceneNumber}`);
    }
    if (location.characterName) {
      parts.push(`Character: ${location.characterName}`);
    }
    if (location.dialogueIndex !== undefined) {
      parts.push(`Dialogue #${location.dialogueIndex + 1}`);
    }
    if (location.timeReference) {
      parts.push(`Time: ${location.timeReference}`);
    }
    
    return parts.length > 0 ? parts.join(', ') : 'General';
  }
}