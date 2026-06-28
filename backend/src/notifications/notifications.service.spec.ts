import { NotificationTargetType, NotificationType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from './notifications.service';
import type { IPushProvider } from './push-provider.interface';

describe('NotificationsService audit trail', () => {
  let prisma: {
    notification: { create: jest.Mock; createMany: jest.Mock };
    deviceToken: { findMany: jest.Mock };
    auditLog: { create: jest.Mock };
  };
  let pushProvider: { sendToDevice: jest.Mock };
  let service: NotificationsService;

  beforeEach(() => {
    prisma = {
      notification: {
        create: jest.fn().mockResolvedValue({ id: 'notification-id' }),
        createMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      deviceToken: { findMany: jest.fn().mockResolvedValue([]) },
      auditLog: { create: jest.fn().mockResolvedValue({}) },
    };
    pushProvider = { sendToDevice: jest.fn().mockResolvedValue(undefined) };
    service = new NotificationsService(
      prisma as unknown as PrismaService,
      pushProvider as unknown as IPushProvider,
    );
  });

  it('records notification creation and push dispatch attempts', async () => {
    await service.create({
      personId: 'person-id',
      type: NotificationType.PAYMENT_CONFIRMED,
      title: 'تم تسجيل دفعتك',
      body: 'تم تسجيل دفعتك',
      targetType: NotificationTargetType.SUBSCRIPTION,
      targetId: '11111111-1111-1111-1111-111111111111',
    });

    expect(prisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: 'CREATE',
          targetType: 'notifications',
          targetId: 'notification-id',
          newValue: expect.objectContaining({
            status: 'CREATED',
            count: 1,
            recipientIds: ['person-id'],
          }),
        }),
      }),
    );
    expect(prisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: 'CREATE',
          targetType: 'notifications',
          targetId: 'notification-id',
          newValue: expect.objectContaining({
            status: 'PUSH_DISPATCHED',
            attemptedDevices: 0,
          }),
        }),
      }),
    );
  });

  it('records push failures without failing the in-app notification', async () => {
    prisma.deviceToken.findMany.mockResolvedValue([
      { personId: 'person-id', token: 'device-token' },
    ]);
    pushProvider.sendToDevice.mockRejectedValue(new Error('push offline'));

    await expect(
      service.create({
        personId: 'person-id',
        type: NotificationType.PAYMENT_DUE,
        title: 'دفعة مستحقة',
        body: 'لديك دفعة مستحقة',
        targetType: NotificationTargetType.SUBSCRIPTION,
        targetId: '22222222-2222-2222-2222-222222222222',
      }),
    ).resolves.toEqual({ id: 'notification-id' });

    expect(prisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: 'REJECT',
          targetType: 'notifications',
          targetId: 'notification-id',
          newValue: expect.objectContaining({
            status: 'PUSH_FAILED',
            reason: 'push offline',
            recipientIds: ['person-id'],
          }),
        }),
      }),
    );
  });
});
