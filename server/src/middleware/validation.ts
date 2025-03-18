import { Request, Response, NextFunction } from 'express';
import { validationResult, ValidationChain } from 'express-validator';
import { AppError } from './errorHandler';

/**
 * Middleware to validate request data using express-validator
 * @param validations Array of validation chains from express-validator
 */
export const validate = (validations: ValidationChain[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Run all validations
    await Promise.all(validations.map(validation => validation.run(req)));
    
    // Check if there are validation errors
    const errors = validationResult(req);
    
    if (errors.isEmpty()) {
      return next();
    }
    
    // Format validation errors
    const formattedErrors = errors.array().map(error => {
      return {
        field: error.param,
        message: error.msg,
      };
    });
    
    // Create custom error with validation details
    const error = new AppError('Validation failed', 400);
    return res.status(400).json({
      message: 'Validation failed',
      errors: formattedErrors,
    });
  };
};
