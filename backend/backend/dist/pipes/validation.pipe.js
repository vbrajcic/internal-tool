"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ValidationPipe = void 0;
exports.IsUUID = IsUUID;
exports.IsEquipmentType = IsEquipmentType;
exports.IsUserRole = IsUserRole;
exports.IsEquipmentCondition = IsEquipmentCondition;
const common_1 = require("@nestjs/common");
let ValidationPipe = class ValidationPipe extends common_1.ValidationPipe {
    constructor() {
        super({
            whitelist: true,
            forbidNonWhitelisted: true,
            transform: true,
            disableErrorMessages: false,
            validationError: {
                target: false,
                value: false,
            },
            exceptionFactory: (errors) => {
                const messages = this.flattenValidationErrors(errors);
                return new common_1.BadRequestException({
                    statusCode: 400,
                    message: 'Validation failed',
                    errors: messages,
                });
            },
        });
    }
    flattenValidationErrors(errors) {
        const result = {};
        const extractErrors = (error, path = '') => {
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
};
exports.ValidationPipe = ValidationPipe;
exports.ValidationPipe = ValidationPipe = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], ValidationPipe);
const class_validator_1 = require("class-validator");
function IsUUID(validationOptions) {
    return function (object, propertyName) {
        (0, class_validator_1.registerDecorator)({
            name: 'isUUID',
            target: object.constructor,
            propertyName: propertyName,
            options: validationOptions,
            validator: {
                validate(value, args) {
                    return typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
                },
                defaultMessage(args) {
                    return `${args.property} must be a valid UUID`;
                },
            },
        });
    };
}
function IsEquipmentType(validationOptions) {
    const validTypes = ['Laptop', 'Display', 'Phone', 'Tablet', 'Dongle', 'Keyboard', 'Mouse', 'Furniture'];
    return function (object, propertyName) {
        (0, class_validator_1.registerDecorator)({
            name: 'isEquipmentType',
            target: object.constructor,
            propertyName: propertyName,
            options: validationOptions,
            validator: {
                validate(value, args) {
                    return validTypes.includes(value);
                },
                defaultMessage(args) {
                    return `${args.property} must be one of: ${validTypes.join(', ')}`;
                },
            },
        });
    };
}
function IsUserRole(validationOptions) {
    const validRoles = ['Employee', 'TeamLead', 'Admin'];
    return function (object, propertyName) {
        (0, class_validator_1.registerDecorator)({
            name: 'isUserRole',
            target: object.constructor,
            propertyName: propertyName,
            options: validationOptions,
            validator: {
                validate(value, args) {
                    return validRoles.includes(value);
                },
                defaultMessage(args) {
                    return `${args.property} must be one of: ${validRoles.join(', ')}`;
                },
            },
        });
    };
}
function IsEquipmentCondition(validationOptions) {
    const validConditions = ['New', 'Good', 'Fair', 'Poor'];
    return function (object, propertyName) {
        (0, class_validator_1.registerDecorator)({
            name: 'isEquipmentCondition',
            target: object.constructor,
            propertyName: propertyName,
            options: validationOptions,
            validator: {
                validate(value, args) {
                    return validConditions.includes(value);
                },
                defaultMessage(args) {
                    return `${args.property} must be one of: ${validConditions.join(', ')}`;
                },
            },
        });
    };
}
//# sourceMappingURL=validation.pipe.js.map