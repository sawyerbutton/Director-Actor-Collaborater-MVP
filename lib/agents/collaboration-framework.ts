import { EventEmitter } from 'events';
import { LogicError } from '@/types/analysis';
import { RevisionSuggestion } from '@/types/revision';

export enum MessageType {
  ERROR_DETECTED = 'error_detected',
  SUGGESTION_GENERATED = 'suggestion_generated',
  ANALYSIS_REQUEST = 'analysis_request',
  ANALYSIS_RESPONSE = 'analysis_response',
  VALIDATION_REQUEST = 'validation_request',
  VALIDATION_RESPONSE = 'validation_response',
  COLLABORATION_START = 'collaboration_start',
  COLLABORATION_END = 'collaboration_end'
}

export enum AgentRole {
  CONSISTENCY_GUARDIAN = 'consistency_guardian',
  REVISION_EXECUTIVE = 'revision_executive',
  INCREMENTAL_ANALYZER = 'incremental_analyzer',
  VALIDATOR = 'validator'
}

export interface AgentMessage {
  id: string;
  type: MessageType;
  from: AgentRole;
  to: AgentRole | 'broadcast';
  payload: unknown;
  timestamp: string;
  sessionId: string;
  correlationId?: string;
  replyTo?: string;
}

export interface AgentRegistration {
  role: AgentRole;
  name: string;
  capabilities: string[];
  status: 'active' | 'inactive' | 'busy';
  instance: any;
  registeredAt: string;
}

export interface CollaborationSession {
  id: string;
  startedAt: string;
  endedAt?: string;
  agents: AgentRole[];
  messageCount: number;
  status: 'active' | 'completed' | 'failed' | 'timeout';
  context: Map<string, unknown>;
  metrics: SessionMetrics;
}

interface SessionMetrics {
  totalMessages: number;
  averageResponseTime: number;
  errorCount: number;
  successRate: number;
}

interface MessageQueue {
  pending: AgentMessage[];
  processing: AgentMessage[];
  processed: AgentMessage[];
  failed: AgentMessage[];
  deadLetter: Array<{
    message: AgentMessage;
    failureCount: number;
    lastError: string;
    failedAt: string;
  }>;
}

export class CollaborationFramework extends EventEmitter {
  private agents: Map<AgentRole, AgentRegistration>;
  private sessions: Map<string, CollaborationSession>;
  private messageQueue: MessageQueue;
  private eventBus: EventEmitter;
  private readonly SESSION_TIMEOUT = 30000;
  private readonly MAX_RETRIES = 3;
  private readonly QUEUE_PROCESS_INTERVAL = 100;
  private readonly MAX_PROCESSED_MESSAGES = 1000;
  private readonly MAX_DEAD_LETTER_SIZE = 100;
  private readonly CLEANUP_INTERVAL = 60000; // 1 minute
  private queueProcessor: NodeJS.Timeout | null = null;
  private cleanupTimer: NodeJS.Timeout | null = null;

  constructor() {
    super();
    this.agents = new Map();
    this.sessions = new Map();
    this.messageQueue = {
      pending: [],
      processing: [],
      processed: [],
      failed: [],
      deadLetter: []
    };
    this.eventBus = new EventEmitter();
    this.setupEventHandlers();
    this.startMemoryCleanup();
  }

  private setupEventHandlers(): void {
    this.eventBus.on('message', (message: AgentMessage) => {
      this.handleMessage(message);
    });

    this.eventBus.on('session_timeout', (sessionId: string) => {
      this.handleSessionTimeout(sessionId);
    });
  }

  registerAgent(
    role: AgentRole,
    name: string,
    instance: any,
    capabilities: string[] = []
  ): void {
    if (this.agents.has(role)) {
      console.warn(`Agent with role ${role} already registered. Updating registration.`);
    }

    const registration: AgentRegistration = {
      role,
      name,
      capabilities,
      status: 'active',
      instance,
      registeredAt: new Date().toISOString()
    };

    this.agents.set(role, registration);
    this.emit('agent_registered', registration);
  }

  unregisterAgent(role: AgentRole): void {
    if (!this.agents.has(role)) {
      console.warn(`No agent with role ${role} found`);
      return;
    }

    const agent = this.agents.get(role);
    this.agents.delete(role);
    this.emit('agent_unregistered', agent);
  }

  discoverAgents(capability?: string): AgentRegistration[] {
    const agents = Array.from(this.agents.values());
    
    if (capability) {
      return agents.filter(agent => 
        agent.capabilities.includes(capability) && agent.status === 'active'
      );
    }
    
    return agents.filter(agent => agent.status === 'active');
  }

  async createSession(agents: AgentRole[], context?: Map<string, unknown>): Promise<string> {
    const sessionId = this.generateSessionId();
    
    const session: CollaborationSession = {
      id: sessionId,
      startedAt: new Date().toISOString(),
      agents,
      messageCount: 0,
      status: 'active',
      context: context || new Map(),
      metrics: {
        totalMessages: 0,
        averageResponseTime: 0,
        errorCount: 0,
        successRate: 0
      }
    };

    this.sessions.set(sessionId, session);
    
    setTimeout(() => {
      if (this.sessions.has(sessionId) && this.sessions.get(sessionId)?.status === 'active') {
        this.eventBus.emit('session_timeout', sessionId);
      }
    }, this.SESSION_TIMEOUT);

    const startMessage = {
      id: this.generateMessageId(),
      type: MessageType.COLLABORATION_START,
      from: AgentRole.CONSISTENCY_GUARDIAN,
      to: 'broadcast' as const,
      payload: { sessionId, agents },
      timestamp: new Date().toISOString(),
      sessionId
    };

    // Add to processed queue to ensure history tracking
    this.messageQueue.processed.push(startMessage);
    session.metrics.totalMessages++;

    this.broadcastMessage(startMessage);

    return sessionId;
  }

  async sendMessage(message: Omit<AgentMessage, 'id' | 'timestamp'>): Promise<void> {
    const fullMessage: AgentMessage = {
      ...message,
      id: this.generateMessageId(),
      timestamp: new Date().toISOString()
    };

    this.messageQueue.pending.push(fullMessage);
    
    if (!this.queueProcessor) {
      this.startQueueProcessor();
    }

    const session = this.sessions.get(message.sessionId);
    if (session) {
      session.messageCount++;
      session.metrics.totalMessages++;
    }
    
    // Emit event for new message
    this.emit('message_queued', fullMessage);
    
    // Process immediately if possible
    await this.processMessageQueue();
  }

  private broadcastMessage(message: AgentMessage): void {
    const activeAgents = this.discoverAgents();
    
    activeAgents.forEach(agent => {
      if (agent.role !== message.from) {
        this.deliverMessage(message, agent);
      }
    });
  }

  private async deliverMessage(message: AgentMessage, agent: AgentRegistration): Promise<void> {
    try {
      if (agent.status !== 'active') {
        throw new Error(`Agent ${agent.role} is not active`);
      }

      agent.status = 'busy';
      
      if (agent.instance && typeof agent.instance.handleMessage === 'function') {
        await agent.instance.handleMessage(message);
      }
      
      agent.status = 'active';
      
      this.emit('message_delivered', { message, agent: agent.role });
    } catch (error) {
      agent.status = 'active';
      this.emit('message_failed', { message, agent: agent.role, error });
      throw error;
    }
  }

  private async handleMessage(message: AgentMessage): Promise<void> {
    try {
      if (message.to === 'broadcast') {
        this.broadcastMessage(message);
      } else {
        const targetAgent = this.agents.get(message.to as AgentRole);
        if (targetAgent) {
          await this.deliverMessage(message, targetAgent);
        } else {
          throw new Error(`Target agent ${message.to} not found`);
        }
      }
      
      this.messageQueue.processed.push(message);
    } catch (error) {
      console.error('Failed to handle message:', error);
      this.messageQueue.failed.push(message);
    }
  }

  private startQueueProcessor(): void {
    this.queueProcessor = setInterval(() => {
      this.processMessageQueue();
    }, this.QUEUE_PROCESS_INTERVAL);
  }

  private async processMessageQueue(): Promise<void> {
    if (this.messageQueue.pending.length === 0) {
      if (this.queueProcessor) {
        clearInterval(this.queueProcessor);
        this.queueProcessor = null;
      }
      return;
    }

    const message = this.messageQueue.pending.shift();
    if (!message) return;

    this.messageQueue.processing.push(message);
    
    try {
      await this.handleMessage(message);
      this.messageQueue.processing = this.messageQueue.processing.filter(m => m.id !== message.id);
    } catch (error) {
      this.messageQueue.processing = this.messageQueue.processing.filter(m => m.id !== message.id);
      
      interface RetryableMessage extends AgentMessage {
        retryCount?: number;
      }
      const retryableMsg = message as RetryableMessage;
      const retryCount = retryableMsg.retryCount || 0;
      if (retryCount < this.MAX_RETRIES) {
        retryableMsg.retryCount = retryCount + 1;
        this.messageQueue.pending.push(message);
      } else {
        // Move to dead letter queue
        this.messageQueue.deadLetter.push({
          message,
          failureCount: retryCount + 1,
          lastError: error instanceof Error ? error.message : String(error),
          failedAt: new Date().toISOString()
        });
        this.messageQueue.failed.push(message);
        
        // Emit event for dead letter
        this.emit('message_dead_lettered', { message, error });
      }
    }
  }

  private handleSessionTimeout(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    session.status = 'timeout';
    session.endedAt = new Date().toISOString();
    
    this.broadcastMessage({
      id: this.generateMessageId(),
      type: MessageType.COLLABORATION_END,
      from: AgentRole.CONSISTENCY_GUARDIAN,
      to: 'broadcast',
      payload: { sessionId, reason: 'timeout' },
      timestamp: new Date().toISOString(),
      sessionId
    });
    
    this.emit('session_timeout', session);
  }

  async endSession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    session.status = 'completed';
    session.endedAt = new Date().toISOString();
    
    const responseTimeTotals = this.messageQueue.processed
      .filter(m => m.sessionId === sessionId && m.replyTo)
      .map(m => {
        const originalMsg = this.messageQueue.processed.find(om => om.id === m.replyTo);
        if (originalMsg) {
          return new Date(m.timestamp).getTime() - new Date(originalMsg.timestamp).getTime();
        }
        return 0;
      })
      .filter(time => time > 0);

    if (responseTimeTotals.length > 0) {
      session.metrics.averageResponseTime = 
        responseTimeTotals.reduce((a, b) => a + b, 0) / responseTimeTotals.length;
    }

    session.metrics.successRate = 
      session.metrics.totalMessages > 0 
        ? (session.metrics.totalMessages - session.metrics.errorCount) / session.metrics.totalMessages 
        : 0;

    this.broadcastMessage({
      id: this.generateMessageId(),
      type: MessageType.COLLABORATION_END,
      from: AgentRole.CONSISTENCY_GUARDIAN,
      to: 'broadcast',
      payload: { sessionId, metrics: session.metrics },
      timestamp: new Date().toISOString(),
      sessionId
    });
  }

  getSessionMetrics(sessionId: string): SessionMetrics | null {
    const session = this.sessions.get(sessionId);
    return session ? session.metrics : null;
  }

  getMessageHistory(sessionId: string): AgentMessage[] {
    return this.messageQueue.processed.filter(m => m.sessionId === sessionId);
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Performs comprehensive cleanup of old data
   */
  cleanupOldSessions(maxAge: number = 3600000): void {
    const now = Date.now();
    
    // Clean old sessions
    for (const [sessionId, session] of Array.from(this.sessions.entries())) {
      const sessionAge = now - new Date(session.startedAt).getTime();
      if (sessionAge > maxAge && session.status !== 'active') {
        this.sessions.delete(sessionId);
        
        // Clean messages for this session
        this.messageQueue.processed = this.messageQueue.processed.filter(
          m => m.sessionId !== sessionId
        );
        this.messageQueue.failed = this.messageQueue.failed.filter(
          m => m.sessionId !== sessionId
        );
      }
    }
    
    // Limit processed messages queue
    if (this.messageQueue.processed.length > this.MAX_PROCESSED_MESSAGES) {
      this.messageQueue.processed = this.messageQueue.processed.slice(-this.MAX_PROCESSED_MESSAGES);
    }
    
    // Limit dead letter queue
    if (this.messageQueue.deadLetter.length > this.MAX_DEAD_LETTER_SIZE) {
      this.messageQueue.deadLetter = this.messageQueue.deadLetter.slice(-this.MAX_DEAD_LETTER_SIZE);
    }
  }
  
  private startMemoryCleanup(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanupOldSessions();
      
      // Emit cleanup event for monitoring
      this.emit('cleanup_performed', {
        sessionCount: this.sessions.size,
        queueStatus: this.getQueueStatus()
      });
    }, this.CLEANUP_INTERVAL);
  }
  
  /**
   * Properly shuts down the framework
   */
  shutdown(): void {
    if (this.queueProcessor) {
      clearInterval(this.queueProcessor);
      this.queueProcessor = null;
    }
    
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    
    // Process remaining messages
    while (this.messageQueue.pending.length > 0) {
      const message = this.messageQueue.pending.shift();
      if (message) {
        this.messageQueue.failed.push(message);
      }
    }
    
    this.removeAllListeners();
    this.eventBus.removeAllListeners();
  }

  getActiveSessionCount(): number {
    return Array.from(this.sessions.values())
      .filter(s => s.status === 'active').length;
  }

  getQueueStatus(): { 
    pending: number; 
    processing: number; 
    processed: number; 
    failed: number;
    deadLetter: number;
  } {
    return {
      pending: this.messageQueue.pending.length,
      processing: this.messageQueue.processing.length,
      processed: this.messageQueue.processed.length,
      failed: this.messageQueue.failed.length,
      deadLetter: this.messageQueue.deadLetter.length
    };
  }
  
  /**
   * Retrieves messages from the dead letter queue
   */
  getDeadLetterQueue(): typeof this.messageQueue.deadLetter {
    return [...this.messageQueue.deadLetter];
  }
  
  /**
   * Attempts to reprocess a message from the dead letter queue
   */
  async reprocessDeadLetter(messageId: string): Promise<boolean> {
    const deadLetterIndex = this.messageQueue.deadLetter.findIndex(
      item => item.message.id === messageId
    );
    
    if (deadLetterIndex === -1) {
      return false;
    }
    
    const [deadLetterItem] = this.messageQueue.deadLetter.splice(deadLetterIndex, 1);
    
    // Reset retry count and requeue
    interface RetryableMessage extends AgentMessage {
      retryCount?: number;
    }
    const retryableMsg = deadLetterItem.message as RetryableMessage;
    delete retryableMsg.retryCount;
    this.messageQueue.pending.push(deadLetterItem.message);
    
    if (!this.queueProcessor) {
      this.startQueueProcessor();
    }
    
    return true;
  }
}

export class CollaborationPipeline {
  private framework: CollaborationFramework;
  
  constructor(framework: CollaborationFramework) {
    this.framework = framework;
  }

  async processErrorsWithSuggestions(
    errors: LogicError[],
    context: Map<string, unknown>
  ): Promise<Map<string, RevisionSuggestion[]>> {
    const sessionId = await this.framework.createSession([
      AgentRole.CONSISTENCY_GUARDIAN,
      AgentRole.REVISION_EXECUTIVE
    ], context);

    const suggestions = new Map<string, RevisionSuggestion[]>();

    try {
      for (const error of errors) {
        await this.framework.sendMessage({
          type: MessageType.ERROR_DETECTED,
          from: AgentRole.CONSISTENCY_GUARDIAN,
          to: AgentRole.REVISION_EXECUTIVE,
          payload: error,
          sessionId
        });

        await new Promise(resolve => setTimeout(resolve, 200));
      }

      // Wait longer to ensure all messages are processed through the queue
      await new Promise(resolve => setTimeout(resolve, 1500));

      const messages = this.framework.getMessageHistory(sessionId);
      const suggestionMessages = messages.filter(
        m => m.type === MessageType.SUGGESTION_GENERATED
      );

      for (const msg of suggestionMessages) {
        const payload = msg.payload as any;
        const errorId = payload.errorId || payload.id;  // Handle both possible formats
        const errorSuggestions = payload.suggestions || [];
        
        if (errorId && errorSuggestions.length > 0) {
          if (!suggestions.has(errorId)) {
            suggestions.set(errorId, []);
          }
          suggestions.get(errorId)!.push(...errorSuggestions);
        }
      }

      await this.framework.endSession(sessionId);
    } catch (error) {
      console.error('Collaboration pipeline error:', error);
      if (this.framework.getSessionMetrics(sessionId)) {
        await this.framework.endSession(sessionId);
      }
    }

    return suggestions;
  }
}