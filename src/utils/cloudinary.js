import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_SECRET,
});

export const uploadCloudinary = async (localFilePath) => {
  try {
    console.log("Uploading to Cloudinary: " + localFilePath);
    if (!localFilePath) {
      console.error("Local file path is not provided.");
      return null;
    }

    // Upload file to Cloudinary
    const response = await cloudinary.uploader.upload(localFilePath, {
      resource_type: "auto",
      folder: "SiletTube",
    });

    console.log("File uploaded successfully: " + response.url);

    // Delete local file after upload
    fs.unlinkSync(localFilePath);
    console.log("Local file deleted: " + localFilePath);

    return response;
  } catch (error) {
    console.error("Error uploading file to Cloudinary:", error);

    // Attempt to delete the local file in case of an error
    if (fs.existsSync(localFilePath)) {
      fs.unlinkSync(localFilePath);
      console.log("Local file deleted after error: " + localFilePath);
    }

    return null;
  }
};
