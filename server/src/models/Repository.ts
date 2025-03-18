import mongoose, { Document, Schema } from 'mongoose';

export interface IRepository extends Document {
  owner: mongoose.Types.ObjectId;
  name: string;
  fullName: string;
  description: string;
  githubId: string;
  isPrivate: boolean;
  language: string;
  url: string;
  cloneUrl: string;
  defaultBranch: string;
  stars: number;
  forks: number;
  size: number;
  createdAt: Date;
  updatedAt: Date;
  lastAnalyzedAt?: Date;
}

const RepositorySchema: Schema = new Schema(
  {
    owner: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    fullName: {
      type: String,
      required: true,
    },
    description: {
      type: String,
    },
    githubId: {
      type: String,
      required: true,
    },
    isPrivate: {
      type: Boolean,
      default: false,
    },
    language: {
      type: String,
    },
    url: {
      type: String,
      required: true,
    },
    cloneUrl: {
      type: String,
      required: true,
    },
    defaultBranch: {
      type: String,
      default: 'main',
    },
    stars: {
      type: Number,
      default: 0,
    },
    forks: {
      type: Number,
      default: 0,
    },
    size: {
      type: Number,
      default: 0,
    },
    lastAnalyzedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Create a compound index on owner and name
RepositorySchema.index({ owner: 1, name: 1 }, { unique: true });

export default mongoose.model<IRepository>('Repository', RepositorySchema);
