import { 
  CollaborationFramework,
  CollaborationPipeline,
  AgentRole,
  MessageType,
  AgentMessage
} from '@/lib/agents/collaboration-framework';
import { LogicError, LogicErrorType, ErrorSeverity } from '@/types/analysis';

describe('CollaborationFramework', () => {
  let framework: CollaborationFramework;

  beforeEach(() => {
    framework = new CollaborationFramework();
  });

  afterEach(() => {
    framework.removeAllListeners();
  });

  describe('Agent Registration', () => {
    it('should register and discover agents', () => {
      const mockAgent = { handleMessage: jest.fn() };
      
      framework.registerAgent(
        AgentRole.CONSISTENCY_GUARDIAN,
        'TestGuardian',
        mockAgent,
        ['error_detection']
      );

      const agents = framework.discoverAgents();
      expect(agents).toHaveLength(1);
      expect(agents[0].role).toBe(AgentRole.CONSISTENCY_GUARDIAN);
      expect(agents[0].name).toBe('TestGuardian');
      expect(agents[0].capabilities).toContain('error_detection');
    });

    it('should discover agents by capability', () => {
      const agent1 = { handleMessage: jest.fn() };
      const agent2 = { handleMessage: jest.fn() };
      
      framework.registerAgent(
        AgentRole.CONSISTENCY_GUARDIAN,
        'Guardian',
        agent1,
        ['error_detection', 'analysis']
      );
      
      framework.registerAgent(
        AgentRole.REVISION_EXECUTIVE,
        'Executive',
        agent2,
        ['suggestion_generation']
      );

      const analysisAgents = framework.discoverAgents('analysis');
      expect(analysisAgents).toHaveLength(1);
      expect(analysisAgents[0].role).toBe(AgentRole.CONSISTENCY_GUARDIAN);
    });

    it('should handle agent unregistration', () => {
      const mockAgent = { handleMessage: jest.fn() };
      
      framework.registerAgent(
        AgentRole.CONSISTENCY_GUARDIAN,
        'TestAgent',
        mockAgent
      );
      
      framework.unregisterAgent(AgentRole.CONSISTENCY_GUARDIAN);
      
      const agents = framework.discoverAgents();
      expect(agents).toHaveLength(0);
    });
  });

  describe('Session Management', () => {
    it('should create and end sessions', async () => {
      const sessionId = await framework.createSession([
        AgentRole.CONSISTENCY_GUARDIAN,
        AgentRole.REVISION_EXECUTIVE
      ]);

      expect(sessionId).toMatch(/^session_/);
      
      const metrics = framework.getSessionMetrics(sessionId);
      expect(metrics).toBeDefined();
      expect(metrics?.totalMessages).toBe(1);

      await framework.endSession(sessionId);
      
      const finalMetrics = framework.getSessionMetrics(sessionId);
      expect(finalMetrics?.successRate).toBeDefined();
    });

    it('should handle session timeout', async () => {
      jest.useFakeTimers();
      
      const sessionId = await framework.createSession([
        AgentRole.CONSISTENCY_GUARDIAN
      ]);

      const timeoutHandler = jest.fn();
      framework.on('session_timeout', timeoutHandler);

      jest.advanceTimersByTime(31000);

      expect(timeoutHandler).toHaveBeenCalled();
      
      jest.useRealTimers();
    });

    it('should track session metrics', async () => {
      const sessionId = await framework.createSession([
        AgentRole.CONSISTENCY_GUARDIAN
      ]);

      await framework.sendMessage({
        type: MessageType.ERROR_DETECTED,
        from: AgentRole.CONSISTENCY_GUARDIAN,
        to: AgentRole.REVISION_EXECUTIVE,
        payload: { test: 'data' },
        sessionId
      });

      const metrics = framework.getSessionMetrics(sessionId);
      expect(metrics?.totalMessages).toBeGreaterThan(1);
    });
  });

  describe('Message Handling', () => {
    it('should send and deliver messages', async () => {
      const mockAgent = { 
        handleMessage: jest.fn().mockResolvedValue(undefined)
      };
      
      framework.registerAgent(
        AgentRole.REVISION_EXECUTIVE,
        'Executive',
        mockAgent
      );

      const sessionId = await framework.createSession([
        AgentRole.REVISION_EXECUTIVE
      ]);

      await framework.sendMessage({
        type: MessageType.ERROR_DETECTED,
        from: AgentRole.CONSISTENCY_GUARDIAN,
        to: AgentRole.REVISION_EXECUTIVE,
        payload: { error: 'test' },
        sessionId
      });

      await new Promise(resolve => setTimeout(resolve, 200));

      expect(mockAgent.handleMessage).toHaveBeenCalled();
    });

    it('should handle broadcast messages', async () => {
      const agent1 = { handleMessage: jest.fn() };
      const agent2 = { handleMessage: jest.fn() };
      
      framework.registerAgent(
        AgentRole.CONSISTENCY_GUARDIAN,
        'Guardian',
        agent1
      );
      
      framework.registerAgent(
        AgentRole.REVISION_EXECUTIVE,
        'Executive',
        agent2
      );

      const sessionId = await framework.createSession([
        AgentRole.CONSISTENCY_GUARDIAN,
        AgentRole.REVISION_EXECUTIVE
      ]);

      await framework.sendMessage({
        type: MessageType.COLLABORATION_START,
        from: AgentRole.INCREMENTAL_ANALYZER,
        to: 'broadcast',
        payload: { announcement: 'test' },
        sessionId
      });

      await new Promise(resolve => setTimeout(resolve, 200));

      expect(agent1.handleMessage).toHaveBeenCalled();
      expect(agent2.handleMessage).toHaveBeenCalled();
    });

    it('should track message history', async () => {
      const sessionId = await framework.createSession([
        AgentRole.CONSISTENCY_GUARDIAN
      ]);

      await framework.sendMessage({
        type: MessageType.ERROR_DETECTED,
        from: AgentRole.CONSISTENCY_GUARDIAN,
        to: 'broadcast',
        payload: { test: 'data' },
        sessionId
      });

      await new Promise(resolve => setTimeout(resolve, 200));

      const history = framework.getMessageHistory(sessionId);
      expect(history.length).toBeGreaterThan(0);
      expect(history.find(m => m.type === MessageType.ERROR_DETECTED)).toBeDefined();
    });
  });

  describe('Queue Management', () => {
    it('should process message queue', async () => {
      const sessionId = await framework.createSession([
        AgentRole.CONSISTENCY_GUARDIAN
      ]);

      for (let i = 0; i < 5; i++) {
        await framework.sendMessage({
          type: MessageType.ANALYSIS_REQUEST,
          from: AgentRole.CONSISTENCY_GUARDIAN,
          to: 'broadcast',
          payload: { index: i },
          sessionId
        });
      }

      await new Promise(resolve => setTimeout(resolve, 1000));

      const status = framework.getQueueStatus();
      expect(status.processed).toBeGreaterThan(0);
    });

    it('should handle failed messages with retry', async () => {
      const failingAgent = {
        handleMessage: jest.fn()
          .mockRejectedValueOnce(new Error('First failure'))
          .mockResolvedValue(undefined)
      };

      framework.registerAgent(
        AgentRole.REVISION_EXECUTIVE,
        'Executive',
        failingAgent
      );

      const sessionId = await framework.createSession([
        AgentRole.REVISION_EXECUTIVE
      ]);

      await framework.sendMessage({
        type: MessageType.ERROR_DETECTED,
        from: AgentRole.CONSISTENCY_GUARDIAN,
        to: AgentRole.REVISION_EXECUTIVE,
        payload: { test: 'data' },
        sessionId
      });

      await new Promise(resolve => setTimeout(resolve, 500));

      expect(failingAgent.handleMessage).toHaveBeenCalledTimes(2);
    });
  });

  describe('Cleanup Operations', () => {
    it('should cleanup old sessions', async () => {
      const oldSessionId = await framework.createSession([
        AgentRole.CONSISTENCY_GUARDIAN
      ]);
      
      await framework.endSession(oldSessionId);

      const newSessionId = await framework.createSession([
        AgentRole.CONSISTENCY_GUARDIAN
      ]);

      framework.cleanupOldSessions(0);

      const oldHistory = framework.getMessageHistory(oldSessionId);
      const newHistory = framework.getMessageHistory(newSessionId);

      expect(oldHistory).toHaveLength(0);
      expect(newHistory.length).toBeGreaterThan(0);
    });

    it('should track active session count', async () => {
      const session1 = await framework.createSession([
        AgentRole.CONSISTENCY_GUARDIAN
      ]);
      
      const session2 = await framework.createSession([
        AgentRole.REVISION_EXECUTIVE
      ]);

      expect(framework.getActiveSessionCount()).toBe(2);

      await framework.endSession(session1);

      expect(framework.getActiveSessionCount()).toBe(1);
    });
  });
});

describe('CollaborationPipeline', () => {
  let framework: CollaborationFramework;
  let pipeline: CollaborationPipeline;

  beforeEach(() => {
    framework = new CollaborationFramework();
    pipeline = new CollaborationPipeline(framework);
  });

  describe('Error Processing', () => {
    it('should process errors and generate suggestions', async () => {
      const mockRevisionAgent = {
        handleMessage: jest.fn(async (message: AgentMessage) => {
          if (message.type === MessageType.ERROR_DETECTED) {
            await framework.sendMessage({
              type: MessageType.SUGGESTION_GENERATED,
              from: AgentRole.REVISION_EXECUTIVE,
              to: message.from,
              payload: {
                errorId: (message.payload as any).id,
                suggestions: [
                  {
                    id: 'sug-1',
                    modification: 'Test fix',
                    rationale: 'Test reason'
                  }
                ]
              },
              sessionId: message.sessionId,
              replyTo: message.id
            });
          }
        })
      };

      framework.registerAgent(
        AgentRole.REVISION_EXECUTIVE,
        'Executive',
        mockRevisionAgent
      );

      const errors: LogicError[] = [
        {
          id: 'error-1',
          type: 'timeline',
          severity: 'high',
          location: {},
          description: 'Test error'
        }
      ];

      const suggestions = await pipeline.processErrorsWithSuggestions(
        errors,
        new Map()
      );

      // Debug: Check if the mock was called
      expect(mockRevisionAgent.handleMessage).toHaveBeenCalled();
      
      // Debug: Get history to see what messages were processed
      const history = framework.getMessageHistory(framework.getActiveSessionCount() > 0 ? 'session_test' : '');
      console.log('Message history length:', history.length);
      console.log('Message types:', history.map(m => m.type));
      
      expect(suggestions.size).toBe(1);
      expect(suggestions.get('error-1')).toBeDefined();
      expect(suggestions.get('error-1')?.length).toBeGreaterThan(0);
    });

    it('should handle multiple errors in parallel', async () => {
      const mockRevisionAgent = {
        handleMessage: jest.fn(async (message: AgentMessage) => {
          if (message.type === MessageType.ERROR_DETECTED) {
            await new Promise(resolve => setTimeout(resolve, 50));
            
            await framework.sendMessage({
              type: MessageType.SUGGESTION_GENERATED,
              from: AgentRole.REVISION_EXECUTIVE,
              to: message.from,
              payload: {
                errorId: (message.payload as any).id,
                suggestions: []
              },
              sessionId: message.sessionId
            });
          }
        })
      };

      framework.registerAgent(
        AgentRole.REVISION_EXECUTIVE,
        'Executive',
        mockRevisionAgent
      );

      const errors: LogicError[] = Array(5).fill(null).map((_, i) => ({
        id: `error-${i}`,
        type: 'plot',
        severity: 'medium',
        location: {},
        description: `Test error ${i}`
      }));

      const startTime = Date.now();
      await pipeline.processErrorsWithSuggestions(errors, new Map());
      const duration = Date.now() - startTime;

      expect(mockRevisionAgent.handleMessage).toHaveBeenCalledTimes(5);
      expect(duration).toBeLessThan(1000);
    });
  });
});