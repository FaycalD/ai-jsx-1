import { type JSX } from '../jsx-runtime.js';
import { RenderEvents } from './render-events.js';
import { RenderContextImpl, RenderElementImpl } from './render-impl.js';

export interface Element<P = unknown> {
  tag?: Component<P> | string | symbol;
  props?: P;
  (componentContext: ComponentContext): Renderable;
}

export const IsRenderElement = Symbol.for('ai.jsx.isRenderElement');

export interface RenderElement extends AsyncIterable<string> {
  readonly [IsRenderElement]: true;
  readonly type: string | symbol;
  readonly attributes: Record<string | symbol, any>;

  readonly childNodes: Iterable<RenderNode>;
  readonly asyncChildNodes: AsyncIterable<RenderNode>;

  readonly renderContext: RenderContext;
  readonly abortSignal: AbortSignal | undefined;

  isComplete(local?: boolean): boolean;
  untilComplete(local?: boolean): Promise<RenderElement>;
  toString(): string;
  toStringAsync(): Promise<string>;

  addEventListener<E extends keyof RenderEvents>(type: E, listener: (e: RenderEvents[E]) => void): void;
  removeEventListener<E extends keyof RenderEvents>(type: E, listener: (e: RenderEvents[E]) => void): void;
}

export type Literal = string | number | null | undefined | boolean;
export type RenderNode = RenderElement | string;
export type Node = Literal | RenderNode | Element<any> | Node[];
export type Renderable = Node | PromiseLike<Node> | AsyncIterable<Node>;

export interface Context<T> {
  Provider: Component<{ value: T; children?: Node }>;
  default: T;
  symbol: symbol;
}

export interface RenderContext {
  render(renderable: Renderable, abortSignal?: AbortSignal): RenderElement;
  attach(node: Node): Node;
  getContext<T>(ctx: Context<T>): T;
  setContext<T>(ctx: Context<T>, value: T): RenderContext;
}

export type LogLevel = 'fatal' | 'error' | 'warn' | 'info' | 'debug' | 'trace';
export interface Logger extends Record<LogLevel, (obj: object | string, msg?: string) => void> {}

export interface ComponentContext extends RenderContext {
  logger: Logger;
  abortSignal?: AbortSignal;
}

export type Component<P> = (props: P, context: ComponentContext) => Renderable;

export abstract class LogImplementation {
  abstract log<P>(
    level: LogLevel,
    component: Component<P> | string | symbol | undefined,
    props: P | undefined,
    renderId: string,
    metadataOrMessage: object | string,
    message?: string
  ): void;

  public logException<P>(
    component: Component<P> | string | symbol | undefined,
    props: P | undefined,
    renderId: string,
    error: Error,
    bubbling: boolean
  ): void {
    if (bubbling) {
      this.log('warn', component, props, renderId, error, error.message);
    } else {
      this.log('error', component, props, renderId, error, error.message);
    }
  }

  public bind<P>(
    component: Component<P> | string | symbol | undefined,
    props: P | undefined,
    renderId: string
  ): Logger {
    return {
      fatal: (obj, msg) => this.log('fatal', component, props, renderId, obj, msg),
      error: (obj, msg) => this.log('error', component, props, renderId, obj, msg),
      warn: (obj, msg) => this.log('warn', component, props, renderId, obj, msg),
      info: (obj, msg) => this.log('info', component, props, renderId, obj, msg),
      debug: (obj, msg) => this.log('debug', component, props, renderId, obj, msg),
      trace: (obj, msg) => this.log('trace', component, props, renderId, obj, msg),
    };
  }
}

export class ConsoleLogImplementation extends LogImplementation {
  log<P>(
    level: LogLevel,
    component: Component<P>,
    props: P,
    renderId: string,
    metadataOrMessage: object | string,
    message?: string
  ): void {
    console[level === 'fatal' ? 'error' : level](message ?? metadataOrMessage, {
      component,
      props,
      renderId,
      metadata: message ? metadataOrMessage : undefined,
    });
  }
}

export const LogContext = createContext<LogImplementation>(new ConsoleLogImplementation());

export const symbols = {
  stream: Symbol.for('ai.jsx.stream'),
  fragment: Symbol.for('ai.jsx.fragment'),
  async: Symbol.for('ai.jsx.async'),
  error: Symbol.for('ai.jsx.error'),
};

export function createElement<P extends { children: C }, C>(
  tag: Component<P> | string | symbol,
  props: Omit<P, 'children'> | null,
  ...children: [C]
): Element<P>;
export function createElement<P extends { children: C[] }, C>(
  tag: Component<P> | string | symbol,
  props: Omit<P, 'children'> | null,
  ...children: C[]
): Element<P>;
export function createElement<P extends { children: C | C[] }, C>(
  tag: Component<P> | string | symbol,
  props: Omit<P, 'children'> | null,
  ...children: C[]
): Element<P> {
  const propsToPass = {
    ...(props ?? {}),
    ...(children.length === 0 ? {} : { children: children.length === 1 ? children[0] : children }),
  } as P;

  const fn: Element<P> = (ctx: ComponentContext) => {
    if (typeof tag === 'function') {
      return tag(propsToPass, ctx);
    }

    return new RenderElementImpl(
      tag,
      propsToPass,
      ctx,
      ctx.abortSignal,
      (children as Node[]).flat(Infinity as 1).map((c) => ctx.render(c))
    );
  };

  fn.tag = tag;
  fn.props = propsToPass;

  return fn;
}

export function createRenderContext(): RenderContext {
  return new RenderContextImpl({});
}

export function createContext<T>(defaultValue: T): Context<T> {
  const contextValue: Context<T> = {
    Provider: ({ value, children }, { setContext }) => setContext(contextValue, value).attach(children),
    default: defaultValue,
    symbol: Symbol(`ai.jsx.context from:\n${new Error().stack}`),
  };

  return contextValue;
}

export function replace(renderElement: RenderElement, replacer: (element: RenderNode) => RenderNode): RenderElement {
  return new RenderElementImpl(
    renderElement.type,
    renderElement.attributes,
    renderElement.renderContext,
    renderElement.abortSignal,
    (async function* () {
      for await (const node of renderElement.asyncChildNodes) {
        yield replacer(node);
      }
    })()
  );
}

export function replaceSubtree(
  renderElement: RenderElement,
  path: RenderElement[],
  replacer: (element: RenderNode) => RenderNode
): RenderElement {
  if (path.length === 0) {
    return replace(renderElement, replacer);
  }
  const [head, ...tail] = path;
  return replace(renderElement, (node) => (node === head ? replaceSubtree(head, tail, replacer) : node));
}

// class AsyncQueue<T> {
//   private readonly queue: T[] = [];
//   private resolvePromise: (isDone: boolean) => void = () => {};
//   private donePromise = new Promise<boolean>((resolve) => (this.resolvePromise = resolve));

//   public push(value: T) {
//     this.queue.push(value);
//     this.resolvePromise(false);
//     this.donePromise = new Promise((resolve) => (this.resolvePromise = resolve));
//   }

//   public async *[Symbol.asyncIterator](): AsyncIterable<T> {
//     while (true) {
//       while (this.queue.length > 0) {
//         yield this.queue.shift()!;
//       }

//       if (await this.donePromise) {
//         return;
//       }
//     }
//   }

//   public close() {
//     Object.freeze(this.queue);
//     this.resolvePromise(true);
//     this.resolvePromise = () => {};
//   }
// }

export interface RenderedIntrinsicElement<T extends string & keyof JSX.IntrinsicElements> extends RenderElement {
  type: T;
  attributes: JSX.IntrinsicElements[T];
}

type TypePredicate<T extends RenderElement = RenderElement> = (element: RenderElement) => element is T;
type Predicate = (element: RenderElement) => boolean;

export async function* traverse<T extends RenderElement>(
  renderElement: RenderElement,
  options: { yield?: TypePredicate<T>; yieldPost?: TypePredicate<T>; descend?: Predicate; path?: RenderElement[] }
): AsyncGenerator<[T, RenderElement[]]> {
  if (options.yield?.(renderElement)) {
    yield [renderElement, options.path ?? []];
  }

  if (options.descend?.(renderElement)) {
    for await (const child of renderElement.asyncChildNodes) {
      if (typeof child === 'object') {
        yield* traverse(child, { ...options, path: (options.path ?? []).concat(renderElement) });
      }
    }
  }

  if (options.yieldPost?.(renderElement)) {
    yield [renderElement, options.path ?? []];
  }
}

export function fork(
  forkStream: (
    createNode: () => {
      node: Node;
      append: (node: Node) => Node;
      close: () => void;
    }
  ) => AsyncIterable<Node>
): Node {
  const forkedSymbol = Symbol('ai.jsx.forked');

  return async function* (context: ComponentContext): AsyncIterable<Node> {
    let resolveRenderElement: (value: RenderElement) => void = () => {};
    const mixedRenderElement = new Promise<RenderElement>((resolve) => {
      resolveRenderElement = resolve;
    });

    resolveRenderElement(
      context.render(
        forkStream(() => {
          const id = Symbol();
          return {
            node: new RenderElementImpl(
              forkedSymbol,
              { [forkedSymbol]: id },
              context,
              context.abortSignal,
              (async function* () {
                // Yield any nodes that belong in this forked stream.
                for await (const node of (await mixedRenderElement).asyncChildNodes) {
                  if (typeof node === 'object' && node.type === forkedSymbol && id in node.attributes) {
                    if (node.attributes[id]) {
                      // These nodes belong in the forked stream.
                      yield* node.asyncChildNodes;
                    } else {
                      // The forked stream is terminated.
                      break;
                    }
                  }
                }
              })()
            ),
            append: (node: Node) => createElement(forkedSymbol, { [id]: true }, node),
            close: () => createElement(forkedSymbol, { [id]: false }),
          };
        })
      )
    );

    for await (const node of (await mixedRenderElement).asyncChildNodes) {
      if (typeof node === 'object' && node.type === forkedSymbol) {
        // This isn't part of the main stream.
        continue;
      }

      yield node;
    }
  };
}
