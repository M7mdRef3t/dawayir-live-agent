export const getInlineData = (part) => part?.inlineData ?? part?.inline_data;

export const getServerContent = (message) => message?.serverContent ?? message?.server_content;

export const getModelTurn = (message) =>
  getServerContent(message)?.modelTurn ?? getServerContent(message)?.model_turn;

export const getParts = (message) => getModelTurn(message)?.parts ?? [];

export const getToolCall = (message) => message?.toolCall ?? message?.tool_call;

export const isSetupCompleteMessage = (message) =>
  Boolean(message?.setupComplete || message?.setup_complete);

export const getServerErrorMessage = (message) =>
  message?.serverError?.message ?? message?.server_error?.message;

export const isInterruptedMessage = (message) =>
  Boolean(getServerContent(message)?.interrupted ?? getServerContent(message)?.is_interrupted);

export const isAudioMimeType = (mimeType = '') => mimeType.startsWith('audio/pcm');

export const normalizeBlob = (blob) => {
  const data = blob?.data;
  const mimeType = blob?.mimeType ?? blob?.mime_type;
  if (typeof data !== 'string') return null;
  return {
    data,
    mimeType: typeof mimeType === 'string' ? mimeType : 'audio/pcm',
  };
};

export const getTurnDataAudioBlobs = (message) => {
  const turnData = message?.turn?.data;
  if (!turnData) return [];

  const candidates = Array.isArray(turnData) ? turnData : [turnData];
  return candidates
    .map((candidate) => (typeof candidate === 'string'
      ? { data: candidate, mimeType: 'audio/pcm' }
      : normalizeBlob(candidate)))
    .filter((blob) => blob && isAudioMimeType(blob.mimeType));
};
