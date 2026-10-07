import instance from "@/utils/apiCalls";
import { USER_URLS } from "./userUrls";

export type NotificationPreferences = {
    sale_notifications: boolean;
    price_alerts: boolean;
    curator_updates: boolean;
    login_alerts: boolean;
};

export const getProfile = () => async () => {
    try {
        const response = await instance.get(USER_URLS.GET_PROFILE);
        return response;
    } catch (err: any) {
        throw err;
    }
}

export const getNotificationPreferences = async (): Promise<NotificationPreferences> => {
    const response = await instance.get(USER_URLS.GET_NOTIFICATION_PREFERENCES);
    return response.data?.data ?? response.data;
};

export const updateNotificationPreferences = async (
    data: Partial<NotificationPreferences>,
): Promise<NotificationPreferences> => {
    const response = await instance.patch(USER_URLS.UPDATE_NOTIFICATION_PREFERENCES, data);
    return response.data?.data ?? response.data;
};

export type BillingDetails = { billing_state_code: string | null; gstin: string | null };

/** Billing state decides IGST (other state) vs CGST + SGST on your invoices. */
export const updateBillingDetails = async (data: Partial<BillingDetails>): Promise<{ updated: boolean }> => {
    const response = await instance.patch(USER_URLS.UPDATE_BILLING, data);
    return response.data?.data ?? response.data;
};
