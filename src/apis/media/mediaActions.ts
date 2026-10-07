import instance from "@/utils/apiCalls";
import { MEDIA_URLS } from "./mediaUrls";

export interface MediaUploadResponseItem {
    media_id: number;
    file_path: string;
}

export interface MediaUploadResponse {
    success: boolean;
    message: string;
    data: MediaUploadResponseItem[];
}

export const uploadMedia = (file: File) => async () => {
    try {
        const formData = new FormData();
        formData.append("file", file);

        const response = await instance.post<MediaUploadResponse>(MEDIA_URLS.UPLOAD, formData);
        return response;
    } catch (err: any) {
        console.log({ err });
        throw err;
    }
};

/** Upload multiple files to Cloudinary. Returns array of { media_id, file_path } */
export const uploadMediaFiles = (files: File[]) => async (): Promise<MediaUploadResponse> => {
    try {
        const formData = new FormData();
        files.forEach((file) => formData.append("file", file));

        const response = await instance.post<MediaUploadResponse>(MEDIA_URLS.UPLOAD, formData);
        return response.data;
    } catch (err: any) {
        console.log({ err });
        throw err;
    }
};
