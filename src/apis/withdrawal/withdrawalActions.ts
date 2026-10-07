import instance from '@/utils/apiCalls';
import { WITHDRAWAL_URLS } from './withdrawalUrls';

export interface AvailableWithdrawalResponse {
  total_earnings_from_sales: string;
  total_withdrawn: string;
  pending_withdrawal: string;
  wallet_balance: string;
  available_to_withdraw: string;
  withdrawal_platform_fee_rate?: string;
}

export interface PaymentMethod {
  id: number;
  account_type: string | null;
  bank_account_name: string | null;
  bank_account_number: string | null;
  bank_ifsc: string | null;
  upi_id: string | null;
  is_active: boolean;
}

export interface BankDetailsStatus {
  has_fund_account: boolean;
  account_type?: string | null;
  bank_account_name: string | null;
  bank_account_number: string | null;
  bank_ifsc: string | null;
  upi_id: string | null;
  methods?: PaymentMethod[];
}

export interface SubmitBankDetailsDto {
  /** Token from the emailed bank-details link; required by the API. */
  verification_token: string;
  account_holder_name: string;
  account_number?: string;
  ifsc?: string;
  upi_id?: string;
  upi_phone_number?: string;
}

export interface CreateWithdrawalDto {
  amount: number;
  user_note?: string;
}

export interface WithdrawalRequest {
  id: number;
  amount: string;
  status: string;
  admin_note: string | null;
  created_at: string;
}

export const getAvailableWithdrawalAmount = async (
  source?: 'artist' | 'collector',
): Promise<AvailableWithdrawalResponse> => {
  const response = await instance.get(WITHDRAWAL_URLS.GET_AVAILABLE_AMOUNT, {
    params: source ? { source } : undefined,
  });
  return response.data?.data ?? response.data;
};

export const getBankDetailsStatus = async (): Promise<BankDetailsStatus> => {
  const response = await instance.get(WITHDRAWAL_URLS.GET_BANK_DETAILS);
  return response.data?.data ?? response.data;
};

export const submitBankDetails = async (data: SubmitBankDetailsDto) => {
  const response = await instance.post(WITHDRAWAL_URLS.SUBMIT_BANK_DETAILS, data);
  return response.data?.data ?? response.data;
};

export const sendBankDetailsLink = async (
  options?: { add_method?: boolean },
): Promise<{ message: string }> => {
  const response = await instance.post(
    WITHDRAWAL_URLS.SEND_BANK_DETAILS_LINK,
    options?.add_method ? { add_method: true } : undefined,
  );
  return response.data?.data ?? response.data;
};

export const setDefaultPaymentMethod = async (
  id: number,
): Promise<{ message: string }> => {
  const response = await instance.patch(WITHDRAWAL_URLS.SET_DEFAULT_PAYMENT_METHOD(id));
  return response.data?.data ?? response.data;
};

export const createWithdrawalRequest = async (data: CreateWithdrawalDto) => {
  const response = await instance.post(WITHDRAWAL_URLS.CREATE_REQUEST, data);
  return response.data?.data ?? response.data;
};

export const getMyWithdrawalRequests = async (params?: { status?: string; page?: number; limit?: number }) => {
  const response = await instance.get(WITHDRAWAL_URLS.GET_MY_REQUESTS, { params });
  return response.data?.data ?? response.data;
};

export const cancelWithdrawalRequest = async (id: number) => {
  const response = await instance.delete(WITHDRAWAL_URLS.CANCEL_REQUEST(id));
  return response.data?.data ?? response.data;
};
