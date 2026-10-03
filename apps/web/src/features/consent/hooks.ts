import { useQuery } from "@tanstack/react-query";
import * as api from "./api";

export function useCurrentConsentVersion() {
  return useQuery({
    queryKey: ["current-consent-version"],
    queryFn: api.getCurrentConsentVersion,
  });
}
