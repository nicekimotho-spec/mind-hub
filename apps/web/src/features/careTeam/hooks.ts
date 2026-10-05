import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../auth/AuthContext";
import * as api from "./api";

/** A client's therapists or a therapist's clients — see careTeam.service.ts in the API. */
export function useCareTeam() {
  const { accessToken } = useAuth();
  return useQuery({
    queryKey: ["care-team"],
    queryFn: () => api.listCareTeam(accessToken as string),
    enabled: Boolean(accessToken),
  });
}
