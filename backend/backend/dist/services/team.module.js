"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TeamModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const team_service_1 = require("./team.service");
const team_entity_1 = require("../models/team.entity");
const user_entity_1 = require("../models/user.entity");
const equipment_entity_1 = require("../models/equipment.entity");
let TeamModule = class TeamModule {
};
exports.TeamModule = TeamModule;
exports.TeamModule = TeamModule = __decorate([
    (0, common_1.Module)({
        imports: [
            typeorm_1.TypeOrmModule.forFeature([team_entity_1.Team, user_entity_1.User, equipment_entity_1.Equipment])
        ],
        providers: [team_service_1.TeamService],
        exports: [team_service_1.TeamService],
    })
], TeamModule);
//# sourceMappingURL=team.module.js.map