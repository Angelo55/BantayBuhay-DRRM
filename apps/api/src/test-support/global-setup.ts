import { migrate } from "../migrate.js";
import { TEST_DATABASE_URL } from "./db.js";

export default async function setup() {
  try {
    await migrate(TEST_DATABASE_URL);
  } catch (error) {
    throw new Error("Can't reach the test database. Start it with: npm run test:db", {
      cause: error,
    });
  }
}
