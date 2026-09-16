export const USER_ROLES = ["CLIENT", "THERAPIST", "ADMIN", "CLINICAL_DIRECTOR"] as const;

export type UserRole = (typeof USER_ROLES)[number];

export const REGISTERABLE_ROLES = ["CLIENT", "THERAPIST"] as const satisfies readonly UserRole[];

export type RegisterableRole = (typeof REGISTERABLE_ROLES)[number];
