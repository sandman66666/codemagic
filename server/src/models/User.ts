import mongoose, { Document, Schema } from 'mongoose';

export interface IUser extends Document {
  githubId: string;
  username: string;
  displayName: string;
  email: string;
  avatarUrl: string;
  githubToken: string;
  githubRefreshToken?: string;
  isAdmin: boolean;
  favorites: mongoose.Types.ObjectId[] | any[];
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema: Schema = new Schema(
  {
    githubId: {
      type: String,
      required: true,
      unique: true,
    },
    username: {
      type: String,
      required: true,
    },
    displayName: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
    },
    avatarUrl: {
      type: String,
    },
    githubToken: {
      type: String,
      required: true,
    },
    githubRefreshToken: {
      type: String,
    },
    isAdmin: {
      type: Boolean,
      default: false,
    },
    favorites: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Repository',
      default: [],
    }],
  },
  {
    timestamps: true,
  }
);

export default mongoose.model<IUser>('User', UserSchema);
