import { PrismaClient, EntityType } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

const connectionString =
  process.env.DATABASE_URL ||
  'postgresql://postgres:postgres@localhost:5432/stgp_dev?schema=public';
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Seeding Entity Templates...');

  await prisma.entityTemplate.createMany({
    data: [
      {
        name: 'صندوق عائلة قياسي',
        type: EntityType.FAMILY,
        description:
          'قالب افتراضي لإنشاء صندوق عائلة مع محفظة رئيسية واحتياطية ومسار حوكمة.',
        defaultPolicy: {
          requireApproval: true,
          minApprovalPercentage: 50,
        },
        defaultWallets: [
          { id: 'w1', name: 'المحفظة الرئيسية', type: 'MAIN', currency: 'SAR' },
          {
            id: 'w2',
            name: 'المحفظة الاحتياطية',
            type: 'RESERVE',
            currency: 'SAR',
          },
        ],
        defaultPaths: [
          {
            name: 'المسار القياسي للمصروفات',
            walletTempId: 'w1',
            rules: [
              { threshold: 0, requiredApprovals: 2 },
              { threshold: 10000, requiredApprovals: 3 },
            ],
          },
        ],
      },
      {
        name: 'جمعية تعاونية',
        type: EntityType.COMMUNITY,
        description:
          'قالب للجمعيات التعاونية مع التركيز على الاشتراكات والمحافظ المتعددة.',
        defaultPolicy: {
          requireApproval: true,
          minApprovalPercentage: 75,
        },
        defaultWallets: [
          { id: 'w1', name: 'محفظة الاشتراكات', type: 'MAIN', currency: 'SAR' },
          {
            id: 'w2',
            name: 'محفظة الاستثمارات',
            type: 'RESERVE',
            currency: 'SAR',
          },
        ],
        defaultPaths: [
          {
            name: 'مسار الاستثمار',
            walletTempId: 'w2',
            rules: [{ threshold: 0, requiredApprovals: 5 }],
          },
        ],
      },
    ],
    skipDuplicates: true,
  });

  console.log('Done!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
