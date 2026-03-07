import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Uploads a base64 image string to Cloudinary.
 * @param base64Image The image data (with or without data:image/... prefix)
 * @param folder The folder in Cloudinary to store the image
 * @returns The secure URL of the uploaded image or null on failure
 */
export async function uploadToCloudinary(base64Image: string | undefined | null, folder: string = 'looto') {
  if (!base64Image) return null;
  
  try {
    // Cloudinary uploader.upload accepts base64 strings
    const result = await cloudinary.uploader.upload(base64Image, {
      folder,
      resource_type: 'auto', // Auto-detect image/video/etc
    });
    return result.secure_url;
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    return null;
  }
}
