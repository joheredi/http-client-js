import { defineSmokeTest } from "../../smoke-utils.js";

defineSmokeTest({
  name: "arm-compute",
  packageName: "arm-compute-smoke-test",
  flavor: "azure",
  entryFile: "client.tsp",
});
