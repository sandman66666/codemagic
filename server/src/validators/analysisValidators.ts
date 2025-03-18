import { body, param } from 'express-validator';

/**
 * Validators for analysis-related routes
 */

// Validate analysis ID parameter
export const analysisIdValidator = [
  param('id')
    .isMongoId()
    .withMessage('Invalid analysis ID format'),
];

// Validate start analysis request
export const startAnalysisValidator = [
  body('repositoryId')
    .isMongoId()
    .withMessage('Invalid repository ID format'),
  
  body('branch')
    .isString()
    .notEmpty()
    .withMessage('Branch name is required'),
  
  body('filters')
    .optional()
    .isObject()
    .withMessage('Filters must be an object'),
  
  body('filters.includeNodeModules')
    .optional()
    .isBoolean()
    .withMessage('includeNodeModules must be a boolean'),
  
  body('filters.includeTests')
    .optional()
    .isBoolean()
    .withMessage('includeTests must be a boolean'),
  
  body('filters.includeDocumentation')
    .optional()
    .isBoolean()
    .withMessage('includeDocumentation must be a boolean'),
  
  body('filters.maxFileSize')
    .optional()
    .isString()
    .withMessage('maxFileSize must be a string'),
  
  body('filters.languages')
    .optional()
    .isArray()
    .withMessage('languages must be an array'),
  
  body('filters.excludePatterns')
    .optional()
    .isArray()
    .withMessage('excludePatterns must be an array'),
];

// Validate analysis feedback request
export const submitFeedbackValidator = [
  body('rating')
    .isInt({ min: 1, max: 5 })
    .withMessage('Rating must be an integer between 1 and 5'),
  
  body('comments')
    .optional()
    .isString()
    .isLength({ max: 1000 })
    .withMessage('Comments must be a string with max length of 1000 characters'),
];

// Validate analysis comparison request
export const compareAnalysesValidator = [
  body('analysisIds')
    .isArray({ min: 2, max: 5 })
    .withMessage('Must provide between 2 and 5 analysis IDs'),
  
  body('analysisIds.*')
    .isMongoId()
    .withMessage('All analysis IDs must be valid'),
];
