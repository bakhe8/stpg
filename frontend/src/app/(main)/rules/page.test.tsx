import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, beforeEach, expect, it, vi } from 'vitest';
import { NextIntlClientProvider } from 'next-intl';
import RulesPage from './page';
import adminMessages from '../../../locales/ar/admin.json';
import commonMessages from '../../../locales/ar/common.json';

const {
  getEntities,
  getEntityWallets,
  getWalletPaths,
  getPathSpendingItems,
  getRules,
  getRuleTemplates,
  createRule,
  evaluateSpendingRules,
} = vi.hoisted(() => ({
  getEntities: vi.fn(),
  getEntityWallets: vi.fn(),
  getWalletPaths: vi.fn(),
  getPathSpendingItems: vi.fn(),
  getRules: vi.fn(),
  getRuleTemplates: vi.fn(),
  createRule: vi.fn(),
  evaluateSpendingRules: vi.fn(),
}));

vi.mock('../../../lib/api/entities', () => ({
  getEntities,
}));

vi.mock('../../../lib/api/wallets', () => ({
  getEntityWallets,
  getWalletPaths,
}));

vi.mock('../../../lib/api/paths', () => ({
  getPathSpendingItems,
}));

vi.mock('../../../lib/api/rules', () => ({
  getRules,
  createRule,
  evaluateSpendingRules,
  getRuleTemplates,
}));

describe('Rules page template flows', () => {
  const template = {
    code: 'APPEAL_REQUIRE_EVIDENCE',
    name: 'إلزام أدلة في الاعتراض',
    description: 'يشترط وجود أدلة',
    recommendedTargetType: 'PATH',
    ruleType: 'REQUIRES_DOCUMENTS',
    priority: 90,
    ruleData: { required: true, appliesTo: 'APPEAL' },
  };

  beforeEach(() => {
    vi.clearAllMocks();

    getEntities.mockResolvedValue([
      { id: 'entity-1', name: 'الصندوق 1', myRole: 'FOUNDER' },
    ]);
    getEntityWallets.mockResolvedValue([{ id: 'wallet-1', name: 'المحفظة 1' }]);
    getWalletPaths.mockResolvedValue([{ id: 'path-1', name: 'المسار 1' }]);
    getPathSpendingItems.mockResolvedValue([]);
    getRuleTemplates.mockResolvedValue([template]);
    getRules.mockResolvedValue([]);
    createRule.mockResolvedValue({ id: 'rule-1' });
    evaluateSpendingRules.mockResolvedValue({ allowed: true, violations: [] });
  });

  async function selectContext() {
    render(
      <NextIntlClientProvider
        locale="ar"
        messages={{
          rules: adminMessages.rules,
          accessReason: commonMessages.accessReason,
        }}
      >
        <RulesPage />
      </NextIntlClientProvider>,
    );

    const selects = await screen.findAllByRole('combobox');
    fireEvent.change(selects[0], { target: { value: 'entity-1' } });

    await waitFor(() => {
      expect(screen.getAllByRole('combobox').length).toBeGreaterThanOrEqual(2);
    });

    fireEvent.change(screen.getAllByRole('combobox')[1], {
      target: { value: 'wallet-1' },
    });

    await waitFor(() => {
      expect(screen.getAllByRole('combobox').length).toBeGreaterThanOrEqual(3);
    });

    fireEvent.change(screen.getAllByRole('combobox')[2], {
      target: { value: 'path-1' },
    });

    await waitFor(() => {
      expect(screen.getAllByRole('combobox').length).toBeGreaterThanOrEqual(4);
    });

    fireEvent.change(screen.getAllByRole('combobox')[3], {
      target: { value: 'PATH' },
    });

    await screen.findByRole('button', { name: 'إنشاء مباشر' });
  }

  it('creates a rule directly from template', async () => {
    await selectContext();

    const createButtons = await screen.findAllByRole('button', {
      name: 'إنشاء مباشر',
    });
    fireEvent.click(createButtons[0]);

    await waitFor(() => {
      expect(createRule).toHaveBeenCalledWith(
        expect.objectContaining({
          targetType: 'PATH',
          targetId: 'path-1',
          name: template.name,
          ruleType: template.ruleType,
          ruleData: template.ruleData,
          priority: template.priority,
        }),
      );
    });
  });

  it('allows delegated advanced settings managers without an admin role', async () => {
    getEntities.mockResolvedValue([
      {
        id: 'entity-1',
        name: 'الصندوق 1',
        myRole: 'MEMBER',
        canManageAdvancedSettings: true,
      },
    ]);

    await selectContext();

    expect(screen.getByRole('button', { name: 'قواعد المسار' })).toBeInTheDocument();
  });

  it('does not expose the rules surface to operational roles without delegation', async () => {
    getEntities.mockResolvedValue([
      {
        id: 'entity-1',
        name: 'الصندوق 1',
        myRole: 'TREASURER',
        canManageAdvancedSettings: false,
      },
    ]);

    render(
      <NextIntlClientProvider
        locale="ar"
        messages={{
          rules: adminMessages.rules,
          accessReason: commonMessages.accessReason,
        }}
      >
        <RulesPage />
      </NextIntlClientProvider>,
    );

    await screen.findByText('صلاحياتك غير كافية');
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
  });

  it('disables direct creation for duplicate template rule', async () => {
    getRules.mockResolvedValue([
      {
        id: 'rule-existing',
        targetType: 'PATH',
        targetId: 'path-1',
        name: template.name,
        description: null,
        ruleType: template.ruleType,
        ruleData: template.ruleData,
        priority: 90,
        isActive: true,
        createdAt: new Date().toISOString(),
      },
    ]);

    await selectContext();

    const createButtons = await screen.findAllByRole('button', {
      name: 'إنشاء مباشر',
    });
    expect(createButtons[0]).toBeDisabled();

    fireEvent.click(createButtons[0]);
    expect(createRule).not.toHaveBeenCalled();
  });

  it('shows validation error for invalid JSON in customized copy', async () => {
    await selectContext();

    const copyButtons = await screen.findAllByRole('button', {
      name: 'نسخة معدلة',
    });
    fireEvent.click(copyButtons[0]);

    const detailsSummary = await screen.findByText('تعديل متقدم لبيانات القاعدة (JSON)');
    fireEvent.click(detailsSummary);

    const textareas = screen.getAllByRole('textbox');
    const jsonTextarea = textareas[textareas.length - 1];
    fireEvent.change(jsonTextarea, { target: { value: '{invalid' } });

    fireEvent.click(screen.getByRole('button', { name: 'إنشاء النسخة' }));

    await screen.findByText('صيغة JSON غير صحيحة في بيانات القاعدة.');
  });
});
