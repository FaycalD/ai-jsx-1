import { AssistantMessage, ChatCompletion, SystemMessage, UserMessage } from 'ai-jsx/core/completion';
import { Inline, __ } from 'ai-jsx/core/inline';
import { showJSX } from './utils.js';

function App() {
  return (
    <Inline>
      User: <UserMessage>Why is the sky blue?</UserMessage>
      {'\n'}
      {'\n'}
      Assistant:{' '}
      {__(({ children: conversation }) => (
        <AssistantMessage>
          <ChatCompletion temperature={1}>
            <SystemMessage>Be terse and use jargon.</SystemMessage>
            {conversation}
          </ChatCompletion>
        </AssistantMessage>
      ))}
      {'\n\n'}
      User: <UserMessage>I don't understand.</UserMessage>
      {'\n\n'}
      Assistant:{' '}
      {__(({ children: conversation }) => (
        <AssistantMessage>
          <ChatCompletion temperature={1}>
            <SystemMessage>Be apologetic.</SystemMessage>
            {conversation}
          </ChatCompletion>
        </AssistantMessage>
      ))}
    </Inline>
  );
}

showJSX(<App />);
