import { defineProject } from 'vitest/config';

export default defineProject({
  test: {
    name: 'api',
    environment: 'node',
    env: {
      NODE_ENV: 'test',
      DATABASE_URL: 'postgresql://test:test@localhost:5434/test',
      JWT_SECRET: 'secret-de-test-suffisamment-long-pour-zod-0123456789',
    },
  },
});
