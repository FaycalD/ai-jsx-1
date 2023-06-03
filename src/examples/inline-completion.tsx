import { LLMx } from '../lib/index.js';
import { Completion } from '../lib/completion-components.js';
import { DebugTree } from '../lib/debug.js';
import { Inline, Scope } from '../lib/inline.js';

function CharacterGenerator() {
  const inlineCompletion = (
    <Inline>
      {(prompt) => (
        <Completion stop={['"']} temperature={1.0}>
          {prompt}
        </Completion>
      )}
    </Inline>
  );

  return (
    <Scope>
      The following is a character profile for an RPG game in JSON format:{'\n'}
      {'{'}
      {'\n  '}"class": "{inlineCompletion}",
      {'\n  '}"name": "{inlineCompletion}",
      {'\n  '}"mantra": "{inlineCompletion}"{'\n'}
      {'}'}
    </Scope>
  );
}
if (process.env.DEBUG) {
  await LLMx.show(
    <DebugTree>
      <CharacterGenerator />
    </DebugTree>,
    { stream: true, step: true }
  );
} else {
  await LLMx.show(<CharacterGenerator />);
}
