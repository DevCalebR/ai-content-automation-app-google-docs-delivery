import type { ActionState } from "@/components/ui/form-state";

type GoogleDocsSettingsValues = {
  folderId: string;
  titlePrefix: string;
};

export type GoogleDocsSettingsState = ActionState & {
  values: GoogleDocsSettingsValues;
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
};

export const initialGoogleDocsDeliveryState: GoogleDocsDeliveryState = {
  status: "idle",
};
