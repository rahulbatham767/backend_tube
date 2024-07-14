import mongoose, { Schema } from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";

const videSchema = new Schema(
  {
    videoFile: {
      type: String,
      required: true,
    },
    thumbnail: {
      type: String,
      required: true,
    },
    title: {
      type: String,
      required: true,
      index: true,
    },

    description: {
      type: String,
      required: true,
    },
    duration: {
      type: Number,
      required: true,
    },
    views: {
      type: Number,
      default: 0,
    },
    isPublished: {
      type: Boolean,
      default: true,
    },
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

// Define text index on title and description fields
videSchema.index({ title: "text", description: "text" });

videSchema.plugin(mongooseAggregatePaginate);
export const Video = mongoose.model("Video", videSchema);
