export {
  typeRefkey,
  serializerRefkey,
  deserializerRefkey,
  polymorphicTypeRefkey,
  knownValuesRefkey,
  operationOptionsRefkey,
  clientContextRefkey,
  createClientRefkey,
  clientOptionsRefkey,
  classicalClientRefkey,
  xmlSerializerRefkey,
  xmlObjectSerializerRefkey,
  xmlDeserializerRefkey,
  xmlObjectDeserializerRefkey,
  serializationHelperRefkey,
  pagingHelperRefkey,
  pollingHelperRefkey,
  sendOperationRefkey,
  deserializeOperationRefkey,
  publicOperationRefkey,
  operationGroupInterfaceRefkey,
  operationGroupFactoryRefkey,
  loggerRefkey,
  baseSerializerRefkey,
  baseDeserializerRefkey,
} from "./refkeys.js";

export {
  httpRuntimeLib,
  azureCoreClientLib,
  azureCorePipelineLib,
  azureAbortControllerLib,
  azureCoreUtilLib,
  azureCoreAuthLib,
  azureCoreLroLib,
  azureIdentityLib,
  azureLoggerLib,
} from "./external-packages.js";

export { getExampleValueCode } from "./example-values.js";

export { hasXmlSerialization } from "./xml-detection.js";

export { nameConflictResolver } from "./name-conflict-resolver.js";

export {
  typeHasDeserializerDeclaration,
  typeHasSerializerDeclaration,
} from "./serialization-predicates.js";
