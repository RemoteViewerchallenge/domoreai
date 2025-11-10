export interface Model {
    id: string;
    is_enabled: boolean;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [key: string]: any; // Allow for arbitrary additional properties
}
