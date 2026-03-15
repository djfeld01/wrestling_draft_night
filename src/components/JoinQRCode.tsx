"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";

interface JoinQRCodeProps {
  sessionId: string;
  size?: number;
}

export function JoinQRCode({ sessionId, size = 200 }: JoinQRCodeProps) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);

  const joinUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/join/${sessionId}`
      : `/join/${sessionId}`;

  useEffect(() => {
    QRCode.toDataURL(joinUrl, {
      width: size,
      margin: 2,
      color: { dark: "#000000", light: "#ffffff" },
    }).then(setDataUrl);
  }, [joinUrl, size]);

  if (!dataUrl) return null;

  return (
    <div className="flex flex-col items-center gap-2">
      <img
        src={dataUrl}
        alt="Join QR Code"
        width={size}
        height={size}
        className="rounded"
      />
      <p className="text-xs text-muted-foreground break-all max-w-[200px] text-center">
        {joinUrl}
      </p>
    </div>
  );
}
