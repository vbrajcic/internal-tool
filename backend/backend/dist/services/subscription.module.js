"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SubscriptionModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const subscription_service_1 = require("./subscription.service");
const subscription_entity_1 = require("../models/subscription.entity");
const invoice_entity_1 = require("../models/invoice.entity");
const user_entity_1 = require("../models/user.entity");
let SubscriptionModule = class SubscriptionModule {
};
exports.SubscriptionModule = SubscriptionModule;
exports.SubscriptionModule = SubscriptionModule = __decorate([
    (0, common_1.Module)({
        imports: [
            typeorm_1.TypeOrmModule.forFeature([subscription_entity_1.Subscription, invoice_entity_1.Invoice, user_entity_1.User])
        ],
        providers: [subscription_service_1.SubscriptionService],
        exports: [subscription_service_1.SubscriptionService]
    })
], SubscriptionModule);
//# sourceMappingURL=subscription.module.js.map