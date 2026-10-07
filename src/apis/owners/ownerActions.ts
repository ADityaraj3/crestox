import instance from '@/utils/apiCalls';
import { OWNER_URLS } from './ownerUrls';

export interface OwnerOnboardingState {
    last_completed_step: number;
    owner_profile_id: number | null;
    is_approved: boolean;
    step1: {
        owner_name: string;
        bio: string;
        collector_message: string;
        avatar_media_id: number | null;
        avatar_url?: string | null;
    };
    step2: {
        collection_items: Array<{
            artwork_name: string;
            artwork_image_media_id: number | null;
            proof_of_sale_media_id: number | null;
            acquisition_value: number | null;
            artwork_image_url?: string | null;
            proof_of_sale_url?: string | null;
            proof_of_sale_original_name?: string | null;
        }>;
        highlights: Array<{
            title: string;
            media_id: number | null;
            media_url?: string | null;
            media_original_name?: string | null;
        }>;
    };
    step3: {
        social_links: Array<{ platform: string; url: string }>;
        location: string;
        website_portfolio_link: string;
        collection_focus: string;
        years_collecting: number | null;
        collection_size: string;
    };
}

export const getOwnerOnboardingState = () => async (): Promise<OwnerOnboardingState> => {
    const response = await instance.get<{ data?: OwnerOnboardingState }>(OWNER_URLS.MY_ONBOARDING);
    const payload = response.data?.data as OwnerOnboardingState | undefined;
    if (!payload) {
        throw new Error('Missing onboarding payload');
    }
    return payload;
};

export const submitOwnerOnboardingStep1 =
    (data: { owner_name: string; bio: string; collector_message?: string; avatar_media_id?: number | null }) =>
    async () => {
        return instance.post(OWNER_URLS.ONBOARDING_STEP_1, data);
    };

export const submitOwnerOnboardingStep2 =
    (data: {
        collection_items?: Array<{
            artwork_name: string;
            artwork_image_media_id?: number;
            proof_of_sale_media_id?: number;
            acquisition_value?: number;
        }>;
        highlights?: Array<{ title: string; description?: string; media_id?: number }>;
    }) =>
    async () => {
        return instance.patch(OWNER_URLS.ONBOARDING_STEP_2, data);
    };

export const submitOwnerOnboardingStep3 =
    (data: {
        social_links?: Array<{ platform: string; url: string }>;
        location?: string;
        website_portfolio_link?: string;
        collection_focus?: string;
        years_collecting?: number | null;
        collection_size?: string;
    }) =>
    async () => {
        return instance.patch(OWNER_URLS.ONBOARDING_STEP_3, data);
    };

export const getOwnerBasicDetails = (id: number) => async () => {
    const response = await instance.get(OWNER_URLS.BASIC_DETAILS(id));
    return response.data?.data ?? null;
};
