import React, { useState } from "react";
import { motion } from "framer-motion";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { cancelListing, getMyListings } from "@/apis/my-collection/myCollectionActions";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(value);

export interface MyListing {
  listing_id: number;
  artist_avatar_url: string;
  artist_name: string;
  listing_price: string;
  quantity: number;
  status: string;
}

interface ListedGridProps {}

export const MY_LISTINGS_QUERY_KEY = ["my-listings"] as const;

const ListedGrid: React.FC<ListedGridProps> = () => {
  const queryClient = useQueryClient();
  const [cancellingId, setCancellingId] = useState<number | null>(null);

  // Cached so switching collection tabs does not refetch; creating a listing
  // invalidates this key.
  const { data: myListings = [], isLoading: loading } = useQuery({
    queryKey: MY_LISTINGS_QUERY_KEY,
    queryFn: async (): Promise<MyListing[]> => {
      try {
        const response = await getMyListings();
        const data = response?.data?.data;
        return Array.isArray(data) ? data : [];
      } catch {
        return [];
      }
    },
  });

  const handleCancel = async (listingId: number) => {
    if (cancellingId != null) return;
    setCancellingId(listingId);
    try {
      await cancelListing(listingId);
      queryClient.setQueryData<MyListing[]>(MY_LISTINGS_QUERY_KEY, (items = []) =>
        items.map((item) =>
          item.listing_id === listingId ? { ...item, status: "CANCELLED" } : item,
        ),
      );
      toast.success("Listing cancelled");
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? "Failed to cancel listing");
    } finally {
      setCancellingId(null);
    }
  };

  const items = myListings;

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-6">
        <div className="overflow-x-auto scrollbar-hide">
          <div className="border border-border/50 divide-y divide-border/30 min-w-[600px]">
            <div className="grid grid-cols-6 gap-4 p-4 text-[10px] tracking-widest uppercase text-muted-foreground font-sans">
              <span>Asset</span>
              <span>Listed Price</span>
              <span>Quantity</span>
              <span>Status</span>
              <span>Expires</span>
              <span>Action</span>
            </div>
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="grid grid-cols-6 gap-4 p-4 items-center">
                <div className="flex items-center gap-3">
                  <Skeleton className="w-10 h-10 rounded-sm shrink-0" />
                  <Skeleton className="h-5 w-32" />
                </div>
                <Skeleton className="h-5 w-20" />
                <Skeleton className="h-5 w-8" />
                <Skeleton className="h-5 w-20" />
                <Skeleton className="h-5 w-14" />
                <Skeleton className="h-5 w-16" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-center max-w-7xl mx-auto px-6">
        <span className="text-muted-foreground font-mono text-sm">
          NO ACTIVE LISTINGS
        </span>
        <p className="text-muted-foreground/50 text-xs mt-2 font-sans">
          Items you list for resale will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-6">
      <div className="overflow-x-auto scrollbar-hide">
        <div className="border border-border/50 divide-y divide-border/30 min-w-[600px]">
          <div className="grid grid-cols-6 gap-4 p-4 text-[10px] tracking-widest uppercase text-muted-foreground font-sans">
            <span>Asset</span>
            <span>Listed Price</span>
            <span>Quantity</span>
            <span>Status</span>
            <span>Expires</span>
            <span>Action</span>
          </div>
          {items.map((item, index) => (
            <motion.div
              key={item.listing_id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className="grid grid-cols-6 gap-4 p-4 items-center hover:bg-card/50 transition-colors group"
            >
              <div className="flex items-center gap-3">
                <img
                  src={item.artist_avatar_url}
                  alt={item.artist_name}
                  className="w-10 h-10 object-cover rounded-sm group-hover:scale-110 transition-all duration-500 shrink-0"
                />
                <span className="font-editorial italic text-foreground whitespace-nowrap">
                  {item.artist_name}
                </span>
              </div>
              <span className="font-mono text-sm text-foreground whitespace-nowrap">
                {formatCurrency(parseFloat(item.listing_price) || 0)}
              </span>
              <span className="font-mono text-sm text-muted-foreground">
                {item.quantity}
              </span>
              <span className="text-xs font-mono text-muted-foreground whitespace-nowrap">
                ● {item.status}
              </span>
              <span className="text-xs font-mono text-muted-foreground whitespace-nowrap">
                —
              </span>
              <span>
                {item.status.toUpperCase() === "ACTIVE" ? (
                  <button
                    type="button"
                    onClick={() => handleCancel(item.listing_id)}
                    disabled={cancellingId != null}
                    className="inline-flex items-center gap-1 text-xs text-destructive hover:underline disabled:opacity-50"
                  >
                    {cancellingId === item.listing_id ? (
                      <Loader2 size={12} className="animate-spin" />
                    ) : null}
                    Cancel
                  </button>
                ) : (
                  <span className="text-xs text-muted-foreground">—</span>
                )}
              </span>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ListedGrid;
