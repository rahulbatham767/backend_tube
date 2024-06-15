import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import asyncHandler from "../utils/asyncHandler.js";
import { uploadCloudinary } from "../utils/cloudinary.js";
import { User } from "../models/user.model.js";
import jwt from "jsonwebtoken";
const generateAccessTokenAndRefreshToken = async (userId) => {
  try {
    const user = await User.findOne(userId);
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });
    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(
      500,
      " Something went wrong while generating refresh and access token"
    );
  }
};

export const registerUser = asyncHandler(async (req, res) => {
  // get details from frontend
  const { fullName, username, email, password } = req.body;

  console.log(req.body);

  // validation of fields

  if (
    [fullName, username, email, password].some((field) => field?.trim() === "")
  ) {
    throw new ApiError(400, "All Fields are required");
  }

  // User is exist or not
  const existUser = await User.findOne({
    $or: [{ email }, { username }],
  });

  if (existUser) {
    throw new ApiError(409, "User with email or username already exists");
  }

  //  fetching avatar
  const avatarLocalPath = req.files?.avatar[0]?.path;
  const coverImageLocalPath = req.files?.coverImage[0]?.path;

  // check avatar local path

  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar local File is Required");
  }
  if (!coverImageLocalPath) {
    throw new ApiError(400, "cover image local File is Required");
  }

  // uploading avatar and cover to cloud
  const [avatar, coverImage] = await Promise.all([
    uploadCloudinary(avatarLocalPath),
    coverImageLocalPath
      ? uploadCloudinary(coverImageLocalPath)
      : Promise.resolve(""),
  ]);

  if (!avatar) {
    throw new ApiError(400, "Avatar File is Required");
  }

  if (!coverImage) {
    throw new ApiError(400, "cover image File is Required");
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
    throw new ApiError(500, "Something went wrong while creating the user");
  }

  return res
    .status(201)
    .json(new ApiResponse(200, createdUser, "User Registered Successfully"));
});
export const loginUser = asyncHandler(async (req, res) => {
  // getting data
  const { email, username, password } = req.body;
  console.log(req.body);

  if (!(username && email)) {
    throw new ApiError(400, "Username or email is required");
  }

  //find the user
  const user = await User.findOne({ $or: [{ email }, { username }] });
  if (!user) {
    throw new ApiError(401, "User Does not exist");
  }

  // password check

  const passValid = await user.isPasswordCorrect(password);
  console.log(passValid);

  if (!passValid) {
    throw new ApiError(401, "Invalid User Credentials");
  }

  // getting access token and refresh token
  const { accessToken, refreshToken } =
    await generateAccessTokenAndRefreshToken(user._id);

  // updating User
  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  // cookie
  const options = { httpOnly: true, secure: true };
  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        200,
        {
          user: loggedInUser,
          accessToken,
          refreshToken,
        },
        "User logged In successfully"
      )
    );
});

export const logoutUser = asyncHandler(async (req, res) => {
  console.log("logout user");
  console.log(req.user);

  await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: { refreshToken: undefined },
    },
    { new: true }
  );
  const options = {
    httpOnly: true,
    secure: true,
  };
  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("RefreshToken", options)
    .json(new ApiResponse(200, {}, "User Logged Out Successfully"));
});

export const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken =
    req.cookies.refreshToken || req.body.refreshToken;
  if (incomingRefreshToken) {
    throw new ApiError(401, "Unauthorized Request");
  }
  try {
    const decodedToken = await jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );

    const user = await User.findById(decodedToken?.id);
    if (!user) {
      throw new ApiError(401, "Invalid Refresh Token");
    }

    if (incomingRefreshToken !== user?.refreshToken) {
      throw new ApiError(401, " Refresh Token us expired or used");
    }

    const options = {
      https: true,
      secure: true,
    };
    const { accessToken, newRefreshToken } =
      await generateAccessTokenAndRefreshToken(user._id);
    return res
      .status(200)
      .cookie("accessToken", accessToken)
      .cookie("RefreshToken", newRefreshToken)
      .json(
        new ApiResponse(
          200,
          { accessToken, newRefreshToken },
          "Access Token Refreshed"
        )
      );
  } catch (error) {
    throw new ApiError(401, error?.message || "Invalid refresh token");
  }
});
