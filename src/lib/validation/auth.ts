import { z } from "zod";

// Applies to new passwords only (registration, reset) — login never enforces
// a strength rule against a password that may predate this policy.
export const passwordSchema = z
  .string()
  .min(8, "At least 8 characters")
  .regex(/[A-Za-z]/, "Include at least one letter")
  .regex(/[0-9]/, "Include at least one number");

export const loginSchema = z.object({
  email: z.email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const registerSchema = z.object({
  name: z.string().trim().min(1, "Full name is required"),
  email: z.email("Enter a valid email address"),
  password: passwordSchema,
});
export type RegisterInput = z.infer<typeof registerSchema>;

export const doctorRegisterSchema = z
  .object({
    firstName: z.string().trim().min(1, "First name is required"),
    lastName: z.string().trim().min(1, "Last name is required"),
    email: z.email("Enter a valid email address"),
    password: passwordSchema,
    confirmPassword: z.string().min(1, "Please confirm your password"),
    specialization: z.string().trim().min(1, "Specialization is required"),
    licenseNumber: z.string().trim().min(1, "License number is required"),
    contactNumber: z.string().trim().optional(),
    yearsOfExperience: z.string().trim().optional(),
    bio: z.string().trim().optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });
export type DoctorRegisterInput = z.infer<typeof doctorRegisterSchema>;

export const forgotPasswordSchema = z.object({
  email: z.email("Enter a valid email address"),
});
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z
  .object({
    password: passwordSchema,
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

// Maps a failed safeParse() result to { fieldName: firstErrorMessage }, for
// wiring directly into each field's `error` prop.
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "");
    if (key && !errors[key]) errors[key] = issue.message;
  }
  return errors;
}
