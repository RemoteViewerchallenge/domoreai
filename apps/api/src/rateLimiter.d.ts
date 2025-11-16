export declare const checkRateLimit: (modelId: string, limits: {
    rpm?: number;
    tpm?: number;
    rpd?: number;
}, tokens?: number) => Promise<{
    allowed: boolean;
    reason: string;
} | {
    allowed: boolean;
    reason?: undefined;
}>;
export declare const incrementRateLimit: (modelId: string, limits: {
    rpm?: number;
    tpm?: number;
    rpd?: number;
}, tokens?: number) => Promise<void>;
