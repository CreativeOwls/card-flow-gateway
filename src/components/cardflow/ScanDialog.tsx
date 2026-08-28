import { Camera, Check, Loader2, Upload, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { SCAN_STEPS, extractCardData, type ScanStep } from "@/lib/cardflow/extraction";
import type { ExtractedCard } from "@/lib/cardflow/types";

interface ScanDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onScanned: (card: ExtractedCard, imageDataUrl: string) => void;
  excludeEmails?: string[];
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Could not read that file."));
    reader.readAsDataURL(file);
  });
}

export function ScanDialog({
  open,
  onOpenChange,
  onScanned,
  excludeEmails,
}: ScanDialogProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [cameraError, setCameraError] = useState<string | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [currentStep, setCurrentStep] = useState<ScanStep | null>(null);
  const [doneSteps, setDoneSteps] = useState<ScanStep[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  const startCamera = useCallback(async () => {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => undefined);
      }
    } catch {
      setCameraError(
        "We couldn't open your camera — it may be blocked or unavailable on this device. Upload a photo instead.",
      );
    }
  }, []);

  const resetState = useCallback(() => {
    setCapturedImage(null);
    setBusy(false);
    setCurrentStep(null);
    setDoneSteps([]);
    setError(null);
    setDragging(false);
  }, []);

  useEffect(() => {
    if (!open) {
      stopCamera();
      resetState();
      return;
    }

    resetState();
    if (typeof navigator !== "undefined" && !!navigator.mediaDevices) {
      void startCamera();
    } else {
      setCameraError("This device has no camera available. Upload a photo instead.");
    }

    return () => stopCamera();
  }, [open, resetState, startCamera, stopCamera]);

  const runExtraction = useCallback(
    async (imageDataUrl: string) => {
      setCapturedImage(imageDataUrl);
      setError(null);
      setBusy(true);
      setDoneSteps([]);
      setCurrentStep(SCAN_STEPS[0]);
      stopCamera();

      try {
        const card = await extractCardData(
          { imageDataUrl },
          {
            excludeEmails,
            onStep: (step) => {
              setDoneSteps((previous) => {
                const index = SCAN_STEPS.indexOf(step);
                return SCAN_STEPS.slice(0, Math.max(0, index));
              });
              setCurrentStep(step);
            },
          },
        );
        setDoneSteps([...SCAN_STEPS]);
        setCurrentStep(null);
        onScanned(card, imageDataUrl);
        onOpenChange(false);
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "That scan didn't work. Try again.");
        setCurrentStep(null);
      } finally {
        setBusy(false);
      }
    },
    [excludeEmails, onOpenChange, onScanned, stopCamera],
  );

  const handleCapture = useCallback(() => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    void runExtraction(canvas.toDataURL("image/jpeg", 0.9));
  }, [runExtraction]);

  const handleFiles = useCallback(
    async (files: FileList | null) => {
      const file = files?.[0];
      if (!file) return;
      if (!file.type.startsWith("image/")) {
        setError("Please choose an image file.");
        return;
      }
      try {
        void runExtraction(await fileToDataUrl(file));
      } catch {
        setError("Could not read that file. Try another photo.");
      }
    },
    [runExtraction],
  );

  const retry = useCallback(() => {
    resetState();
    if (typeof navigator !== "undefined" && !!navigator.mediaDevices) {
      void startCamera();
    }
  }, [resetState, startCamera]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="app-shell max-h-[90dvh] w-[calc(100vw-2rem)] max-w-lg overflow-y-auto sm:w-full">
        <DialogHeader>
          <DialogTitle>Scan business card</DialogTitle>
          <DialogDescription>
            Point your camera at the card, or upload a photo. We read the text, any QR code, and
            the linked website.
          </DialogDescription>
        </DialogHeader>

        {capturedImage ? (
          <div className="space-y-4">
            <div className="relative overflow-hidden rounded-lg border border-border">
              <img
                src={capturedImage}
                alt="Captured business card"
                className={cn("aspect-[16/10] w-full object-cover", busy && "opacity-60")}
              />
              {busy ? (
                <div
                  aria-hidden="true"
                  className="cardflow-scanline pointer-events-none absolute inset-x-0 top-0 h-1 bg-primary/70"
                />
              ) : null}
            </div>

            <ul className="space-y-2" aria-live="polite">
              {SCAN_STEPS.map((step) => {
                const complete = doneSteps.includes(step);
                const active = currentStep === step;
                return (
                  <li key={step} className="flex items-center gap-2 text-sm">
                    {complete ? (
                      <Check className="size-4 text-status-demo-foreground" aria-hidden="true" />
                    ) : active ? (
                      <Loader2 className="size-4 animate-spin text-primary" aria-hidden="true" />
                    ) : (
                      <span
                        aria-hidden="true"
                        className="size-4 rounded-full border border-border"
                      />
                    )}
                    <span
                      className={cn(
                        complete || active ? "text-foreground" : "text-muted-foreground",
                      )}
                    >
                      {step}
                    </span>
                  </li>
                );
              })}
            </ul>

            {error ? (
              <div className="space-y-3 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-foreground">
                <p className="flex items-start gap-2">
                  <X className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden="true" />
                  <span>{error}</span>
                </p>
                <Button size="sm" variant="secondary" className="w-full sm:w-auto" onClick={retry}>
                  Try again
                </Button>
              </div>
            ) : null}
          </div>
        ) : (
          <div className="space-y-4">
            {cameraError ? (
              <div
                onDragOver={(event) => {
                  event.preventDefault();
                  setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={(event) => {
                  event.preventDefault();
                  setDragging(false);
                  void handleFiles(event.dataTransfer.files);
                }}
                onClick={() => fileInputRef.current?.click()}
                className={cn(
                  "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border p-6 sm:p-8 text-center text-sm text-muted-foreground transition-colors",
                  dragging && "border-primary bg-primary/5",
                )}
              >
                <Upload className="size-6" aria-hidden="true" />
                <p className="font-medium text-foreground">Drop a card photo here</p>
                <p>or click to choose a file</p>
                <p className="mt-2 text-xs">{cameraError}</p>
              </div>
            ) : (
              <div className="relative overflow-hidden rounded-lg border border-border bg-black">
                <video
                  ref={videoRef}
                  playsInline
                  muted
                  className="aspect-video w-full object-cover"
                />
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-6 rounded-md border-2 border-dashed border-white/70"
                />
              </div>
            )}

            {error ? <p className="text-sm text-destructive">{error}</p> : null}

            <div className="grid gap-2 sm:grid-cols-2">
              {!cameraError ? (
                <Button onClick={handleCapture} className="w-full gap-2">
                  <Camera className="size-4" aria-hidden="true" />
                  Capture card
                </Button>
              ) : null}
              <Button
                variant="secondary"
                className="w-full gap-2"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="size-4" aria-hidden="true" />
                Upload photo
              </Button>
            </div>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(event) => {
            void handleFiles(event.target.files);
            event.target.value = "";
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
