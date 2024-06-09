import { ApiResponse } from "../apiResponse.js";
import asyncHandler from "../asyncHandler.js";
import { uploadCloudinary } from "../cloudinary.js";
import { User } from "../models/user.model.js";
import { apiError } from "../utils/apiError.js";

export const registerUser = asyncHandler(async (req, res) => {
  // get details from frontend
  const { fullName, username, email, password } = req.body;

  // validation of fields

  if (
    [fullName, username, email, password].some((field) => field?.trim() === "")
  ) {
    throw new apiError(400, "All Fields are required");
  }

  // User is exist or not
  const existUser = User.findOne({
    $or: [{ email }, { username }],
  });

  if (existUser) {
    throw new apiError(409, "User with email or username already exists");
  }

  //  fetching avatar
  const avatarLocalPath = req.files?.avatar[0]?.path;
  const coverImageLocalPath = req.files?.coverImage[0]?.path;

  // check avatar local path

  if (!avatarLocalPath) {
    throw new apiError(400, "Avatar File is Required");
  }

  // uploading avatar and cover to cloud
  const avatar = await uploadCloudinary(avatarLocalPath);

  const coverImage = await uploadCloudinary(coverImageLocalPath);

  if (!avatar) {
    throw new apiError(400, "Avatar File is Required");
  }

  if (!coverImageLocalPath) {
    throw new apiError(400, "Avatar File is Required");
  }

  if (!coverImage) {
    throw new apiError(400, "Avatar File is Required");
  }

  const user = await User.create({
    fullName,
    email,
    password,
    avatar,
    coverImage: coverImage || "",
    username: username.toLowerCase(),
  });

  // remove password and refresh token fields

  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  if (!createdUser) {
    throw new apiError(500, "Something went wrong while creating the user");
  }

  return res
    .status(201)
    .json(new apiResponse(200, createdUser, "User Registered Successfully"));
});
