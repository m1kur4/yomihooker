import { defineConfig } from 'prisma/config'

export default defineConfig({
  schema: './schema.prisma',
  migrations: {
    seed: 'tsx prisma/seed.ts',
  },
  datasource: {
    url: 'file:../data/data.db',
  },
})
