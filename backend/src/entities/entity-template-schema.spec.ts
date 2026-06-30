import {
  GovernancePathType,
  VoteType,
  WalletBenefitType,
} from '@prisma/client';
import {
  normalizeEntityTemplate,
  TemplateValidationError,
} from './entity-template-schema';

describe('entity template schema', () => {
  it('rejects legacy defaultPolicy keys before Prisma sees them', () => {
    expect(() =>
      normalizeEntityTemplate({
        name: 'legacy template',
        defaultPolicy: {
          requireApproval: true,
          minApprovalPercentage: 75,
        },
      }),
    ).toThrow(TemplateValidationError);
  });

  it('normalizes operational wallets, paths, policies, and rules', () => {
    const template = normalizeEntityTemplate({
      name: 'valid template',
      defaultPolicy: {
        requiresMemberApproval: true,
        allowedGovernanceTypes: ['COMMITTEE'],
        defaultVoteType: 'COMMITTEE_APPROVAL',
      },
      defaultWallets: [
        {
          id: 'aid',
          name: 'Aid wallet',
          benefitType: 'SEPARABLE',
          policy: { minimumActiveMonths: 1 },
        },
      ],
      defaultPaths: [
        {
          name: 'Aid committee',
          walletTempId: 'aid',
          type: 'COMMITTEE',
          rules: [{ threshold: 0, requiredApprovals: 3 }],
        },
      ],
    });

    expect(template.policy).toMatchObject({
      requiresMemberApproval: true,
      allowedGovernanceTypes: [GovernancePathType.COMMITTEE],
      defaultVoteType: VoteType.COMMITTEE_APPROVAL,
    });
    expect(template.wallets[0]).toMatchObject({
      tempId: 'aid',
      name: 'Aid wallet',
      benefitType: WalletBenefitType.SEPARABLE,
      policy: { minimumActiveMonths: 1 },
    });
    expect(template.paths[0]).toMatchObject({
      walletTempId: 'aid',
      type: GovernancePathType.COMMITTEE,
      policy: {
        voteType: VoteType.COMMITTEE_APPROVAL,
        extraRules: {
          templateRules: [{ threshold: 0, requiredApprovals: 3 }],
        },
      },
    });
  });

  it('rejects a path bound to an unknown template wallet', () => {
    expect(() =>
      normalizeEntityTemplate({
        name: 'broken template',
        defaultWallets: [{ id: 'main', name: 'Main wallet' }],
        defaultPaths: [
          { name: 'Detached path', walletTempId: 'missing', type: 'BOARD' },
        ],
      }),
    ).toThrow(/unknown walletTempId/);
  });
});
