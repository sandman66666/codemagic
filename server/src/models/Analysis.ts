import mongoose, { Document, Schema } from 'mongoose';

export interface IAnalysis extends Document {
  repository: mongoose.Types.ObjectId;
  user: mongoose.Types.ObjectId;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  branch: string;
  commit: string;
  startedAt: Date;
  completedAt?: Date;
  summary?: {
    quality: string;
    security: string;
    complexity: string;
    lines: number;
    files: number;
    issues: number;
    vulnerabilities: number;
  };
  vulnerabilities?: Array<{
    severity: 'High' | 'Medium' | 'Low';
    title: string;
    description: string;
    location: string;
    line: number;
  }>;
  codeQuality?: Array<{
    type: 'Improvement' | 'Warning' | 'Error';
    title: string;
    description: string;
    location: string;
    line: number;
  }>;
  keyFiles?: Array<{
    path: string;
    description: string;
    size: string;
  }>;
  keyInsights?: string[];
  documentation?: {
    overview: string;
    architecture: string;
    setup: string;
    deployment: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

const AnalysisSchema: Schema = new Schema(
  {
    repository: {
      type: Schema.Types.ObjectId,
      ref: 'Repository',
      required: true,
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed'],
      default: 'pending',
    },
    branch: {
      type: String,
      required: true,
    },
    commit: {
      type: String,
      required: true,
    },
    startedAt: {
      type: Date,
      default: Date.now,
    },
    completedAt: {
      type: Date,
    },
    summary: {
      quality: String,
      security: String,
      complexity: String,
      lines: Number,
      files: Number,
      issues: Number,
      vulnerabilities: Number,
    },
    vulnerabilities: [
      {
        severity: {
          type: String,
          enum: ['High', 'Medium', 'Low'],
        },
        title: String,
        description: String,
        location: String,
        line: Number,
      },
    ],
    codeQuality: [
      {
        type: {
          type: String,
          enum: ['Improvement', 'Warning', 'Error'],
        },
        title: String,
        description: String,
        location: String,
        line: Number,
      },
    ],
    keyFiles: [
      {
        path: String,
        description: String,
        size: String,
      },
    ],
    keyInsights: [String],
    documentation: {
      overview: String,
      architecture: String,
      setup: String,
      deployment: String,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model<IAnalysis>('Analysis', AnalysisSchema);
