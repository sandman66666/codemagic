import { body, param } from 'express-validator';

/**
 * Validators for user-related routes
 */

// Validate user profile update request
export const updateProfileValidator = [
  body('displayName')
    .optional()
    .isString()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Display name must be between 2 and 50 characters'),
  
  body('email')
    .optional()
    .isEmail()
    .withMessage('Must provide a valid email address')
    .normalizeEmail(),
];

// Validate repository ID parameter for favorites
export const favoriteRepositoryValidator = [
  param('repositoryId')
    .isMongoId()
    .withMessage('Invalid repository ID format'),
];
