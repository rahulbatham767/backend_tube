import multer from "multer";
import fs from "fs";
import mongoose from "mongoose";

// Ensure the directory exists
// const uploadDir = "./public/temp";

// if (!fs.existsSync(uploadDir)) {
//   fs.mkdirSync(uploadDir, { recursive: true });
// }

// Configure multer storage
// const storage = multer.diskStorage({
//   destination: function (req, file, cb) {
//     console.log(req.files.path);
//     cb(null, uploadDir);
//   },
//   filename: function (req, file, cb) {
//     cb(null, file.originalname);
//   },
// });
const storage = multer.memoryStorage();
export const upload = multer({ storage });
