"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const config_1 = require("prisma/config");
exports.default = (0, config_1.defineConfig)({
    schema: 'prisma/schema.prisma',
    datasource: {
        url: (0, config_1.env)('DATABASE_URL') // Use env() for required variables, or process.env.DATABASE_URL for optional ones
    }
});
