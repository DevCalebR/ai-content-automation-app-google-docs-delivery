"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";
import { registerUserAction, type RegisterState } from "@/app/(auth)/actions";
import { FieldErrorMessage, FormStateMessage } from "@/components/ui/form-state";
import { Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { getFirstRegisterErrorField, type RegisterFieldName } from "@/lib/validations/auth";

const initialState: RegisterState = {
  status: "idle" as const,
  values: {
    name: "",
    email: "",
  },
  fieldErrors: {},
  submissionId: 0,
};

export function SignUpForm() {
  const [state, formAction] = useActionState(registerUserAction, initialState);
  const [values, setValues] = useState({
    name: initialState.values.name,
    email: initialState.values.email,
    password: "",
  });
  const formRef = useRef<HTMLFormElement>(null);
  const firstErrorField = getFirstRegisterErrorField(state.fieldErrors);

  useEffect(() => {
    if (state.status !== "error" || !firstErrorField) {
      return;
    }

    const field = formRef.current?.elements.namedItem(firstErrorField);

    if (field instanceof HTMLElement) {
      field.focus();
    }
  }, [firstErrorField, state.status, state.submissionId]);

  function updateValue(fieldName: "name" | "email" | "password", value: string) {
    setValues((currentValues) => ({
      ...currentValues,
      [fieldName]: value,
    }));
  }

  function getFieldError(fieldName: RegisterFieldName) {
    return state.fieldErrors[fieldName];
  }

  function getFieldProps(fieldName: RegisterFieldName) {
    const errorMessage = getFieldError(fieldName);

    return {
      "aria-describedby": errorMessage ? `${fieldName}-error` : undefined,
      "aria-invalid": Boolean(errorMessage),
      className: errorMessage ? "border-[var(--danger)] focus:border-[var(--danger)]" : undefined,
    };
  }

  return (
    <form action={formAction} className="space-y-4" ref={formRef}>
      <div className="space-y-2">
        <label className="text-sm font-medium text-[var(--ink-soft)]" htmlFor="name">
          Full name
        </label>
        <Input
          id="name"
          name="name"
          onChange={(event) => updateValue("name", event.target.value)}
          placeholder="Caleb Porter"
          required
          value={values.name}
          {...getFieldProps("name")}
        />
        <FieldErrorMessage id="name-error" message={getFieldError("name")} />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium text-[var(--ink-soft)]" htmlFor="email">
          Work email
        </label>
        <Input
          id="email"
          name="email"
          onChange={(event) => updateValue("email", event.target.value)}
          placeholder="team@company.com"
          required
          type="email"
          value={values.email}
          {...getFieldProps("email")}
        />
        <FieldErrorMessage id="email-error" message={getFieldError("email")} />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium text-[var(--ink-soft)]" htmlFor="password">
          Password
        </label>
        <Input
          id="password"
          name="password"
          onChange={(event) => updateValue("password", event.target.value)}
          required
          type="password"
          value={values.password}
          {...getFieldProps("password")}
        />
        <FieldErrorMessage id="password-error" message={getFieldError("password")} />
      </div>
      <FormStateMessage state={state} />
      <SubmitButton className="w-full" size="lg" pendingLabel="Creating account...">
        Create account
      </SubmitButton>
      <p className="text-sm text-[var(--ink-soft)]">
        Already have an account?{" "}
        <Link className="font-medium text-[var(--ink)]" href="/sign-in">
          Sign in
        </Link>
      </p>
    </form>
  );
}
