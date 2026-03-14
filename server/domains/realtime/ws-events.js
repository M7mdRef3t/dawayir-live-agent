export const buildWsEventEnvelope = ({ type, payload, requestId, legacyKey = null, includeLegacy = true }) => {
    const envelope = {
        event: {
            type,
            requestId,
            payload,
        },
    };
    if (includeLegacy && legacyKey) envelope[legacyKey] = payload;
    return envelope;
};
