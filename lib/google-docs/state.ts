import type { ActionState } from "@/components/ui/form-state";
import type { GoogleDocsSettingsFieldErrors } from "@/lib/validations/google-docs";

type GoogleDocsSettingsValues = {
  folderId: string;
  titlePrefix: string;
};

export type GoogleDocsSettingsState = ActionState & {
  values: GoogleDocsSettingsValues;
  fieldErrors?: GoogleDocsSettingsFieldErrors;
};

export type GoogleDocsDeliveryState = ActionState & {
  documentUrl?: string;
};

export const initialGoogleDocsSettingsState: GoogleDocsSettingsState = {
  status: "idle",
  values: {
    folderId: "",
    titlePrefix: "",
  },
  fieldErrors: {},
};

export const initialGoogleDocsDeliveryState: GoogleDocsDeliveryState = {
  status: "idle",
};
