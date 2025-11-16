import type { Model } from '../types';
interface Provider {
    id: string;
    displayName: string;
    providerType: string;
    config: {
        apiKey: string;
        baseURL?: string;
    };
    models: Model[];
}
interface RateLimitManagerPageProps {
    provider?: Provider | null;
    onClose: () => void;
}
/**
 * A component for managing rate limits for a specific LLM provider.
 * It displays a table of models for the provider, allowing the user to enable/disable models
 * and configure rate limit settings.
 * @param {RateLimitManagerPageProps} props - The component props.
 * @param {Provider | null} [props.provider] - The initial provider data.
 * @param {() => void} props.onClose - A function to call when the manager is closed.
 * @returns {JSX.Element} The rendered rate limit manager page.
 */
declare const RateLimitManagerPage: React.FC<RateLimitManagerPageProps>;
export default RateLimitManagerPage;
