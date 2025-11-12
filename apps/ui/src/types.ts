/**
 * Represents an LLM model, with a flexible structure to accommodate various provider-specific fields.
 */
export interface Model {
    /** The unique identifier for the model. */
    id: string;
    /** A flag indicating if the model is currently enabled for use. */
    is_enabled: boolean;
    /** Allows for arbitrary additional properties from the provider's API. */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [key: string]: any;
}
