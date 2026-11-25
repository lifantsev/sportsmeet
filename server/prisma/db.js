import "dotenv/config";
import postgres from "@prisma/orm-postgres/runtime";
import { contractFromJson } from "@prisma/orm-postgres/static";
import contractJson from "../prisma/contract.json" with { type: "json" };
const contract = contractFromJson(contractJson);

// The full client, needed for db.transaction(...)
export const client = postgres({
    contract,
    url: process.env.DATABASE_URL,
});

export default client.orm.public
