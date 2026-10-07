import instance from '@/utils/apiCalls';

export interface ResaleFeePreview {
  crestox_fee_percentage: number;
  royalty_enabled: boolean;
  royalty_percentage: number;
  /** Fixed fee (₹) charged instead of the % fee when the sale is below cost. */
  loss_making_fee?: number;
  tds_percentage?: number;
  gross_amount?: string;
  /** Purchase cost of the shares being sold (first-in, first-out lots). */
  cost_basis?: string | null;
  loss_making?: boolean;
  platform_fee_amount?: string;
  crestox_fee_amount?: string;
  royalty_amount?: string;
  tds_amount?: string;
  net_payout?: string;
}

export async function getResaleFeePreview(
  artistProfileId: number,
  grossAmount?: number,
  opts: { artworkId?: number; quantity?: number } = {},
): Promise<ResaleFeePreview> {
  const params: Record<string, number> = {};
  if (grossAmount != null) params.gross_amount = grossAmount;
  if (opts.artworkId) params.artwork_id = opts.artworkId;
  if (opts.quantity) params.quantity = opts.quantity;
  const response = await instance.get(`/trading/resale-fees/${artistProfileId}`, {
    params: Object.keys(params).length ? params : undefined,
  });
  return response.data?.data ?? response.data;
}
