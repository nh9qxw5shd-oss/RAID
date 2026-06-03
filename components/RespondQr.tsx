'use client';

import { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';

/**
 * QR code that deep-links to the public "Respond" portal for a single
 * published debrief. Rendered inside the report so it survives the
 * print-to-PDF export — anyone holding the paper/PDF can scan it to reach
 * the reply page without being given access to the wider system.
 *
 * The URL is resolved on the client from the current origin so it is
 * always correct for whatever host the report was generated on.
 */
export default function RespondQr({
  debriefId,
  size = 96,
}: {
  debriefId: string;
  size?: number;
}) {
  const [url, setUrl] = useState('');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    setUrl(`${window.location.origin}/respond/${debriefId}`);
  }, [debriefId]);

  if (!url) return null;

  return (
    <div className="qr-block">
      <div className="qr-code">
        <QRCodeSVG
          value={url}
          size={size}
          level="M"
          marginSize={2}
          bgColor="#FFFFFF"
          fgColor="#000000"
        />
      </div>
      <div className="qr-caption">
        <div className="qr-caption-title">Scan to respond</div>
        <p className="qr-caption-text">
          Add commentary or answer a directive — no account needed.
        </p>
        <code className="qr-caption-url">{url}</code>
      </div>
    </div>
  );
}
