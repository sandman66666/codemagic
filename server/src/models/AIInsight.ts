import mongoose, { Document, Schema } from 'mongoose';

export interface IAIInsight extends Document {
  repositoryUrl: string;
  userId?: string;  // Optional - can be null for anonymous users
  insights: string;
  createdAt: Date;
  updatedAt: Date;
}

const AIInsightSchema: Schema = new Schema(
  {
    repositoryUrl: {
      type: String,
      required: true,
      index: true,
    },
    userId: {
      type: String,
      required: false,  // Make it optional
      index: true
    },
    insights: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Create a compound index for faster lookups
AIInsightSchema.index({ repositoryUrl: 1, userId: 1 });

const AIInsight = mongoose.model<IAIInsight>('AIInsight', AIInsightSchema);

export default AIInsight;
