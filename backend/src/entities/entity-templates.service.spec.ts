import { PrismaService } from '../prisma/prisma.service';
import { EntityTemplatesService } from './entity-templates.service';

describe('EntityTemplatesService', () => {
  it('returns only active templates in product order', async () => {
    const prisma = {
      entityTemplate: {
        findMany: jest.fn().mockResolvedValue([]),
      },
    };
    const service = new EntityTemplatesService(
      prisma as unknown as PrismaService,
    );

    await service.findAll();

    expect(prisma.entityTemplate.findMany).toHaveBeenCalledWith({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });
  });
});
