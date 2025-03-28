import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IIngestedRepository extends Document {
  repository: Types.ObjectId | string;  // Reference to Repository model (if authenticated)
  repositoryUrl: string;  // For public repositories without auth
  user: Types.ObjectId | string | null;  // Reference to User model (may be null for public repos)
  processingId: string;  // The UUID used for processing
  ingestData: {
    content?: any;  // Updated to accept any type (string or object)
    summary?: any;
    fileTree?: object;
    stats?: object;
    metadata?: object;
  };
  githubMetadata?: {
    repositoryId?: string;     // GitHub's repository ID
    ownerName?: string;        // Repository owner
    repoName?: string;         // Repository name
    fullName?: string;         // Full repository name (owner/repo)
    defaultBranch?: string;    // Default branch (usually 'main' or 'master')
    commitHash?: string;       // The specific commit that was analyzed
    commitMessage?: string;    // The message of the commit
    commitDate?: Date;         // When the commit was made
    stars?: number;            // Repository stars count
    forks?: number;            // Number of forks
    issues?: number;           // Open issues count
    lastUpdated?: Date;        // Last update time from GitHub
    isPrivate?: boolean;       // Whether the repository is private
    description?: string;      // Repository description
  };
  isPublic: boolean;  // Whether this was ingested as a public repo
  createdAt: Date;
  updatedAt: Date;
}

const IngestedRepositorySchema = new Schema<IIngestedRepository>(
  {
    repository: {
      type: Schema.Types.ObjectId,
      ref: 'Repository',
      required: false,  // Not required for public repos
    },
    repositoryUrl: {
      type: String,
      required: true,
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: false,  // May be null for public repos
    },
    processingId: {
      type: String,
      required: true,
      unique: true,
    },
    ingestData: {
      content: Schema.Types.Mixed,  // Changed from String to Mixed to accept any type
      summary: Schema.Types.Mixed,  // Changed to Mixed as well
      fileTree: Schema.Types.Mixed,
      stats: Schema.Types.Mixed,
      metadata: Schema.Types.Mixed,
    },
    githubMetadata: {
      repositoryId: String,
      ownerName: String,
      repoName: String,
      fullName: String,
      defaultBranch: String,
      commitHash: String,
      commitMessage: String,
      commitDate: Date,
      stars: Number,
      forks: Number,
      issues: Number,
      lastUpdated: Date,
      isPrivate: Boolean,
      description: String
    },
    isPublic: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,  // Automatically add createdAt and updatedAt
  }
);

// Index for faster lookups
IngestedRepositorySchema.index({ repository: 1 });
IngestedRepositorySchema.index({ processingId: 1 }, { unique: true });
IngestedRepositorySchema.index({ user: 1 });
IngestedRepositorySchema.index({ 'githubMetadata.fullName': 1 });  // Add index for GitHub repo full name

export default mongoose.model<IIngestedRepository>('IngestedRepository', IngestedRepositorySchema);
