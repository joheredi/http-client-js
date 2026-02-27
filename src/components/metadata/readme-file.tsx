import { SourceFile } from "@alloy-js/core";

/**
 * Generates a README.md file with basic package documentation.
 */
export function ReadmeFile(props: { packageName: string }) {
  const content = `# ${props.packageName}

This package contains the auto-generated TypeScript client library for the service.

## Getting Started

### Install the package

\`\`\`bash
npm install ${props.packageName}
\`\`\`

### Usage

\`\`\`typescript
import { } from "${props.packageName}";
\`\`\`

## Troubleshooting

### Logging

Enabling logging may help uncover useful information about failures.

## Next steps

Please take a look at the [samples](https://github.com/) directory for detailed examples.
`;

  return (
    <SourceFile path="README.md" filetype="text/markdown">
      {content}
    </SourceFile>
  );
}
