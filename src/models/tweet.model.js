import mongoose, { Schema } from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";

const tweetSchema = new Schema(
  {
    content: { type: String, required: true, lowercase: true },

    owner: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    isLiked: { type: Boolean },
    totalLike: { type: Number },
    totalDisLikes: { type: Number },
  },
  { timestamps: true }
);

export const Tweet = mongoose.model("Tweet", tweetSchema);
