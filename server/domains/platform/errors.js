import { getRequestId } from './request-context.js';

export const sendError = (req, res, { status = 500, code = 'internal_error', message = 'Unexpected server error', details } = {}) => {
    const error = {
        code,
        message,
        requestId: getRequestId(req),
    };
    if (details !== undefined) error.details = details;
    return res.status(status).json({ ok: false, error });
};

