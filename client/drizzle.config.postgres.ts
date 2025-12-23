import { defineConfig } from 'drizzle-kit';

export default defineConfig({
	schema: './src/lib/midgard/db/schema.postgres.ts',
	out: './src/lib/midgard/db/migrations/postgres',
	dialect: 'postgresql',
	dbCredentials: {
		url: process.env.DATABASE_URL!
	}
});
