// Mock Notification Service Implementation

import {
  NotificationService,
  NotificationServiceConfig,
  Notification
} from '../../types/platform-types';

export class MockNotificationService implements NotificationService {
  private config: NotificationServiceConfig;
  private notifications: Map<string, Notification[]> = new Map();
  private subscriptions: Map<string, Set<string>> = new Map();

  constructor(config: NotificationServiceConfig) {
    this.config = config;
  }

  async initialize?(): Promise<void> {
    console.log('[mock-notification-service] Mock notification service initialized');
  }

  async shutdown?(): Promise<void> {
    this.notifications.clear();
    this.subscriptions.clear();
    console.log('[mock-notification-service] Mock notification service shutdown');
  }

  async send(notification: Notification): Promise<void> {
    if (!this.notifications.has(notification.userId)) {
      this.notifications.set(notification.userId, []);
    }

    const notificationWithId = {
      ...notification,
      id: notification.id || this.generateId(),
      createdAt: notification.createdAt || new Date(),
      read: false
    };

    this.notifications.get(notification.userId)!.push(notificationWithId);

    console.log('[mock-notification-service] Notification sent', {
      userId: notification.userId,
      type: notification.type,
      title: notification.title
    });
  }

  async subscribe(userId: string, channel: string): Promise<void> {
    if (!this.subscriptions.has(userId)) {
      this.subscriptions.set(userId, new Set());
    }
    this.subscriptions.get(userId)!.add(channel);

    console.log('[mock-notification-service] User subscribed to channel', { userId, channel });
  }

  async getNotifications(userId: string): Promise<Notification[]> {
    const userNotifications = this.notifications.get(userId) || [];
    return userNotifications.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async markAsRead(userId: string, notificationId: string): Promise<void> {
    const userNotifications = this.notifications.get(userId) || [];
    const notification = userNotifications.find(n => n.id === notificationId);
    if (notification) {
      notification.read = true;
      console.log('[mock-notification-service] Notification marked as read', { userId, notificationId });
    }
  }

  async healthCheck(): Promise<any> {
    const totalNotifications = Array.from(this.notifications.values())
      .reduce((sum, notifications) => sum + notifications.length, 0);

    return {
      status: 'healthy',
      totalUsers: this.notifications.size,
      totalNotifications,
      totalSubscriptions: Array.from(this.subscriptions.values())
        .reduce((sum, channels) => sum + channels.size, 0)
    };
  }

  private generateId(): string {
    return `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}