import { SearchService } from './search.service';

describe('SearchService permission filtering', () => {
  function createService() {
    const prisma = {
      membership: { findMany: jest.fn() },
      entity: { findMany: jest.fn() },
    };
    const service = new SearchService(prisma as never);
    const client = {
      search: jest.fn(),
      indices: {
        exists: jest.fn(),
        create: jest.fn(),
      },
      info: jest.fn(),
    };
    (service as unknown as { client: typeof client }).client = client;
    return { service, prisma, client };
  }

  it('drops OpenSearch entity hits outside the requester memberships', async () => {
    const { service, prisma, client } = createService();
    prisma.membership.findMany.mockResolvedValue([
      { entityId: '11111111-1111-1111-1111-111111111111' },
    ]);
    client.search.mockResolvedValue({
      body: {
        hits: {
          hits: [
            {
              _id: '11111111-1111-1111-1111-111111111111',
              _source: {
                id: '11111111-1111-1111-1111-111111111111',
                name: 'Allowed entity',
                type: 'FAMILY',
                createdAt: new Date(),
              },
            },
            {
              _id: '22222222-2222-2222-2222-222222222222',
              _source: {
                id: '22222222-2222-2222-2222-222222222222',
                name: 'Hidden entity',
                type: 'BUILDING',
                createdAt: new Date(),
              },
            },
          ],
        },
      },
    });

    const result = await service.searchEntities('entity', 'person-id');

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      id: '11111111-1111-1111-1111-111111111111',
      name: 'Allowed entity',
    });
  });

  it('restricts database fallback to the requester memberships', async () => {
    const { service, prisma, client } = createService();
    prisma.membership.findMany.mockResolvedValue([
      { entityId: '11111111-1111-1111-1111-111111111111' },
      { entityId: '33333333-3333-3333-3333-333333333333' },
    ]);
    client.search.mockRejectedValue(new Error('opensearch unavailable'));
    prisma.entity.findMany.mockResolvedValue([
      {
        id: '11111111-1111-1111-1111-111111111111',
        name: 'Allowed entity',
        type: 'FAMILY',
        platformStatus: 'ACTIVE',
        createdAt: new Date(),
      },
    ]);

    const result = await service.searchEntities('entity', 'person-id');

    expect(prisma.entity.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: {
            in: [
              '11111111-1111-1111-1111-111111111111',
              '33333333-3333-3333-3333-333333333333',
            ],
          },
        }),
      }),
    );
    expect(result).toHaveLength(1);
  });

  it('returns no results when the requester has no active memberships', async () => {
    const { service, prisma, client } = createService();
    prisma.membership.findMany.mockResolvedValue([]);

    await expect(service.searchEntities('entity', 'person-id')).resolves.toEqual(
      [],
    );
    expect(client.search).not.toHaveBeenCalled();
    expect(prisma.entity.findMany).not.toHaveBeenCalled();
  });
});
