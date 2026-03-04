import { defineSmokeTest } from "../../smoke-utils.js";

defineSmokeTest({
  name: "storage-blob",
  packageName: "smoke-test-sdk",
  flavor: "azure",
});
