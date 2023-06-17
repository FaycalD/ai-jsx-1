import * as ReactModule from 'react';
import * as LLMx from './core.js';
import { markAsJsxBoundary } from './jsx-boundary.js';
export * from './core.js';

function unwrapReact(partiallyRendered: LLMx.PartiallyRendered): ReactModule.ReactNode {
  if (LLMx.isElement(partiallyRendered)) {
    // This should be an AI.React element.
    if (partiallyRendered.tag !== LLMx.React) {
      throw new Error('unwrapReact only expects to see AI.React elements or strings.');
    }

    return partiallyRendered.props.children;
  }

  return partiallyRendered;
}

/**
 * Renders an AI.jsx component into React. Used by the <AI.jsx> element internally but
 * can be used directly an entrypoint into AI.jsx.
 */
export function useAI(children: LLMx.Node) {
  const [result, setResult] = ReactModule.useState([] as ReactModule.ReactNode);
  const [isDone, setIsDone] = ReactModule.useState(false);

  ReactModule.useEffect(() => {
    let shouldStop = false;
    async function stream() {
      setResult([]);
      setIsDone(false);

      // TODO: add a way for a render context to be aborted
      const renderResult = LLMx.createRenderContext().render(children, {
        stop: (e) => e.tag == LLMx.React,
        map: (frame) => frame.map(unwrapReact),
      });
      for await (const reactFrame of renderResult) {
        if (shouldStop) {
          return;
        }

        setResult(reactFrame);
      }

      const final = await renderResult;
      if (shouldStop) {
        return;
      }
      setResult(final.map(unwrapReact));
      setIsDone(true);
    }

    stream();

    return () => {
      shouldStop = true;
    };
  }, [children]);

  return { result, isDone };
}

/**
 * A JSX component that allows AI.jsx elements to be used in a React component tree.
 */
export function jsx({ children }: { children: LLMx.Node }, context?: any | LLMx.ComponentContext) {
  if (typeof context?.render === 'function') {
    // We're in AI.JSX already.
    return children;
  }

  const ai = useAI(children);
  return ReactModule.createElement(ReactModule.Fragment, null, ai.result) as any;
}

markAsJsxBoundary(jsx);
