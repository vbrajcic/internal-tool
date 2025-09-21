import {
  ArgumentMetadata,
  BadRequestException,
  Injectable,
  PipeTransform,
  ValidationPipe as NestValidationPipe,
} from '@nestjs/common';
import { ValidationError } from 'class-validator';

@Injectable()
export class ValidationPipe extends NestValidationPipe implements PipeTransform<any> {
  constructor() {
    super({
      whitelist: true, // Strip unknown properties
      forbidNonWhitelisted: true, // Throw error for unknown properties
      transform: true, // Transform input objects to DTO instances
      disableErrorMessages: false,
      validationError: {
        target: false, // Don't expose the target object in error messages
        value: false, // Don't expose the validated value in error messages
      },
      exceptionFactory: (errors: ValidationError[]) => {
        const messages = this.flattenValidationErrors(errors);
        return new BadRequestException({
          statusCode: 400,
          message: 'Validation failed',
          errors: messages,
        });
      },
    });
  }

  private flattenValidationErrors(errors: ValidationError[]): Record<string, string[]> {
    const result: Record<string, string[]> = {};

    const extractErrors = (error: ValidationError, path: string = '') => {
      const propertyPath = path ? `${path}.${error.property}` : error.property;

      if (error.constraints) {
        result[propertyPath] = Object.values(error.constraints);
      }

      if (error.children && error.children.length > 0) {
        error.children.forEach((child) => extractErrors(child, propertyPath));
      }
    };

    errors.forEach((error) => extractErrors(error));
    return result;
  }
}

// Custom validation decorators
import { registerDecorator, ValidationOptions, ValidationArguments } from 'class-validator';

export function IsUUID(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'isUUID',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          return typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} must be a valid UUID`;
        },
      },
    });
  };
}

export function IsEquipmentType(validationOptions?: ValidationOptions) {
  const validTypes = ['Laptop', 'Display', 'Phone', 'Tablet', 'Dongle', 'Keyboard', 'Mouse', 'Furniture'];

  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'isEquipmentType',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          return validTypes.includes(value);
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} must be one of: ${validTypes.join(', ')}`;
        },
      },
    });
  };
}

export function IsUserRole(validationOptions?: ValidationOptions) {
  const validRoles = ['Employee', 'TeamLead', 'Admin'];

  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'isUserRole',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          return validRoles.includes(value);
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} must be one of: ${validRoles.join(', ')}`;
        },
      },
    });
  };
}

export function IsEquipmentCondition(validationOptions?: ValidationOptions) {
  const validConditions = ['New', 'Good', 'Fair', 'Poor'];

  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'isEquipmentCondition',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          return validConditions.includes(value);
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} must be one of: ${validConditions.join(', ')}`;
        },
      },
    });
  };
}