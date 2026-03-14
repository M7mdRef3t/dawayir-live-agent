import { useCallback, useRef, useState } from 'react';

/**
 * useCamera — manages camera start/stop/capture lifecycle.
 *
 * @param {Object} opts
 * @param {Function} opts.formatError - (key, detail?) => localized error string
 * @returns {{ videoRef, isCameraActive, capturedImage, startCamera, stopCamera, captureSnapshot, setCapturedImage }}
 */
export function useCamera({ formatError }) {
  const videoRef = useRef(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [capturedImage, setCapturedImage] = useState(null);
  const [cameraError, setCameraError] = useState(null);

  const stopCamera = useCallback(() => {
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = videoRef.current.srcObject.getTracks();
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  }, []);

  const startCamera = useCallback(async () => {
    console.log("[Camera] Starting camera...");
    setCameraError(null);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error(formatError('cameraBrowserUnsupported'));
      }

      console.log("[Camera] Requesting camera permission...");
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user'
        }
      });

      console.log("[Camera] Permission granted. Stream:", stream);
      console.log("[Camera] Video tracks:", stream.getVideoTracks());

      if (videoRef.current) {
        console.log("[Camera] Setting stream to video element");
        videoRef.current.srcObject = stream;

        videoRef.current.onloadedmetadata = () => {
          console.log("[Camera] Video metadata loaded");
          console.log("[Camera] Video dimensions:", videoRef.current.videoWidth, "x", videoRef.current.videoHeight);
        };

        try {
          await videoRef.current.play();
          console.log("[Camera] Video play() succeeded");
        } catch (playErr) {
          console.warn("[Camera] Autoplay prevented", playErr);
          setCameraError(formatError('cameraAutoplay'));
        }

        setIsCameraActive(true);
        console.log("[Camera] [OK] Camera activated successfully");
      } else {
        console.error("[Camera] videoRef.current is null!");
        setCameraError(formatError('videoElementNotReady'));
      }
    } catch (err) {
      console.error("[Camera] [ERROR] Error:", err);
      console.error("[Camera] Error name:", err.name);
      console.error("[Camera] Error message:", err.message);

      if (err.message === formatError('cameraBrowserUnsupported')) {
        setCameraError(err.message);
      } else if (err.name === 'NotAllowedError') {
        setCameraError(formatError('cameraPermissionDenied'));
      } else if (err.name === 'NotFoundError') {
        setCameraError(formatError('cameraNotFound'));
      } else if (err.name === 'NotReadableError') {
        setCameraError(formatError('cameraInUse'));
      } else {
        setCameraError(formatError('cameraGeneric', err.message));
      }
    }
  }, [formatError]);

  const captureSnapshot = useCallback(() => {
    if (!videoRef.current) {
      console.error("[Camera] Video ref not available");
      return null;
    }

    const canvas = document.createElement('canvas');
    const MAX_DIM = 640;
    let width = videoRef.current.videoWidth;
    let height = videoRef.current.videoHeight;

    console.log(`[Camera] Capturing snapshot - Video dimensions: ${width}x${height}`);

    if (width === 0 || height === 0) {
      console.error("[Camera] Video dimensions are 0. Camera may not be ready yet.");
      setCameraError(formatError('cameraNotReady'));
      return null;
    }

    if (width > height) {
      if (width > MAX_DIM) {
        height *= MAX_DIM / width;
        width = MAX_DIM;
      }
    } else {
      if (height > MAX_DIM) {
        width *= MAX_DIM / height;
        height = MAX_DIM;
      }
    }

    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(videoRef.current, 0, 0, width, height);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
    setCapturedImage(dataUrl);
    stopCamera();
    console.log("[Camera] Snapshot captured successfully");
    return dataUrl.split(',')[1]; // Return base64 payload
  }, [formatError, stopCamera]);

  return {
    videoRef,
    isCameraActive,
    capturedImage,
    cameraError,
    setCapturedImage,
    startCamera,
    stopCamera,
    captureSnapshot,
  };
}
