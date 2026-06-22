import { Injectable } from '@nestjs/common';
import { AsyncLocalStorage } from 'async_hooks';

export interface TenantContext {
  entityId?: string;
  personId?: string;
}

@Injectable()
export class TenantContextService {
  private readonly als = new AsyncLocalStorage<TenantContext>();

  /**
   * Run a function within a specific tenant context
   */
  run<R>(context: TenantContext, callback: () => R): R {
    return this.als.run(context, callback);
  }

  /**
   * Get the current context
   */
  getContext(): TenantContext | undefined {
    return this.als.getStore();
  }

  /**
   * Helper to get the current entityId safely
   */
  get entityId(): string | undefined {
    return this.getContext()?.entityId;
  }
}
