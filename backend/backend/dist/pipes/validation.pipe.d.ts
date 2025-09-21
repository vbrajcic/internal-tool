import { PipeTransform, ValidationPipe as NestValidationPipe } from '@nestjs/common';
export declare class ValidationPipe extends NestValidationPipe implements PipeTransform<any> {
    constructor();
    private flattenErrors;
}
import { ValidationOptions } from 'class-validator';
export declare function IsUUID(validationOptions?: ValidationOptions): (object: Object, propertyName: string) => void;
export declare function IsEquipmentType(validationOptions?: ValidationOptions): (object: Object, propertyName: string) => void;
export declare function IsUserRole(validationOptions?: ValidationOptions): (object: Object, propertyName: string) => void;
export declare function IsEquipmentCondition(validationOptions?: ValidationOptions): (object: Object, propertyName: string) => void;
