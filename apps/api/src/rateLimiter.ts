import { getRedisClient } from './redis';

export const checkRateLimit = async (modelId: string, limits: { rpm?: number; tpm?: number; rpd?: number }, tokens: number = 0) => {
    const redisClient = await getRedisClient();
    const now = Date.now();
    const minute = Math.floor(now / 60000);
    const day = Math.floor(now / 86400000);

    const rpmKey = `rate-limit:${modelId}:${minute}:rpm`;
    const tpmKey = `rate-limit:${modelId}:${minute}:tpm`;
    const rpdKey = `rate-limit:${modelId}:${day}:rpd`;

    if (limits.rpm) {
        const currentRpm = await redisClient.get(rpmKey);
        if (currentRpm && parseInt(currentRpm) >= limits.rpm) {
            return { allowed: false, reason: 'RPM limit exceeded' };
        }
    }

    if (limits.tpm) {
        const currentTpm = await redisClient.get(tpmKey);
        if ((parseInt(currentTpm || '0') + tokens) > limits.tpm) {
            return { allowed: false, reason: 'TPM limit exceeded' };
        }
    }

    if (limits.rpd) {
        const currentRpd = await redisClient.get(rpdKey);
        if (currentRpd && parseInt(currentRpd) >= limits.rpd) {
            return { allowed: false, reason: 'RPD limit exceeded' };
        }
    }

    return { allowed: true };
};

export const incrementRateLimit = async (modelId: string, limits: { rpm?: number; tpm?: number; rpd?: number }, tokens: number = 0) => {
    const redisClient = await getRedisClient();
    const now = Date.now();
    const minute = Math.floor(now / 60000);
    const day = Math.floor(now / 86400000);

    const rpmKey = `rate-limit:${modelId}:${minute}:rpm`;
    const tpmKey = `rate-limit:${modelId}:${minute}:tpm`;
    const rpdKey = `rate-limit:${modelId}:${day}:rpd`;

    const multi = redisClient.multi();

    if (limits.rpm) {
        multi.incr(rpmKey);
        multi.expire(rpmKey, 60);
    }

    if (limits.tpm) {
        multi.incrBy(tpmKey, tokens);
        multi.expire(tpmKey, 60);
    }

    if (limits.rpd) {
        multi.incr(rpdKey);
        multi.expire(rpdKey, 86400);
    }

    await multi.exec();
};
