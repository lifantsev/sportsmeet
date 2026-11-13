import "dotenv/config";
import postgres from "@prisma/orm-postgres/runtime";
import { contractFromJson } from "@prisma/orm-postgres/static";
import contractJson from "../prisma/contract.json" with { type: "json" };
const contract = contractFromJson(contractJson);

const db = postgres({
    contract,
    url: process.env.DATABASE_URL,
});

export default db
