import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_SECRET,
});

export const uploadCloudinary = async (LocalFilePath) => {
  try {
    if (!LocalFilePath) return null;
    // upload file on cloudinary
    const response = await cloudinary.uploader.upload(LocalFilePath, {
      resource_type: "auto",
      public_id: "SilentVoice1",
    });
    console.log("FIle is uploaded successfully ", response.url);

    return response.secure_url;
  } catch (error) {
    // remove the locally saved temporary file
    fs.unlinkSync(LocalFilePath);
    return null;
  }
};
