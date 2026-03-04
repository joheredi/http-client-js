import { code } from "@alloy-js/core";
import { FunctionDeclaration, SourceFile } from "@alloy-js/typescript";
import { binaryResponseHelperRefkey } from "../../utils/refkeys.js";
import { useRuntimeLib } from "../../context/flavor-context.js";

/**
 * Renders the `static-helpers/getBinaryResponse.ts` source file containing
 * the `getBinaryResponse` helper function for reading binary HTTP responses.
 *
 * Binary responses (bytes with encode="bytes") cannot be read through the
 * normal HTTP pipeline response handling because the pipeline performs a
 * UTF-8 decode on the raw bytes, corrupting non-text binary data (images,
 * archives, encrypted data, etc.).
 *
 * The `getBinaryResponse` helper bypasses this by:
 * 1. Using `asNodeStream()` to get the raw binary stream
 * 2. Reading all chunks as Buffer objects
 * 3. Concatenating into a single Uint8Array
 * 4. Returning the response with the preserved binary body
 *
 * This matches the legacy emitter's `get-binary-response.ts` static helper.
 *
 * @returns An Alloy JSX tree for the binary response helpers source file.
 */
export function BinaryResponseHelpersFile() {
  return (
    <SourceFile path="getBinaryResponse.ts">
      <GetBinaryResponseFunction />
    </SourceFile>
  );
}

/**
 * Renders the `getBinaryResponse` function that reads a binary HTTP response
 * from a StreamableMethod, bypassing the pipeline's UTF-8 decode.
 *
 * The function:
 * 1. Calls `asNodeStream()` on the StreamableMethod to get a Node.js stream response
 * 2. If the body is undefined, returns the response as-is
 * 3. Otherwise, reads all stream chunks as Buffer objects
 * 4. Concatenates them into a single Buffer (which extends Uint8Array)
 * 5. Returns the response with the binary body set
 *
 * The return type uses `PathUncheckedResponse` so the result can be passed
 * directly to the operation's `_xxxDeserialize` function.
 *
 * @returns An Alloy JSX tree for the getBinaryResponse function declaration.
 */
function GetBinaryResponseFunction() {
  const runtimeLib = useRuntimeLib();
  return (
    <FunctionDeclaration
      name="getBinaryResponse"
      refkey={binaryResponseHelperRefkey("getBinaryResponse")}
      export
      async
      returnType={code`${runtimeLib.PathUncheckedResponse}`}
      parameters={[
        { name: "streamableMethod", type: runtimeLib.StreamableMethod },
      ]}
    >
      {code`const response = await streamableMethod.asNodeStream();
if (response.body === undefined) {
  return response as ${runtimeLib.PathUncheckedResponse};
}
const bufs: Buffer[] = [];
for await (const buf of response.body) {
  bufs.push(Buffer.isBuffer(buf) ? buf : Buffer.from(buf));
}
return {
  ...response,
  body: Buffer.concat(bufs),
} as ${runtimeLib.PathUncheckedResponse};`}
    </FunctionDeclaration>
  );
}
