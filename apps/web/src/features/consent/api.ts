import type { ConsentVersionResponse } from "@mind-hub/shared";
import { apiFetch } from "../../api/client";

export function getCurrentConsentVersion() {
  return apiFetch<{ consentVersion: ConsentVersionResponse }>("/consent/current-version");
}
