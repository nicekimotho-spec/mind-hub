import type { IncomeBand } from "@mind-hub/shared";

export const INCOME_BAND_LABELS: Record<IncomeBand, string> = {
  NO_INCOME: "No regular income",
  UNDER_10K: "Under KES 10,000 a month",
  "10K_TO_30K": "KES 10,000 to 30,000 a month",
  "30K_TO_60K": "KES 30,000 to 60,000 a month",
  "60K_TO_100K": "KES 60,000 to 100,000 a month",
  OVER_100K: "Over KES 100,000 a month",
};
