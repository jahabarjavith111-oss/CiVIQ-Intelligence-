import { describe, it, expect } from 'vitest';
import { loginSchema, registerSchema, projectSchema, takeoffItemSchema, boqItemSchema, inviteSchema } from '../validators';

describe('validators', () => {
  it('rejects bad login', () => {
    expect(loginSchema.safeParse({ email: 'x', password: '123' }).success).toBe(false);
    expect(loginSchema.safeParse({ email: 'a@b.com', password: '123456' }).success).toBe(true);
  });
  it('validates registration', () => {
    expect(registerSchema.safeParse({ name: 'An', email: 'a@b.com', password: 'password1' }).success).toBe(true);
    expect(registerSchema.safeParse({ name: '', email: 'a@b.com', password: 'password1' }).success).toBe(false);
  });
  it('validates project + takeoff', () => {
    expect(projectSchema.safeParse({ name: 'Tower C', startDate: '2026-01-01' }).success).toBe(true);
    expect(takeoffItemSchema.safeParse({ code: 'C-1', description: 'M25', unit: 'm3', quantity: -1 }).success).toBe(false);
  });
  it('validates boq items (coerces numeric strings)', () => {
    expect(boqItemSchema.safeParse({ code: 'B-1', description: 'Beam', unit: 'm3', quantity: '2', rate: '10' }).success).toBe(true);
    expect(boqItemSchema.safeParse({ code: '', description: 'Beam', unit: 'm3', quantity: 2, rate: 10 }).success).toBe(false);
  });
  it('validates invites', () => {
    expect(inviteSchema.safeParse({ email: 'a@b.com', role: 'engineer' }).success).toBe(true);
    expect(inviteSchema.safeParse({ email: 'bad', role: 'owner' }).success).toBe(false);
  });
});
