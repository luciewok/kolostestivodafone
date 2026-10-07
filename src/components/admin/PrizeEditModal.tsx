import React, { useState, useEffect } from 'react';
import { Prize } from '../../types';
import { X, Check, Package, Image as ImageIcon } from 'lucide-react';
import { resolvePrizeImage } from '../../utils/storage';

interface PrizeEditModalProps {
  isOpen: boolean;
  prize: Prize | null;
  onSave: (prize: Prize) => void;
  onClose: () => void;
}

const PRESET_COLORS = [
  { bg: '#fff7f4', text: '#231510', label: 'Porcelain Pearl' },
  { bg: '#f5ded6', text: '#231510', label: 'Blush Porcelain' },
  { bg: '#faebe4', text: '#231510', label: 'Rose Cream' },
  { bg: '#f1d7cc', text: '#231510', label: 'Apricot Blush' },
  { bg: '#f6d2c4', text: '#231510', label: 'Rose Gold' },
  { bg: '#fff5f0', text: '#231510', label: 'Silky White' },
  { bg: '#f8e2d9', text: '#231510', label: 'Rose Peach' },
  { bg: '#faede7', text: '#231510', label: 'Warm Porcelain' },
  { bg: '#fdf1ec', text: '#231510', label: 'Warm Ivory' },
  { bg: '#fee2e2', text: '#7f1d1d', label: 'Soft Red' },
  { bg: '#e0f2fe', text: '#0369a1', label: 'Soft Blue' },
  { bg: '#dcfce7', text: '#15803d', label: 'Soft Green' },
];

export const PrizeEditModal: React.FC<PrizeEditModalProps> = ({
  isOpen,
  prize,
  onSave,
  onClose,
}) => {
  const isEditing = Boolean(prize);

  const [prizeId, setPrizeId] = useState('');
  const [name, setName] = useState('');
  const [color, setColor] = useState('#fff7f4');
  const [textColor, setTextColor] = useState('#231510');
  const [weight, setWeight] = useState(5);
  const [active, setActive] = useState(true);
  const [hasStockLimit, setHasStockLimit] = useState(false);
  const [stock, setStock] = useState<number | ''>(10);
  const [image, setImage] = useState<string>('');

  useEffect(() => {
    if (prize) {
      setPrizeId(prize.id);
      setName(prize.name);
      setColor(prize.color);
      setTextColor(prize.textColor || '#231510');
      setWeight(prize.weight);
      setActive(prize.active);
      const isLimited = prize.stock !== undefined && prize.stock !== null;
      setHasStockLimit(isLimited);
      setStock(isLimited ? (prize.stock as number) : 10);
      setImage(prize.image || '');
    } else {
      setPrizeId('p' + Math.floor(Date.now() % 1000));
      setName('');
      setColor('#fff7f4');
      setTextColor('#231510');
      setWeight(5);
      setActive(true);
      setHasStockLimit(false);
      setStock(10);
      setImage('');
    }
  }, [prize, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const cleanId = (prizeId || (prize ? prize.id : 'p' + Math.floor(Date.now() % 1000)))
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, '');

    const calculatedStock = hasStockLimit ? (typeof stock === 'number' ? Math.max(0, stock) : 0) : null;
    // Auto-deactivate if stock is set to 0
    const finalActive = calculatedStock !== null && calculatedStock <= 0 ? false : active;

    const newPrize: Prize = {
      id: cleanId,
      name: name.trim(),
      color,
      textColor,
      weight: Math.max(1, Math.min(100, weight)),
      active: finalActive,
      stock: calculatedStock,
      image: image.trim() ? image.trim() : resolvePrizeImage({ id: cleanId, name, image }),
    };

    onSave(newPrize);
    onClose();
  };

  const previewImage = image || resolvePrizeImage({ id: prize?.id, name, image });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-lg bg-[#181210] border border-[#e5a995]/30 rounded-3xl p-6 shadow-2xl my-8">
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <h3 className="text-xl font-bold text-white">
            {isEditing ? 'Upravit výhru' : 'Přidat novou výhru'}
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-1">
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Kód výhry (ID)
              </label>
              <input
                type="text"
                value={prizeId}
                onChange={(e) => setPrizeId(e.target.value.trim().toLowerCase().replace(/[^a-z0-9_-]/g, ''))}
                placeholder="např. p1"
                required
                className="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/10 text-[#e5a995] font-mono font-bold placeholder-slate-500 focus:outline-none focus:border-[#e5a995]"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Název výhry
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Např. Bezdrátová sluchátka"
                required
                className="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-[#e5a995]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Váha pravděpodobnosti (1–100)
            </label>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min="1"
                max="30"
                value={weight}
                onChange={(e) => setWeight(Number(e.target.value))}
                className="flex-1 accent-[#e5a995] cursor-pointer"
              />
              <span className="w-12 text-center font-bold text-white bg-black/40 border border-white/10 py-1.5 rounded-lg text-sm">
                {weight}
              </span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3">
            <div className="flex items-center justify-between">
              <label htmlFor="limit-toggle" className="text-sm font-medium text-white flex items-center gap-2 cursor-pointer">
                <Package className="w-4 h-4 text-[#e5a995]" />
                Omezený počet kusů (skladová zásoba)
              </label>
              <input
                id="limit-toggle"
                type="checkbox"
                checked={hasStockLimit}
                onChange={(e) => setHasStockLimit(e.target.checked)}
                className="w-5 h-5 rounded accent-[#e5a995] cursor-pointer"
              />
            </div>

            {hasStockLimit && (
              <div className="pt-2 border-t border-white/10 flex items-center gap-3">
                <span className="text-xs text-slate-300">Počet zbývajících kusů:</span>
                <input
                  type="number"
                  min="0"
                  value={stock}
                  onChange={(e) => setStock(e.target.value === '' ? '' : parseInt(e.target.value, 10))}
                  className="w-24 px-3 py-1.5 rounded-lg bg-black/40 border border-white/10 text-white text-center font-bold text-sm focus:outline-none focus:border-[#e5a995]"
                />
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Barevné ladění pole na kole
            </label>
            <div className="grid grid-cols-6 gap-2">
              {PRESET_COLORS.map((preset, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setColor(preset.bg);
                    setTextColor(preset.text);
                  }}
                  title={preset.label}
                  className="h-8 rounded-lg border flex items-center justify-center transition-transform hover:scale-105"
                  style={{
                    backgroundColor: preset.bg,
                    borderColor: color === preset.bg ? '#e5a995' : 'rgba(255,255,255,0.15)',
                    outline: color === preset.bg ? '2px solid #e5a995' : 'none',
                  }}
                >
                  {color === preset.bg && <Check className="w-4 h-4" style={{ color: preset.text }} />}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Cesta k obrázku (volitelné)
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={image}
                onChange={(e) => setImage(e.target.value)}
                placeholder="/charger.png nebo https://..."
                className="flex-1 px-4 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-[#e5a995]"
              />
              {previewImage && (
                <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/10 p-1 flex items-center justify-center shrink-0">
                  <img src={previewImage} alt="Náhled" className="w-full h-full object-contain" />
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="active-toggle"
              checked={active}
              onChange={(e) => setActive(e.target.checked)}
              className="w-4 h-4 rounded accent-[#e5a995] cursor-pointer"
            />
            <label htmlFor="active-toggle" className="text-sm text-slate-300 cursor-pointer">
              Aktivní výhra (zobrazuje se na kole)
            </label>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-sm font-medium text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 transition-colors"
            >
              Zrušit
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-gradient-to-r from-[#e5a995] to-[#d68c74] text-slate-950 shadow-lg shadow-orange-950/20 hover:opacity-95 transition-opacity"
            >
              {isEditing ? 'Uložit změny' : 'Vytvořit výhru'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
