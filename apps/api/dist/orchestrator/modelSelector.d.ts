export declare class HardStopError extends Error {
    constructor(message: string);
}
export declare class RateLimitError extends Error {
    constructor(message: string);
}
interface Model {
    id: string;
    provider: string;
    cost: number;
    simulation: {
        onLimitExceeded: 'HARD_STOP' | 'SOFT_FAIL';
        rateLimits: {
            freeTier: {
                RPM?: number;
                RPD?: number;
            };
        };
    };
}
interface SelectionCriteria {
    model?: string;
}
/**
 * Loads model definitions from multiple JSON files.
 * @param paths An array of file paths to the model JSON files.
 * @returns A promise that resolves to a single array of all models.
 */
export declare function loadModelCatalog(paths: string[]): Promise<Model[]>;
/**
 * The main orchestrator function.
 * Selects the best available model based on criteria and current usage.
 * @param criteria The desired model or capabilities.
 * @returns A promise that resolves to the selected model.
 */
export declare function selectModel(criteria: SelectionCriteria): Promise<Model | null>;
export {};
//# sourceMappingURL=modelSelector.d.ts.map