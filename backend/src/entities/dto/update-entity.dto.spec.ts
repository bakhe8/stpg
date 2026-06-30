import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { EntityType } from '@prisma/client';
import { UpdateEntityDto } from './update-entity.dto';

function validateUpdateEntity(payload: Record<string, unknown>) {
  const dto = plainToInstance(UpdateEntityDto, payload);
  return validate(dto, {
    whitelist: true,
    forbidNonWhitelisted: true,
  });
}

describe('UpdateEntityDto', () => {
  it('rejects changing the legacy operational entity type', async () => {
    const errors = await validateUpdateEntity({
      name: 'Updated Fund',
      type: EntityType.BUILDING,
    });

    expect(errors.map((error) => error.property)).toContain('type');
  });

  it('accepts optional user-facing fund profile fields', async () => {
    const errors = await validateUpdateEntity({
      profileKey: 'FAMILY',
      profileLabel: 'صندوق عائلة',
    });

    expect(errors).toHaveLength(0);
  });
});
