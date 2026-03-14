import crypto from 'crypto';

const REQUEST_ID_HEADER = 'x-request-id';

const normalizeIncomingRequestId = (value) => {
    if (typeof value !== 'string') return null;
    const trimmed = value.trim();
    if (!trimmed) return null;
    return trimmed.slice(0, 100);
};

export const getRequestId = (req) => {
    if (req?.requestId && typeof req.requestId === 'string') return req.requestId;
    return null;
};

export const createRequestContextMiddleware = () => (req, res, next) => {
    const incoming = normalizeIncomingRequestId(req.header(REQUEST_ID_HEADER));
    const requestId = incoming || crypto.randomUUID();
    req.requestId = requestId;
    res.setHeader(REQUEST_ID_HEADER, requestId);
    next();
};
