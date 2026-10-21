import * as migration_20261020_154736 from "./20261020_154736";
import * as migration_20261021_083200 from "./20261021_083200";

export const migrations = [
  {
    up: migration_20261020_154736.up,
    down: migration_20261020_154736.down,
    name: "20261020_154736",
  },
  {
    up: migration_20261021_083200.up,
    down: migration_20261021_083200.down,
    name: "20261021_083200",
  },
];
