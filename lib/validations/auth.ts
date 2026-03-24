import { z } from "zod";

export const registerFieldNames = ["name", "email", "password"] as const;

export type RegisterFieldName = (typeof registerFieldNames)[number];

export type RegisterFieldErrors = Partial<Record<RegisterFieldName, string>>;

export type RegisterSafeValues = {
  name: string;
  email: string;
};

function normalizeFormValue(value: FormDataEntryValue | string | null | undefined) {
  return typeof value === "string" ? value : "";
}

export const signUpSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Enter your full name.")
    .max(80, "Keep your name under 80 characters."),
  email: z
    .string()
    .trim()
    .min(1, "Enter your work email.")
    .email("Enter a valid work email.")
    .transform((value) => value.toLowerCase()),
  password: z
    .string()
    .min(10, "Use at least 10 characters for your password.")
    .max(100, "Keep the password under 100 characters."),
});

export const emailOnlySchema = z.object({
  email: z.email().transform((value) => value.toLowerCase()),
});

export const passwordResetSchema = z.object({
  email: z.email().transform((value) => value.toLowerCase()),
  token: z.string().min(20),
  password: z.string().min(10).max(100),
});

export function buildRegisterFormValues(input: {
  name: FormDataEntryValue | string | null | undefined;
  email: FormDataEntryValue | string | null | undefined;
  password: FormDataEntryValue | string | null | undefined;
}) {
  return {
    name: normalizeFormValue(input.name),
    email: normalizeFormValue(input.email),
    password: normalizeFormValue(input.password),
  };
}

export function getRegisterSafeValues(input: {
  name: FormDataEntryValue | string | null | undefined;
  email: FormDataEntryValue | string | null | undefined;
}): RegisterSafeValues {
  return {
    name: normalizeFormValue(input.name),
    email: normalizeFormValue(input.email),
  };
}

export function getRegisterFieldErrors(
  error: z.ZodError<z.infer<typeof signUpSchema>>,
): RegisterFieldErrors {
  const flattened = error.flatten().fieldErrors;
  const fieldErrors: RegisterFieldErrors = {};

  for (const fieldName of registerFieldNames) {
    const message = flattened[fieldName]?.[0];

    if (message) {
      fieldErrors[fieldName] = message;
    }
  }

  return fieldErrors;
}

export function getFirstRegisterErrorField(fieldErrors: RegisterFieldErrors) {
  return registerFieldNames.find((fieldName) => Boolean(fieldErrors[fieldName]));
}
