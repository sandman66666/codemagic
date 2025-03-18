import { body, param } from 'express-validator';

/**
 * Validators for repository-related routes
 */

// Validate repository sync request
export const syncRepositoriesValidator = [
  body('force')
    .optional()
    .isBoolean()
    .withMessage('Force must be a boolean value'),
];

// Validate repository ID parameter
export const repositoryIdValidator = [
  param('id')
    .isMongoId()
    .withMessage('Invalid repository ID format'),
];

// Validate analysis start request
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
