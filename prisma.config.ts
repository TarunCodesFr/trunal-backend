import 'dotenv/config';
import { defineConfig, env } from 'prisma/config';

export default defineConfig({
    schema: 'prisma/schema.prisma',
    datasource: {
        url: env('DATABASE_URL') // Use env() for required variables, or process.env.DATABASE_URL for optional ones
    }
});
