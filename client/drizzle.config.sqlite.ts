import { defineConfig } from 'drizzle-kit';

export default defineConfig({
	schema: './src/lib/midgard/db/schema.sqlite.ts',
	out: './src/lib/midgard/db/migrations/sqlite',
	dialect: 'sqlite',
	dbCredentials: {
		url: 'data/midgard.db'
	}
});
