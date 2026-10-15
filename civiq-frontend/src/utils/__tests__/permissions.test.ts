import { describe, it, expect } from 'vitest';
import { canAccess, isAdmin } from '../permissions';

describe('permissions', () => {
  it('admin sees everything', () => {
    expect(canAccess('admin', 'projects:read')).toBe(true);
    expect(canAccess('admin', 'anything:deep')).toBe(true);
    expect(canAccess('admin', null)).toBe(true);
    expect(isAdmin('admin')).toBe(true);
  });

  it('grants exact and wildcard permissions', () => {
    expect(canAccess('engineer', 'drawings:read')).toBe(true); // drawings:* covers read
    expect(canAccess('engineer', 'drawings:delete')).toBe(true); // drawings:* covers all actions
    expect(canAccess('viewer', 'boq:read')).toBe(true);
    expect(canAccess('viewer', 'boq:write')).toBe(false);
  });

  it('denies out-of-scope modules', () => {
    expect(canAccess('viewer', 'simulation:write')).toBe(false);
    expect(canAccess('engineer', 'cost:delete')).toBe(false);
    expect(canAccess('project-manager', 'billing:read')).toBe(false);
  });

  it('null perm visible to any authenticated role; unknown role sees nothing gated', () => {
    expect(canAccess('viewer', null)).toBe(true);
    expect(canAccess(undefined, 'projects:read')).toBe(false);
    expect(canAccess(undefined, null)).toBe(true);
    expect(isAdmin('project-manager')).toBe(false);
    expect(isAdmin(undefined)).toBe(false);
  });
});
