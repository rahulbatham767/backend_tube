import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import asyncHandler from "../utils/asyncHandler.js";
import { uploadCloudinary } from "../utils/cloudinary.js";
import { User } from "../models/user.model.js";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
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

  // validation of fields

  try {
    if (
      [fullName, username, email, password].some(
        (field) => field?.trim() === ""
      )
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

    if (!avatar?.url) {
      throw new ApiError(400, "Avatar File is Required");
    }

    if (!coverImage?.url) {
      throw new ApiError(400, "cover image File is Required");
    }

    const user = await User.create({
      fullName,
      email,
      password,
      avatar: avatar?.url || "",
      coverImage: coverImage?.url || "",
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
  } catch (error) {
    console.log("An error occurred while registering user " + error);
    throw new ApiError(500, "Something went wrong while creating the user");
  }
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
      $unset: { refreshToken: 1 }, //this remove the field from the document
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
  if (!incomingRefreshToken) {
    throw new ApiError(401, "Unauthorized Request");
  }
  try {
    const decodedToken = await jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );

    const user = await User.findById(decodedToken?._id);
    if (!user) {
      throw new ApiError(401, "Invalid Refresh Token");
    }
    console.log(user);

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
      .cookie("accessToken", accessToken, options)
      .cookie("RefreshToken", newRefreshToken, options)
      .json(
        new ApiResponse(
          200,
          { accessToken, newRefreshToken },
          "Access Token Refreshed"
        )
      );
  } catch (error) {
    throw new ApiError(401, error || "Invalid refresh token");
  }
});

export const changeCurrentPassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  console.log(oldPassword, newPassword);

  const user = await User.findById(req.user?._id);
  const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);
  if (!isPasswordCorrect) {
    throw new ApiError(401, "Invalid old password");
  }
  user.password = newPassword;
  await user.save({ validateBeforeSave: false });
  res
    .status(200)
    .json(new ApiResponse(200, {}, "Password Changed successfully"));
});

export const getCurrentUser = asyncHandler(async (req, res) => {
  console.log(req.body);

  res
    .status(200)

    .json(
      new ApiResponse(
        200,
        { data: req.user },
        "Current User Fetched Successfully"
      )
    );
});

export const updateAccountDetails = asyncHandler(async (req, res) => {
  const { fullName, email } = req.body;
  if (!fullName || !email) {
    throw new ApiError(400, "All fields are required");
  }
  const updateUser = await User.findByIdAndUpdate(
    req.user?._id,
    { $set: { email, fullName } },
    { new: true }
  ).select("-password");
  return res
    .status(200)
    .json(
      new ApiResponse(200, updateUser, "Account details updated Successfully")
    );
});

export const updateUserAvatar = asyncHandler(async (req, res) => {
  const avatarLocalPath = req.file?.path;
  if (!avatarLocalPath) {
    throw new ApiError(401, "User Avatar is not available");
  }
  try {
    const avatar = await uploadCloudinary(avatarLocalPath);
    console.log("avatar " + avatar);

    if (!avatar?.url) {
      throw new ApiError(401, "Error while uploading the avatar ");
    }

    const updateAvatar = await User.findByIdAndUpdate(
      req.user?._id,
      { $set: { avatar: avatar?.url } },
      { new: true }
    ).select("-password");

    return res
      .status(200)
      .json(new ApiResponse(200, updateAvatar, "Avatar updated successfully"));
  } catch (error) {
    throw new ApiError(401, "Error updating avatar " + error);
  }
});
export const updateCoverImage = asyncHandler(async (req, res) => {
  const coverImageLocalPath = req.file?.path;
  if (!coverImageLocalPath) {
    throw new ApiError(401, "User Avatar is not available");
  }
  const coverImage = await uploadCloudinary(coverImageLocalPath);
  if (!coverImage?.url) {
    throw new ApiError(401, "Error while uploading the avatar");
  }

  const updateCoverImage = await User.findByIdAndUpdate(
    req.user?._id,
    { $set: { coverImage: coverImage?.url } },
    { new: true }
  ).select("-password");
  return res
    .status(200)
    .json(
      new ApiResponse(200, updateCoverImage, "Cover image updated successfully")
    );
});

export const getUserChannnelInfo = asyncHandler(async (req, res) => {
  const { username } = req.params;
  if (!username?.trim()) {
    throw new ApiError(401, "Username is missing");
  }

  // now we will match the username in document and take all the document
  try {
    const channel = await User.aggregate([
      { $match: { username: username?.toLowerCase() } },
      {
        $lookup: {
          from: "subscriptions",
          localField: "_id",
          foreignField: "channel",
          as: "subscribers",
        },
      },
      {
        $lookup: {
          from: "subscriptions",
          localField: "_id",
          foreignField: "subscriber",
          as: "subscribedTo",
        },
      },
      {
        $addFields: {
          subscribersCount: { $size: "$subscribers" },
          channelSubscribedToCount: { $size: "$subscribedTo" },
          isSubscribed: {
            $cond: {
              if: { $in: [req.user?.id, "$subscribers.subscriber"] },
              then: true,
              else: false,
            },
          },
        },
      },

      {
        $project: {
          fullName: 1,
          username: 1,
          subscribersCount: 1,
          channelSubscribedToCount: 1,
          isSubscribed: 1,
          avatar: 1,
          coverImage: 1,
          email: 1,
        },
      },
    ]);
    if (!channel?.length) {
      throw new ApiError(401, "Channel does not exist");
    }
    return res
      .status(200)
      .json(
        new ApiResponse(200, channel[0], "User channel Fetched Suscessfully")
      );
  } catch (error) {
    throw new ApiError(401, error + " Error fetching channel information");
  }
});

export const getWatchHistory = asyncHandler(async (req, res) => {
  const user = await User.aggregate([
    // we get string from mongo so we need to convert it to mongo object id
    { $match: { _id: new mongoose.Types.ObjectId(req.user?._id) } },
    {
      // finding watch history
      $lookup: {
        from: "videos",
        localField: "watchHistory",
        foreignField: "_id",
        as: "watchHistory",
        // to get the owner data we need to lookup for it
        pipeline: [
          {
            $lookup: {
              from: "users",
              localField: "owner",
              foreignField: "_id",
              as: "owner",
              // for taking only userful data
              pipeline: [
                {
                  $project: {
                    avatar: 1,
                    fullName: 1,
                    username: 1,
                  },
                },
              ],
            },
          },

          // simply the owner fields for the user

          {
            $addFields: {
              owner: { $first: "$owner" },
            },
          },
        ],
      },
    },
  ]);
  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        user[0].watchHistory,
        "watch history fetched successfully  "
      )
    );
});
