import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

export interface FixieEmbedProps extends React.IframeHTMLAttributes<HTMLIFrameElement> {
  /**
   * The agent ID you want to embed a conversation with.
   */
  agentId: string;

  /**
   * If true, the agent will speak its messages out loud.
   */
  speak?: boolean;

  /**
   * If true, the UI will show debug information, such as which functions the agent is calling.
   */
  debug?: boolean;

  /**
   * If true, the iframe will be rendered in the DOM position where this component lives.
   *
   * If false, the iframe will be rendered floating on top of the content, with another iframe
   * to be a launcher, à la Intercom.
   */
  inline?: boolean;

  /**
   * If you're not sure whether you need this, the answer is "no".
   */
  fixieHost?: string;
}

const defaultFixieHost = 'https://fixie.vercel.app';

/**
 * A component to embed the Generic Fixie Chat UI on your page.
 *
 * Any extra props to this component are passed through to the `iframe`.
 */
export function InlineFixieEmbed({ speak, debug, agentId, fixieHost, ...iframeProps }: FixieEmbedProps) {
  return <iframe {...getBaseIframeProps({ speak, debug, agentId, fixieHost })} {...iframeProps}></iframe>;
}

export function ControlledFloatingFixieEmbed({
  visible,
  speak,
  debug,
  agentId,
  fixieHost,
  ...iframeProps
}: FixieEmbedProps & { visible?: boolean }) {
  const chatStyle = {
    position: 'fixed',
    bottom: `${10 + 10 + 48}px`,
    right: '10px',
    width: '400px',
    height: '90%',
    border: '1px solid #ccc',
    zIndex: '999999',
    display: visible ? 'block' : 'none',
    boxShadow: '0px 5px 40px rgba(0, 0, 0, 0.16)',
    borderRadius: '16px',
    ...(iframeProps.style ?? {}),
  } as const;

  return (
    <>
      {createPortal(
        // The types are wrong
        // @ts-expect-error
        <iframe
          {...getBaseIframeProps({ speak, debug, agentId, fixieHost })}
          {...iframeProps}
          style={chatStyle}
        ></iframe>,
        document.body
      )}
    </>
  );
}

export function FloatingFixieEmbed({ fixieHost, ...restProps }: FixieEmbedProps) {
  const launcherStyle = {
    position: 'fixed',
    bottom: '10px',
    right: '10px',
    width: '48px',
    height: '48px',
    borderRadius: '50%',
    zIndex: '999999',
    boxShadow: '0px 5px 40px rgba(0, 0, 0, 0.16)',
    background: 'none',
    border: 'none',
  } as const;

  const launcherUrl = new URL('embed-launcher', fixieHost ?? defaultFixieHost);
  const launcherRef = useRef<HTMLIFrameElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const sidekickChannel = new MessageChannel();
    const launcherIFrame = launcherRef.current;

    if (launcherIFrame) {
      launcherIFrame.addEventListener('load', function () {
        if (launcherIFrame.contentWindow) {
          launcherIFrame.contentWindow.postMessage('channel-message-port', '*', [sidekickChannel.port2]);
        }
      });

      sidekickChannel.port1.onmessage = function (event) {
        if (event.data === 'clicked launcher') {
          setVisible((visible) => !visible);
        }
      };
    }
  }, [fixieHost]);

  return (
    <>
      {createPortal(
        // The types are wrong
        // @ts-expect-error
        <>
          <ControlledFloatingFixieEmbed fixieHost={fixieHost} {...restProps} visible={visible} />

          <iframe style={launcherStyle} src={launcherUrl.toString()} ref={launcherRef}></iframe>
        </>,
        document.body
      )}
    </>
  );
}

function getBaseIframeProps({
  speak,
  debug,
  fixieHost,
  agentId,
}: Pick<FixieEmbedProps, 'speak' | 'debug' | 'fixieHost' | 'agentId'>) {
  const embedUrl = new URL(`/embed/${agentId}`, fixieHost ?? defaultFixieHost);
  if (speak) {
    embedUrl.searchParams.set('speak', '1');
  }
  if (debug) {
    embedUrl.searchParams.set('debug', '1');
  }

  return {
    src: embedUrl.toString(),
    allow: 'clipboard-write',
  };
}
