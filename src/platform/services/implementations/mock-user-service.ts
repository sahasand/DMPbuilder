// Mock User Management Service Implementation

import {
  UserManagementService,
  UserServiceConfig,
  User,
  UserSession,
  StudyAccess,
  Study
} from '../../types/platform-types';

export class MockUserManagementService implements UserManagementService {
  private config: UserServiceConfig;
  private currentSession: UserSession | null = null;
  private users: Map<string, User> = new Map();

  constructor(config: UserServiceConfig) {
    this.config = config;
    this.initializeDefaultUsers();
  }

  async initialize?(): Promise<void> {
    console.log('[mock-user-service] Mock user service initialized');
  }

  async shutdown?(): Promise<void> {
    this.users.clear();
    this.currentSession = null;
    console.log('[mock-user-service] Mock user service shutdown');
  }

  // ============================================================================
  // SESSION MANAGEMENT
  // ============================================================================

  async getCurrentUser(): Promise<User> {
    if (!this.currentSession) {
      // Return default system user
      return this.getSystemUser();
    }
    return this.currentSession.user;
  }

  async getCurrentSession(): Promise<UserSession> {
    if (!this.currentSession) {
      // Create default session
      this.currentSession = {
        id: 'default-session',
        user: this.getSystemUser(),
        permissions: ['*', 'study.read', 'study.write', 'dmp.create', 'dmp.read', 'dmp.write', 'dmp.admin', 'protocol.analyze'],
        roles: ['data-manager'],
        studies: ['study-1', 'study-2'],
        loginTime: new Date(),
        lastActivity: new Date()
      };
    }
    return this.currentSession;
  }

  // ============================================================================
  // PERMISSIONS
  // ============================================================================

  async hasPermission(permission: string): Promise<boolean> {
    const session = await this.getCurrentSession();
    
    // Check for wildcard permission
    if (session.permissions.includes('*')) {
      return true;
    }
    
    // Check for specific permission
    return session.permissions.includes(permission);
  }

  async hasRole(role: string): Promise<boolean> {
    const session = await this.getCurrentSession();
    return session.roles.includes(role);
  }

  async getPermissions(): Promise<string[]> {
    const session = await this.getCurrentSession();
    return session.permissions;
  }

  // ============================================================================
  // USER QUERIES
  // ============================================================================

  async getUser(userId: string): Promise<User> {
    const user = this.users.get(userId);
    if (!user) {
      throw new Error(`User not found: ${userId}`);
    }
    return user;
  }

  async getUsersByRole(role: string): Promise<User[]> {
    return Array.from(this.users.values()).filter(user =>
      user.roles.some(userRole => userRole.name === role)
    );
  }

  // ============================================================================
  // STUDY ACCESS
  // ============================================================================

  async getStudyAccess(studyId: string): Promise<StudyAccess> {
    const session = await this.getCurrentSession();
    
    // Check if user has access to this study
    if (!session.studies.includes(studyId)) {
      throw new Error(`Access denied to study: ${studyId}`);
    }

    return {
      studyId,
      permissions: ['read', 'write'],
      role: 'data-manager'
    };
  }

  async getUserStudies(): Promise<Study[]> {
    const session = await this.getCurrentSession();
    
    // Return mock studies for the user
    return session.studies.map(studyId => ({
      id: studyId,
      protocolNumber: `PROTO-${studyId}`,
      title: `Study ${studyId} Title`,
      phase: 'Phase 2' as const,
      therapeuticArea: 'Oncology',
      status: 'active' as const,
      sponsor: 'Mock Pharma',
      indication: 'Cancer',
      createdAt: new Date(),
      createdBy: session.user.id,
      updatedAt: new Date(),
      updatedBy: session.user.id,
      version: 1
    }));
  }

  // ============================================================================
  // HEALTH CHECK
  // ============================================================================

  async healthCheck(): Promise<any> {
    return {
      status: 'healthy',
      totalUsers: this.users.size,
      currentSession: this.currentSession ? 'active' : 'none'
    };
  }

  // ============================================================================
  // SESSION MANAGEMENT (EXTENDED)
  // ============================================================================

  async createSession(userId: string): Promise<UserSession> {
    const user = await this.getUser(userId);
    
    this.currentSession = {
      id: `session-${Date.now()}`,
      user,
      permissions: user.permissions,
      roles: user.roles.map(role => role.name),
      studies: ['study-1', 'study-2'], // Mock studies
      loginTime: new Date(),
      lastActivity: new Date()
    };

    console.log('[mock-user-service] Session created', { userId, sessionId: this.currentSession.id });
    return this.currentSession;
  }

  async destroySession(): Promise<void> {
    if (this.currentSession) {
      console.log('[mock-user-service] Session destroyed', { sessionId: this.currentSession.id });
      this.currentSession = null;
    }
  }

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

  private initializeDefaultUsers(): void {
    // Create default system user
    const systemUser: User = {
      id: 'system',
      username: 'system',
      email: 'system@clinicalplatform.com',
      firstName: 'System',
      lastName: 'User',
      roles: [
        {
          id: 'admin',
          name: 'admin',
          permissions: ['*']
        }
      ],
      organization: 'Platform',
      permissions: ['*']
    };

    // Create default data manager user
    const dataManagerUser: User = {
      id: 'dm-1',
      username: 'datamanager',
      email: 'dm@clinicalplatform.com',
      firstName: 'Data',
      lastName: 'Manager',
      roles: [
        {
          id: 'data-manager',
          name: 'data-manager',
          permissions: ['study.read', 'study.write', 'dmp.create', 'dmp.read', 'dmp.write', 'dmp.admin', 'protocol.analyze']
        }
      ],
      organization: 'Clinical Research Organization',
      permissions: ['study.read', 'study.write', 'dmp.create', 'dmp.read', 'dmp.write', 'dmp.admin', 'protocol.analyze']
    };

    this.users.set(systemUser.id, systemUser);
    this.users.set(dataManagerUser.id, dataManagerUser);

    console.log('[mock-user-service] Default users initialized');
  }

  private getSystemUser(): User {
    return this.users.get('system')!;
  }
}