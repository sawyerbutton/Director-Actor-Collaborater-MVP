import { EventEmitter } from 'events';
import { AgentMessage, MessageType, AgentRole, CollaborationSession } from './collaboration-framework';
import { writeFile, appendFile } from 'fs/promises';
import path from 'path';

export interface CollaborationMetrics {
  sessionId: string;
  startTime: string;
  endTime?: string;
  messageCount: number;
  averageResponseTime: number;
  errorRate: number;
  successRate: number;
  agentPerformance: Map<AgentRole, AgentMetrics>;
}

interface AgentMetrics {
  role: AgentRole;
  messagesReceived: number;
  messagesSent: number;
  averageProcessingTime: number;
  errorCount: number;
  successCount: number;
}

interface LogEntry {
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  sessionId?: string;
  agentRole?: AgentRole;
  messageType?: MessageType;
  message: string;
  data?: unknown;
}

export class CollaborationMonitor extends EventEmitter {
  private metrics: Map<string, CollaborationMetrics> = new Map();
  private messageTrace: Map<string, AgentMessage[]> = new Map();
  private performanceData: Map<string, { start: number; end?: number }> = new Map();
  private logBuffer: LogEntry[] = [];
  private logFilePath: string;
  private enableFileLogging: boolean;
  private maxLogBufferSize = 1000;
  private flushInterval: NodeJS.Timeout | null = null;

  constructor(
    logDir: string = '.ai/collaboration-logs',
    enableFileLogging: boolean = true
  ) {
    super();
    this.enableFileLogging = enableFileLogging;
    this.logFilePath = path.join(logDir, `collaboration-${Date.now()}.log`);
    
    if (enableFileLogging) {
      this.startFlushInterval();
    }
  }

  startSession(sessionId: string, agents: AgentRole[]): void {
    const metrics: CollaborationMetrics = {
      sessionId,
      startTime: new Date().toISOString(),
      messageCount: 0,
      averageResponseTime: 0,
      errorRate: 0,
      successRate: 0,
      agentPerformance: new Map()
    };

    agents.forEach(role => {
      metrics.agentPerformance.set(role, {
        role,
        messagesReceived: 0,
        messagesSent: 0,
        averageProcessingTime: 0,
        errorCount: 0,
        successCount: 0
      });
    });

    this.metrics.set(sessionId, metrics);
    this.messageTrace.set(sessionId, []);
    
    this.log('info', 'Session started', { sessionId, agents });
  }

  recordMessage(message: AgentMessage): void {
    const metrics = this.metrics.get(message.sessionId);
    if (!metrics) return;

    metrics.messageCount++;
    
    const trace = this.messageTrace.get(message.sessionId);
    if (trace) {
      trace.push(message);
    }

    const fromAgent = metrics.agentPerformance.get(message.from);
    if (fromAgent) {
      fromAgent.messagesSent++;
    }

    if (message.to !== 'broadcast') {
      const toAgent = metrics.agentPerformance.get(message.to as AgentRole);
      if (toAgent) {
        toAgent.messagesReceived++;
      }
    }

    this.performanceData.set(message.id, { start: Date.now() });

    this.log('debug', 'Message recorded', {
      sessionId: message.sessionId,
      messageId: message.id,
      type: message.type,
      from: message.from,
      to: message.to
    });
  }

  recordMessageCompletion(messageId: string, success: boolean): void {
    const perfData = this.performanceData.get(messageId);
    if (!perfData) return;

    perfData.end = Date.now();
    const processingTime = perfData.end - perfData.start;

    const message = this.findMessageById(messageId);
    if (!message) return;

    const metrics = this.metrics.get(message.sessionId);
    if (!metrics) return;

    const agent = metrics.agentPerformance.get(message.from);
    if (agent) {
      if (success) {
        agent.successCount++;
      } else {
        agent.errorCount++;
      }

      const totalTime = agent.averageProcessingTime * (agent.messagesSent - 1) + processingTime;
      agent.averageProcessingTime = totalTime / agent.messagesSent;
    }

    this.updateSessionMetrics(message.sessionId);
  }

  endSession(sessionId: string): void {
    const metrics = this.metrics.get(sessionId);
    if (!metrics) return;

    metrics.endTime = new Date().toISOString();
    this.updateSessionMetrics(sessionId);
    
    this.log('info', 'Session ended', {
      sessionId,
      duration: this.calculateDuration(metrics.startTime, metrics.endTime),
      totalMessages: metrics.messageCount,
      successRate: metrics.successRate
    });

    this.emit('session_completed', metrics);
  }

  private updateSessionMetrics(sessionId: string): void {
    const metrics = this.metrics.get(sessionId);
    if (!metrics) return;

    let totalSuccess = 0;
    let totalErrors = 0;
    let totalProcessingTime = 0;
    let agentCount = 0;

    metrics.agentPerformance.forEach(agent => {
      totalSuccess += agent.successCount;
      totalErrors += agent.errorCount;
      totalProcessingTime += agent.averageProcessingTime;
      agentCount++;
    });

    const totalOperations = totalSuccess + totalErrors;
    metrics.successRate = totalOperations > 0 ? totalSuccess / totalOperations : 0;
    metrics.errorRate = totalOperations > 0 ? totalErrors / totalOperations : 0;
    metrics.averageResponseTime = agentCount > 0 ? totalProcessingTime / agentCount : 0;
  }

  getSessionMetrics(sessionId: string): CollaborationMetrics | null {
    return this.metrics.get(sessionId) || null;
  }

  getMessageTrace(sessionId: string): AgentMessage[] {
    return this.messageTrace.get(sessionId) || [];
  }

  identifyBottlenecks(sessionId: string): {
    agent: AgentRole;
    issue: string;
    severity: 'low' | 'medium' | 'high';
  }[] {
    const metrics = this.metrics.get(sessionId);
    if (!metrics) return [];

    const bottlenecks: {
      agent: AgentRole;
      issue: string;
      severity: 'low' | 'medium' | 'high';
    }[] = [];

    metrics.agentPerformance.forEach((agent, role) => {
      if (agent.averageProcessingTime > 5000) {
        bottlenecks.push({
          agent: role,
          issue: `High processing time: ${agent.averageProcessingTime}ms average`,
          severity: 'high'
        });
      }

      const errorRate = agent.errorCount / (agent.successCount + agent.errorCount);
      if (errorRate > 0.2) {
        bottlenecks.push({
          agent: role,
          issue: `High error rate: ${(errorRate * 100).toFixed(1)}%`,
          severity: errorRate > 0.5 ? 'high' : 'medium'
        });
      }

      if (agent.messagesReceived > agent.messagesSent * 3) {
        bottlenecks.push({
          agent: role,
          issue: 'Potential message backlog',
          severity: 'medium'
        });
      }
    });

    return bottlenecks;
  }

  generateReport(sessionId: string): string {
    const metrics = this.metrics.get(sessionId);
    if (!metrics) return 'No metrics available for this session';

    const bottlenecks = this.identifyBottlenecks(sessionId);
    
    let report = `# Collaboration Session Report\n\n`;
    report += `## Session: ${sessionId}\n`;
    report += `- Start Time: ${metrics.startTime}\n`;
    report += `- End Time: ${metrics.endTime || 'Active'}\n`;
    report += `- Duration: ${this.calculateDuration(metrics.startTime, metrics.endTime)}\n`;
    report += `- Total Messages: ${metrics.messageCount}\n`;
    report += `- Success Rate: ${(metrics.successRate * 100).toFixed(1)}%\n`;
    report += `- Average Response Time: ${metrics.averageResponseTime.toFixed(0)}ms\n\n`;

    report += `## Agent Performance\n\n`;
    metrics.agentPerformance.forEach(agent => {
      report += `### ${agent.role}\n`;
      report += `- Messages Sent: ${agent.messagesSent}\n`;
      report += `- Messages Received: ${agent.messagesReceived}\n`;
      report += `- Success Count: ${agent.successCount}\n`;
      report += `- Error Count: ${agent.errorCount}\n`;
      report += `- Avg Processing Time: ${agent.averageProcessingTime.toFixed(0)}ms\n\n`;
    });

    if (bottlenecks.length > 0) {
      report += `## Identified Bottlenecks\n\n`;
      bottlenecks.forEach(b => {
        report += `- **${b.agent}** (${b.severity}): ${b.issue}\n`;
      });
    }

    return report;
  }

  private log(
    level: LogEntry['level'],
    message: string,
    data?: unknown
  ): void {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      data
    };

    this.logBuffer.push(entry);
    this.emit('log', entry);

    if (this.logBuffer.length >= this.maxLogBufferSize) {
      this.flushLogs();
    }
  }

  private async flushLogs(): Promise<void> {
    if (!this.enableFileLogging || this.logBuffer.length === 0) return;

    const logsToFlush = [...this.logBuffer];
    this.logBuffer = [];

    try {
      const logContent = logsToFlush
        .map(entry => JSON.stringify(entry))
        .join('\n') + '\n';
      
      await appendFile(this.logFilePath, logContent);
    } catch (error) {
      console.error('Failed to flush logs:', error);
      this.logBuffer.unshift(...logsToFlush.slice(0, 100));
    }
  }

  private startFlushInterval(): void {
    this.flushInterval = setInterval(() => {
      this.flushLogs();
    }, 5000);
  }

  private findMessageById(messageId: string): AgentMessage | null {
    for (const trace of Array.from(this.messageTrace.values())) {
      const message = trace.find((m: AgentMessage) => m.id === messageId);
      if (message) return message;
    }
    return null;
  }

  private calculateDuration(start: string, end?: string): string {
    const startTime = new Date(start).getTime();
    const endTime = end ? new Date(end).getTime() : Date.now();
    const duration = endTime - startTime;

    const seconds = Math.floor(duration / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  }

  async exportMetrics(sessionId: string, filepath: string): Promise<void> {
    const metrics = this.metrics.get(sessionId);
    const trace = this.messageTrace.get(sessionId);
    
    if (!metrics) {
      throw new Error(`No metrics found for session ${sessionId}`);
    }

    const exportData = {
      metrics,
      trace,
      report: this.generateReport(sessionId),
      bottlenecks: this.identifyBottlenecks(sessionId)
    };

    await writeFile(filepath, JSON.stringify(exportData, null, 2));
  }

  cleanup(): void {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
      this.flushInterval = null;
    }
    
    this.flushLogs();
    
    const oldSessions = Array.from(this.metrics.entries())
      .filter(([_, m]) => {
        if (!m.endTime) return false;
        const endTime = new Date(m.endTime).getTime();
        return Date.now() - endTime > 3600000;
      });
    
    oldSessions.forEach(([sessionId]) => {
      this.metrics.delete(sessionId);
      this.messageTrace.delete(sessionId);
    });
  }
}