# AI + UI

Demo video: [![Loom video](../../docs/loom.png)](https://www.loom.com/share/79ca3706839049a2beaf70f75950f86f)

This is experimental but we're excited about it as a first step towards AI-native app development. Try it if you dare!

For this demo, we've set up a hacked version of NextJS to support server-side rendering with seamless integration of AI.JSX and React components. The subdemos are:

- [Basic completion](../../packages/nextjs-demo/src/app/basic-completion/page.tsx): Streaming the AI's response directly to the browser.
- [JIT UI: React](../../packages/nextjs-demo/src/app/recipe/page.tsx): We provide building block components, and the AI decides how to assemble them into the final output.
- [JIT UI: Raw HTML](../../packages/nextjs-demo/src/app/nl-gh-search/page.tsx): We teach the AI to query GitHub, and invite it to inject whatever HTML it wants into our UI. 😱
- [Sleep](../../packages/nextjs-demo/src/app/z/page.tsx): An AI app with non-trivial business logic, streamed to the client.

As you hack around with this, you'll encounter some [limitations](../../packages/nextjs-demo/dev-notes.md).

To run the demo, go to the monorepo root, and run:

```
yarn turbo run dev --scope nextjs-demo
```

## How To

1. You have to import [our custom react wrapper](../../packages/nextjs-demo/src/app/react.ts):

   ```tsx
   // No
   import React from 'react';

   // Yes
   import React from './react';
   ```

1. Use the [`AI`](../../packages/nextjs-demo/src/app/ai.tsx) component to convert between React and AI.JSX components:
   ```tsx
   <ResultContainer title={`AI lists ten facts about ${query}`}>
     <AI>
       <ChatCompletion temperature={1}>
         <UserMessage>Give me ten facts about {query}</UserMessage>
       </ChatCompletion>
     </AI>
   </ResultContainer>
   ```
1. If you want to embed React components as a (potentially transitive) child of `<AI>`, you need to update the hacky list in [our custom react wrapper](../../packages/nextjs-demo/src/app/react.ts).
