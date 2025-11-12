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
declare const RateLimitManagerPage: React.FC<RateLimitManagerPageProps>;
export default RateLimitManagerPage;
