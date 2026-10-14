import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(6, 'Minimum 6 characters'),
  rememberMe: z.boolean().optional(),
});

export const registerSchema = z.object({
  name: z.string().min(2, 'Enter your name'),
  email: z.string().email('Enter a valid email'),
  password: z.string().min(8, 'Minimum 8 characters'),
  company: z.string().optional(),
});

export const projectSchema = z.object({
  name: z.string().min(3, 'Project name required'),
  description: z.string().optional(),
  startDate: z.string().min(1, 'Start date required'),
  endDate: z.string().optional(),
  budget: z.coerce.number().positive().optional(),
});

export const takeoffItemSchema = z.object({
  code: z.string().min(1),
  description: z.string().min(3),
  unit: z.string().min(1),
  quantity: z.coerce.number().nonnegative(),
});

export const boqItemSchema = takeoffItemSchema.extend({
  rate: z.coerce.number().nonnegative(),
});

export const riskSchema = z.object({
  title: z.string().min(3),
  category: z.string().min(1),
  probability: z.coerce.number().min(1).max(5),
  impact: z.coerce.number().min(1).max(5),
});

export const inviteSchema = z.object({
  email: z.string().email('Enter a valid email'),
  role: z.enum(['manager', 'engineer', 'viewer']),
});

export type LoginForm = z.infer<typeof loginSchema>;
export type RegisterForm = z.infer<typeof registerSchema>;
export type ProjectForm = z.infer<typeof projectSchema>;
export type InviteForm = z.infer<typeof inviteSchema>;
// Input shapes for schemas using z.coerce (input differs from output)
export type TakeoffItemFormInput = z.input<typeof takeoffItemSchema>;
export type BoqItemFormInput = z.input<typeof boqItemSchema>;
