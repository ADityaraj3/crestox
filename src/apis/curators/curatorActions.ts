import instance from '@/utils/apiCalls';
import { CURATOR_URLS } from './curatorUrls';

export interface CuratorOnboardingState {
    last_completed_step: number;
    curator_profile_id: number | null;
    is_approved: boolean;
    step1: {
        curator_name: string;
        bio: string;
        collector_message: string;
        avatar_media_id: number | null;
        avatar_url?: string | null;
    };
    step2: {
        exhibitions: Array<{
            title: string;
            media_id: number | null;
            media_url?: string | null;
            media_original_name?: string | null;
        }>;
        publications: Array<{
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
        curatorial_focus: string;
        years_of_experience: number | null;
        institution_affiliation: string;
    };
}

export const getCuratorOnboardingState = () => async (): Promise<CuratorOnboardingState> => {
    const response = await instance.get<{ data?: CuratorOnboardingState }>(CURATOR_URLS.MY_ONBOARDING);
    const payload = response.data?.data as CuratorOnboardingState | undefined;
    if (!payload) {
        throw new Error('Missing onboarding payload');
    }
    return payload;
};

export const submitCuratorOnboardingStep1 =
    (data: { curator_name: string; bio: string; collector_message?: string; avatar_media_id?: number | null }) =>
    async () => {
        return instance.post(CURATOR_URLS.ONBOARDING_STEP_1, data);
    };

export const submitCuratorOnboardingStep2 =
    (data: {
        exhibitions?: Array<{ title: string; description?: string; media_id?: number }>;
        publications?: Array<{ title: string; description?: string; media_id?: number }>;
    }) =>
    async () => {
        return instance.patch(CURATOR_URLS.ONBOARDING_STEP_2, data);
    };

export const submitCuratorOnboardingStep3 =
    (data: {
        social_links?: Array<{ platform: string; url: string }>;
        location?: string;
        website_portfolio_link?: string;
        curatorial_focus?: string;
        years_of_experience?: number | null;
        institution_affiliation?: string;
    }) =>
    async () => {
        return instance.patch(CURATOR_URLS.ONBOARDING_STEP_3, data);
    };

export const getCuratorBasicDetails = (id: number) => async () => {
    const response = await instance.get(CURATOR_URLS.BASIC_DETAILS(id));
    return response.data?.data ?? null;
};
