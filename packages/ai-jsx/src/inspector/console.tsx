/** @jsx React.createElement */
import * as LLMx from '../index.js';
import { Node } from '../index.js';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import React, { useState, useEffect } from 'react';
import reactUse from 'react-use';
import SyntaxHighlight from './syntax-highlight';
import { memo } from '../core/memoize';
import Spinner from './spinner';
import { DebugTree } from '../core/debug';

// @ts-expect-error
import { Box, render, Text, useInput } from 'ink';
// const { Box, render, Text, useInput } = require('ink');

const { useList } = reactUse;

function Inspector({ componentToInspect, showDebugTree }: { componentToInspect: Node; showDebugTree: boolean }) {
  const [debugTreeSteps, { push: pushDebugTreeStep }] = useList([] as string[]);
  const [debugTreeFrameIndex, setDebugTreeFrameIndex] = useState<number | null>(null);
  const [debugTreeStreamIsDone, setDebugTreeStreamIsDone] = useState(false);

  const [renderedContent, setRenderedContent] = useState('');

  useEffect(() => {
    const renderContext = LLMx.createRenderContext();
    const memoized = memo(componentToInspect);

    async function getAllFrames() {
      // This results in some duplicate pages.
      const finalResult = await renderContext.render(LLMx.createElement(DebugTree, {}, memoized), {
        map: pushDebugTreeStep,
      });
      pushDebugTreeStep(finalResult);
      setDebugTreeStreamIsDone(true);
    }
    async function getRenderedContent() {
      const finalResult = await renderContext.render(memoized, { map: setRenderedContent });
      setRenderedContent(finalResult);
    }
    getAllFrames();
    getRenderedContent();
  }, [componentToInspect]);

  useInput((_input: any, key: any) => {
    if (key.rightArrow) {
      setDebugTreeFrameIndex((prevIndex) =>
        prevIndex === null ? debugTreeSteps.length - 1 : Math.min(debugTreeSteps.length - 1, prevIndex + 1)
      );
    }
    if (key.leftArrow) {
      setDebugTreeFrameIndex((prevIndex) =>
        prevIndex === null ? debugTreeSteps.length - 2 : Math.max(0, prevIndex - 1)
      );
    }
  });

  const debugFrameIndexToUse = debugTreeFrameIndex === null ? debugTreeSteps.length - 1 : debugTreeFrameIndex;

  return (
    <>
      <Box flexDirection="row">
        <Box flexDirection="column" width={showDebugTree ? '50%' : '100%'}>
          <Text bold underline>
            Live-streaming output
            {!debugTreeStreamIsDone && <Spinner />}
          </Text>
          <Text>{renderedContent}</Text>
        </Box>
        {showDebugTree && (
          <Box flexDirection="column" paddingLeft={2} width="50%">
            <Text bold underline>
              Tree Inspector
            </Text>
            <Text color="grey">
              Viewing frame {debugFrameIndexToUse}/{Math.max(0, debugTreeSteps.length - 1)}
              {debugTreeStreamIsDone ? '' : '+'}
            </Text>
            <Text color="green">
              {/* This doesn't handle JSX well, but it's better than nothing. */}
              <SyntaxHighlight
                code={debugTreeSteps[debugFrameIndexToUse] ?? ''}
                language="javascript"
              ></SyntaxHighlight>
            </Text>
          </Box>
        )}
      </Box>
    </>
  );
}

export function showInspector(componentToInspect: Node, opts: { showDebugTree?: boolean } = {}) {
  const defaultOpts = { showDebugTree: true };
  const finalOpts = { ...defaultOpts, ...opts };
  render(<Inspector componentToInspect={componentToInspect} {...finalOpts} />);
}

/**
 * Notes
 *
 * I think it'll be hard to make a polished UI with this. For instance:
 *
 *    - This doesn't handle large inputs well; I don't think it's possible to have a fixed area and a scrolling area.
 *    - If the size overflows the terminal, the whole layout breaks.
 *    - Flexbox sometimes has its children overflow.
 *    - Box borders sometimes are pushed in when they're next to text.
 *    - terminal-link isn't actually supported in many terminals.
 *    - It sometimes breaks in Warp. 🤪
 */

/**
 * If an error gets thrown, it breaks the UI.
 */
