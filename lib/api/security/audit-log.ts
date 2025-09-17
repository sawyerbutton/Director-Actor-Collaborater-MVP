import { logger } from '@/lib/api/middleware/logging';

export enum AuthEvent {
  LOGIN_SUCCESS = 'LOGIN_SUCCESS',
  LOGIN_FAILED = 'LOGIN_FAILED',
  LOGOUT = 'LOGOUT',
  REGISTRATION_SUCCESS = 'REGISTRATION_SUCCESS',
  REGISTRATION_FAILED = 'REGISTRATION_FAILED',
  PASSWORD_CHANGE = 'PASSWORD_CHANGE',
  SESSION_EXPIRED = 'SESSION_EXPIRED',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  SUSPICIOUS_ACTIVITY = 'SUSPICIOUS_ACTIVITY'
}

export interface AuthEventData {
  event: AuthEvent;
  userId?: string;
  email?: string;
  ip?: string;
  userAgent?: string;
  metadata?: Record<string, any>;
  timestamp?: Date;
}

class SecurityAuditLog {
  private formatEventData(data: AuthEventData): Record<string, any> {
    return {
      event: data.event,
      userId: data.userId || 'anonymous',
      email: data.email || 'unknown',
      ip: data.ip || 'unknown',
      userAgent: data.userAgent || 'unknown',
      metadata: data.metadata || {},
      timestamp: data.timestamp || new Date()
    };
  }

  async logAuthEvent(data: AuthEventData): Promise<void> {
    const formatted = this.formatEventData(data);
    
    // Log to application logger
    switch (data.event) {
      case AuthEvent.LOGIN_SUCCESS:
      case AuthEvent.REGISTRATION_SUCCESS:
      case AuthEvent.LOGOUT:
        logger.info(`Security Event: ${data.event}`, formatted);
        break;
      
      case AuthEvent.LOGIN_FAILED:
      case AuthEvent.REGISTRATION_FAILED:
      case AuthEvent.SESSION_EXPIRED:
        logger.warn(`Security Event: ${data.event}`, formatted);
        break;
      
      case AuthEvent.RATE_LIMIT_EXCEEDED:
      case AuthEvent.SUSPICIOUS_ACTIVITY:
        logger.error(`Security Alert: ${data.event}`, formatted);
        break;
      
      default:
        logger.info(`Security Event: ${data.event}`, formatted);
    }
    
    // In production, also send to external security monitoring service
    if (process.env.NODE_ENV === 'production') {
      await this.sendToSecurityMonitoring(formatted);
    }
  }

  private async sendToSecurityMonitoring(data: Record<string, any>): Promise<void> {
    // TODO: Integrate with external security monitoring service
    // Examples: Datadog, Splunk, ELK Stack, AWS CloudWatch
    // This is a placeholder for future implementation
    try {
      // await externalSecurityService.log(data);
    } catch (error) {
      logger.error('Failed to send security event to monitoring service', { error });
    }
  }

  async detectSuspiciousActivity(
    email: string,
    ip: string,
    event: AuthEvent
  ): Promise<boolean> {
    // Simple suspicious activity detection
    // In production, implement more sophisticated detection
    
    // Check for rapid failed login attempts
    if (event === AuthEvent.LOGIN_FAILED) {
      // This would normally check against a database or cache
      // For now, return false (not suspicious)
      return false;
    }
    
    // Check for multiple registrations from same IP
    if (event === AuthEvent.REGISTRATION_SUCCESS) {
      // This would normally check registration history
      return false;
    }
    
    return false;
  }

  extractRequestInfo(request: Request): { ip: string; userAgent: string } {
    const headers = request.headers;
    const forwarded = headers.get('x-forwarded-for');
    const ip = forwarded ? forwarded.split(',')[0] : 'unknown';
    const userAgent = headers.get('user-agent') || 'unknown';
    
    return { ip, userAgent };
  }
}

export const auditLog = new SecurityAuditLog();