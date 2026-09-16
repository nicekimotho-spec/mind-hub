/** Generates a unique, valid-looking Kenyan phone number per call within a test run. */
export declare function nextTestPhone(): string;
interface CreateTestUserOptions {
    phone?: string;
    fullName?: string;
}
export declare function createTestUser(role: "CLIENT" | "THERAPIST" | "ADMIN" | "CLINICAL_DIRECTOR", options?: CreateTestUserOptions): Promise<{
    user: {
        id: string;
        email: string | null;
        phone: string;
        passwordHash: string;
        role: import(".prisma/client").$Enums.UserRole;
        status: import(".prisma/client").$Enums.UserStatus;
        phoneVerified: boolean;
        createdAt: Date;
        updatedAt: Date;
    };
    accessToken: string;
}>;
export {};
//# sourceMappingURL=factories.d.ts.map