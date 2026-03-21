interface Props {
  productName: string;
  brand: string;
  priceInr: number;
  imageUrl: string | null;
  quantity: number;
  onQuantityChange: (q: number) => void;
  onAddToCart: () => void;
  loading: boolean;
  success: boolean;
  error: string | null;
}

import QuantitySelector from "./QuantitySelector";
import { ShoppingBag, Package } from "lucide-react";

export default function ReorderProductCard({
  productName,
  brand,
  priceInr,
  quantity,
  onQuantityChange,
  onAddToCart,
  loading,
  success,
  error,
}: Props) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden max-w-sm w-full mx-auto">
      <div className="bg-gradient-to-br from-violet-50 to-slate-100 h-48 flex items-center justify-center">
        <Package className="w-20 h-20 text-slate-300" strokeWidth={1} />
      </div>

      <div className="p-6 space-y-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-violet-500 mb-1">
            {brand}
          </p>
          <h2 className="text-lg font-semibold text-slate-800 leading-snug">
            {productName}
          </h2>
        </div>

        <p className="text-2xl font-bold text-slate-900">
          ₹{priceInr.toLocaleString("en-IN")}
        </p>

        <div className="flex items-center justify-between">
          <span className="text-sm text-slate-500">Quantity</span>
          <QuantitySelector value={quantity} onChange={onQuantityChange} />
        </div>

        {success ? (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 text-center">
            <p className="text-emerald-700 font-semibold text-sm">
              ✓ Added to cart — proceeding to checkout
            </p>
          </div>
        ) : (
          <>
            <button
              onClick={onAddToCart}
              disabled={loading}
              className={[
                "w-full py-3.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all",
                loading
                  ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                  : "bg-violet-600 hover:bg-violet-700 active:scale-[0.98] text-white shadow-sm",
              ].join(" ")}
            >
              <ShoppingBag className="w-4 h-4" />
              {loading ? "Adding…" : "Add to Cart"}
            </button>
            {error && (
              <p className="text-red-500 text-xs text-center">{error}</p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
