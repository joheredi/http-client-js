# Model properties with literal union types should inline

This scenario validates that model properties whose types are anonymous literal
unions (created by TCGC as `SdkEnumType` with `isGeneratedName: true`) render
inline in the interface, matching legacy emitter output. The legacy never creates
named type aliases for these — it inlines the literal values directly.

## TypeSpec

```tsp
model StringLiterals {
  color: "red" | "blue";
}

model IntLiterals {
  value: 42 | 43;
}

model FloatLiterals {
  weight: 43.125 | 46.875;
}

@route("/str") op getStr(): StringLiterals;
@route("/int") op getInt(): IntLiterals;
@route("/float") op getFloat(): FloatLiterals;
```

## Model interface StringLiterals

```ts models interface StringLiterals
export interface StringLiterals {
  color: "red" | "blue";
}
```

## Model interface IntLiterals

```ts models interface IntLiterals
export interface IntLiterals {
  value: 42 | 43;
}
```

## Model interface FloatLiterals

```ts models interface FloatLiterals
export interface FloatLiterals {
  weight: 43.125 | 46.875;
}
```
