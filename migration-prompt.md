I have a legacy TypeSpec emitter that needs to be re-writen using the Alloy Framework. The Alloy framework provides out of the box many of the functionalities that made the legacy emitter complex. For example the Alloy framework does all the book keeping necessary to track declared symbols and resolve its references, this means that the framework automatically adds import statements without having to calculate them, and also creates barrell files automatically.

Alloy is a framework to write code generators the @alloy-js/core provides language agnostic components and the core framework while packages like @alloy-js/typescript provides TypeScript specific components to compose code generators that generate TypeScript code.

Alloy uses JSX syntax to enable reusable and composable components
Alloy Borrows concepts from React and Vue such as Hooks, Context Providers and Reactivity. But is not built with either, it is completly writen and optimized for code generation.
Alloy relies in refkeys to create keys to identify and reference declarations.



1. https://github.com/Azure/autorest.typescript - Legacy typespec emitter under packages/typespec-ts
   - It generates TypeScript client libraries for REST Services defined with TypeSpec
   - It uses the package @azure-tools/typespec-client-generator-core (aka TCGC) https://github.com/Azure/typespec-azure/tree/main/packages/typespec-client-generator-core which provides an object model (SDKPackage) that pre computes data from the TypeSpec definition to make it easier for client library generators, this library is language agnostic/
   - One of the problems with this legacy emitter is that its code is overly complex as it doesn't use any framework to help with bookkeeping like symbol reference management. It also uses raw string concatenation to build the output which makes it very complex and not reusable.
   - This legacy emitter is already comsumed by hundreds of Azure libraries so it is imperative that our re-write doesn't change the output, with the main priority being that the public API surface of the generated code with the re-write is the same as the output with the legacy emitter, this is to prevent any breaking changes from existing users.
   - The rewrite should be opaque to our customers, but will improve the reliability, recude the cost of maintenance and implementing new features.
   - The legacy generator has a switch for Azure flavor, one of the design goals of the rewrite will be to be able to have a core emitter that can be extended or used to compose the Azure emitter, ideally through composition leveraging JSX.
   - The legacy generator has a comprehensive set of tests that we need to port as is to the new project where we will do the rewrite. This is to guarantee no breaking changes from the rewrite. The tests we need to port are under unitTestModular/scenarios/**/*.md and are in the Markdown format with a \`\`\`tsp section that defines the TypeSpec input and \`\`\`typescript sections that define the expected TypeScript output. Only changes allowed to these vs the baseline that we can accept are changes that don't represent a breaking change or that break the generated code. For exmaple import order and changes like that should be fine.
   - The scenario test uses a harness /unitTestModular/scenarios.spec.ts, we should port this plus the test utils it uses
   - We are scoping this to modular, anything RLC won't be part of the rewrite.
   - We must be careful to use idiomatic Alloy


References

- Alloy Core Framework - submodules/alloy/packages/core
- Alloy TypeScript - submodules/alloy/packages/typescript
- TypeSpec Compiler - submodules/typespec/packages/compiler
- TypeSpec Http - submodules/typespec/packages/http
- TypeSpec Emitter Framework - submodules/typespec/packages/emitter-framework
- TCGC - submodules/typespec-azure/packages/typespec-client-generator-core
- Reference Emitter (priority 1) - submodules/flight-instructor This is an emitter that can be used as reference for good patterns and best practices, specifically submodules/flight-instructor/src/typescript which generates client code for REST services.
- Reference Emitter (priority 2) - submodules/typespec/packages/http-client-js This is a TypeScript emitter that uses Alloy, one caveat is that is uses a library called @typespec/http-client which our emitter won't use, instead we will be using TCGC. When in doubt about a pattern that you wee between flight-instructor and http-client-js prefer the patterns in flight-instructor.
- For reference about how to consume TCGC you can use submodules/typespec/packages/http-client-python this emitter generates python code so we only care about how TCGC is used when looking for usage of APIS, also this emitter serializes the codemodel to yaml to then generate out of process we are not interested in that approach just how they use TCGC.


Rules
- We will rewrite the emitter under submodules/autorest.typescript/packages/typespec-ts
   - The entry point is index.ts and we are only re-writing in Alloy the modular path, other paths won't be ported
- We will re-write in a new project that is already setup with a simple TypeSpec emitter that uses alloy. This is a skeleton emitter
- DON'T do any kind of bridge to make work the existing code with Alloy, our rewrite should be pure Alloy
- The source of thruth about how output should be is the legacy generator pakcages/typespe-ts
- Ignore submodules/autorest.typescript/packages/autorest.typescript and submodules/autorest.typescript/packages/rlc-common
- Don't do anything with submodules/autorest.typescript/packages/typespec-test for now we'll get to it later


