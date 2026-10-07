import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { QrCode, Download, Copy, Check, X, Smartphone, ExternalLink } from 'lucide-react';

interface QRCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  webhookUrl?: string;
  allowedEmailRegex?: string;
  onShowToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export const QRCodeModal: React.FC<QRCodeModalProps> = ({
  isOpen,
  onClose,
  webhookUrl,
  allowedEmailRegex,
  onShowToast,
}) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);

  // Build the clean URL for contestants
  const getContestantUrl = () => {
    if (typeof window === 'undefined') return '';
    const base = window.location.origin;
    const params = new URLSearchParams();
    if (webhookUrl && webhookUrl.trim().length > 10) {
      params.set('webhook', webhookUrl.trim());
    }
    if (allowedEmailRegex && allowedEmailRegex.includes('[^@\\s]')) {
      params.set('anyEmail', '1');
    }
    const query = params.toString();
    return query ? `${base}?${query}` : base;
  };

  const contestantUrl = getContestantUrl();

  useEffect(() => {
    if (!isOpen || !contestantUrl) return;

    QRCode.toDataURL(contestantUrl, {
      width: 400,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#ffffff',
      },
    })
      .then((url) => setQrDataUrl(url))
      .catch((err) => console.error('Error generating QR', err));
  }, [isOpen, contestantUrl]);

  if (!isOpen) return null;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(contestantUrl);
      setCopied(true);
      onShowToast('Odkaz soutěže byl zkopírován do schránky.', 'success');
      setTimeout(() => setCopied(false), 2500);
    } catch {
      onShowToast('Nepodařilo se zkopírovat odkaz.', 'error');
    }
  };

  const handleDownloadQR = () => {
    if (!qrDataUrl) return;
    const a = document.createElement('a');
    a.href = qrDataUrl;
    a.download = `kolo_stesti_qr_${new Date().toISOString().slice(0, 10)}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    onShowToast('QR kód byl stažen.', 'success');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-[#16100e] border border-[#e5a995]/30 rounded-3xl p-6 text-white text-center shadow-2xl relative space-y-5">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="space-y-1">
          <div className="w-12 h-12 rounded-2xl bg-[#e5a995]/20 text-[#e5a995] flex items-center justify-center mx-auto mb-2">
            <QrCode className="w-6 h-6" />
          </div>
          <h3 className="text-xl font-light text-white">QR kód pro soutěžící</h3>
          <p className="text-xs text-slate-400">
            Naskenováním tohoto QR kódu se účastníkovi na telefonu otevře soutěžní kvíz a kolo štěstí.
          </p>
        </div>

        {/* QR Code Container with High Contrast */}
        <div className="p-4 bg-white rounded-2xl inline-block shadow-lg mx-auto">
          {qrDataUrl ? (
            <img
              src={qrDataUrl}
              alt="QR kód pro soutěžící"
              className="w-56 h-56 sm:w-64 sm:h-64 object-contain mx-auto"
            />
          ) : (
            <div className="w-56 h-56 flex items-center justify-center text-slate-400 text-xs">
              Generuji QR kód...
            </div>
          )}
        </div>

        {/* Contest URL display */}
        <div className="p-3 rounded-xl bg-black/40 border border-white/10 text-left text-xs space-y-1">
          <span className="text-[10px] uppercase font-semibold text-slate-400">Odkaz pro soutěžící</span>
          <p className="font-mono text-slate-300 truncate text-[11px]">{contestantUrl}</p>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-3 pt-1">
          <button
            onClick={handleCopyLink}
            className="flex items-center justify-center gap-1.5 py-3 px-4 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/20 text-white border border-white/10 transition-colors cursor-pointer"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            <span>{copied ? 'Zkopírováno' : 'Kopírovat odkaz'}</span>
          </button>

          <button
            onClick={handleDownloadQR}
            className="flex items-center justify-center gap-1.5 py-3 px-4 rounded-xl text-xs font-semibold bg-gradient-to-r from-[#fcefe9] via-[#f5d5c8] to-[#e5a995] text-slate-950 transition-opacity hover:opacity-95 cursor-pointer shadow-md"
          >
            <Download className="w-4 h-4" />
            <span>Stáhnout PNG</span>
          </button>
        </div>
      </div>
    </div>
  );
};
