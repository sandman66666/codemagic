import express from 'express';
import IngestedRepository from '../models/IngestedRepository';
import mongoose from 'mongoose';
import { logger } from '../utils/logger';

const router = express.Router();

// Public test route - no auth required
router.get('/', async (req, res) => {
  try {
    // Test MongoDB connection
    const dbState = mongoose.connection.readyState;
    const dbStateText = {
      0: 'disconnected',
      1: 'connected',
      2: 'connecting',
      3: 'disconnecting'
    }[dbState] || 'unknown';
    
    logger.info(`[DB-TEST] Current MongoDB connection state: ${dbStateText} (${dbState})`);
    
    // Try to create a test record
    const testId = `test-${Date.now()}`;
    const testRepo = new IngestedRepository({
      repositoryUrl: 'https://github.com/test/repo',
      processingId: testId,
      ingestData: {
        content: 'Test content',
        summary: 'Test summary',
      },
      // For test data, set a sample githubMetadata with isPrivate: false to make it public
      githubMetadata: {
        isPrivate: false,
        fullName: 'test/repo'
      },
      isPublic: true // For test data, explicitly set to true which matches !isPrivate
    });
    
    // Save the test record
    logger.info(`[DB-TEST] Attempting to save test record with processingId: ${testId}`);
    const savedRepo = await testRepo.save();
    logger.info(`[DB-TEST] Successfully saved test record with ID: ${savedRepo._id}`);
    
    // Find the test record we just created
    const foundRepo = await IngestedRepository.findOne({ processingId: testId }).lean();
    logger.info(`[DB-TEST] Retrieved test record: ${foundRepo ? 'found' : 'not found'}`);
    
    // Get count of records in the collection
    const count = await IngestedRepository.countDocuments();
    logger.info(`[DB-TEST] Total IngestedRepository records: ${count}`);
    
    // Return test results
    res.json({
      success: true,
      message: 'Database test completed successfully',
      dbConnection: {
        state: dbState,
        stateText: dbStateText,
        host: mongoose.connection.host,
        name: mongoose.connection.name
      },
      testRecord: {
        saved: !!savedRepo,
        id: savedRepo?._id?.toString(),
        found: !!foundRepo
      },
      collection: {
        name: IngestedRepository.collection.name,
        namespace: IngestedRepository.collection.namespace,
        totalRecords: count
      },
      allCollections: await mongoose.connection.db.listCollections().toArray()
    });
  } catch (error) {
    logger.error('[DB-TEST] Error during database test:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      stack: error.stack,
      mongooseModels: Object.keys(mongoose.models)
    });
  }
});

export default router;
