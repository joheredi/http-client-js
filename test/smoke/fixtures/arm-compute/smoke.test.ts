import { defineSmokeTest } from "../../smoke-utils.js";

defineSmokeTest({
  name: "arm-compute",
  packageName: "@msinternal/compute",
  flavor: "azure",
  experimentalExtensibleEnums: true,
  entryFile: "client.tsp",
});
