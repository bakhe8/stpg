import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { EntityType } from '@prisma/client';
import { CreateEntityDto } from './create-entity.dto';

function validateCreateEntity(payload: Record<string, unknown>) {
  const dto = plainToInstance(CreateEntityDto, payload);
  return validate(dto, {
    whitelist: true,
    forbidNonWhitelisted: true,
  });
}

describe('CreateEntityDto', () => {
  it('accepts the low-level create entity contract', async () => {
    const errors = await validateCreateEntity({
      name: 'Family Fund',
      type: EntityType.FAMILY,
      description: 'Shared family operations',
      templateId: '4d23de66-17f1-43dd-9b5a-64f3d2c458a0',
    });

    expect(errors).toHaveLength(0);
  });

  it('accepts stable v5 entity template ids from seeded templates', async () => {
    const errors = await validateCreateEntity({
      name: 'Template Fund',
      type: EntityType.COMMUNITY,
      templateId: 'fba96d5c-f6b8-52fb-92c9-0659b0e99211',
    });

    expect(errors).toHaveLength(0);
  });

  it('rejects setup-only fields until the setup contract exists', async () => {
    const errors = await validateCreateEntity({
      name: 'Family Fund',
      type: EntityType.FAMILY,
      defaultGovernanceType: 'BOARD',
      allowMultiplePaths: true,
    });

    expect(errors.map((error) => error.property)).toEqual(
      expect.arrayContaining(['defaultGovernanceType', 'allowMultiplePaths']),
    );
  });

  it('rejects frontend-only entity types', async () => {
    const errors = await validateCreateEntity({
      name: 'Friends Fund',
      type: 'FRIENDS',
    });

    expect(errors.map((error) => error.property)).toContain('type');
  });
});
