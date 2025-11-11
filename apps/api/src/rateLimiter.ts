import { getRedisClient } from './redis.js';

/**
 * Checks if a request for a given model is within the defined rate limits.
 * @param {string} modelId - The identifier of the model to check.
 * @param {object} limits - An object containing the rate limits to enforce (rpm, tpm, rpd).
 * @param {number} [tokens=0] - The number of tokens to be consumed by the request.
 * @returns {Promise<{allowed: boolean, reason?: string}>} An object indicating if the request is allowed and the reason if it is not.
 */
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

/**
 * Increments the rate limit counters for a given model.
 * @param {string} modelId - The identifier of the model.
 * @param {object} limits - An object containing the rate limits to apply (rpm, tpm, rpd).
 * @param {number} [tokens=0] - The number of tokens consumed by the request.
 * @returns {Promise<void>}
 */
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
