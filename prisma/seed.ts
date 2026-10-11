import { PrismaPg } from "@prisma/adapter-pg"
import { PrismaClient } from "@prisma/client"
import { Pool } from "pg"
import { DEMO_EMAIL, DEMO_PASSWORD, seedDemo } from "../src/lib/demo/seedDemo"

const pool = new Pool({ connectionString: process.env.DIRECT_URL })
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) })

async function main() {
  console.log("Seeding demo user...")
  await seedDemo(prisma)
  console.log("Demo seed complete")
  console.log(`Email: ${DEMO_EMAIL}`)
  console.log(`Password: ${DEMO_PASSWORD}`)
}

main()
  .catch(error => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(() => pool.end())