import multer from "multer";
import { GridFsStorage } from "multer-gridfs-storage";
import fs from "fs";
import mongoose from "mongoose";

// Ensure the directory exists
// const uploadDir = "./public/temp";
// if (!fs.existsSync(uploadDir)) {
//   fs.mkdirSync(uploadDir, { recursive: true });
// }

const storage = new GridFsStorage({
  url: process.env.MONGO_URI,
  options: { useNewUrlParser: true, useUnifiedTopology: true },
  file: (req, file) => {
    return {
      bucketName: "uploads", // Name of the MongoDB collection
      filename: file.originalname, // Name of the file saved to MongoDB
    };
  },
});

// Configure multer storage
// const storage = multer.diskStorage({
//   destination: function (req, file, cb) {
//     cb(null, uploadDir);
//   },
//   filename: function (req, file, cb) {
//     cb(null, file.originalname);
//   },
// });

export const upload = multer({ storage });
