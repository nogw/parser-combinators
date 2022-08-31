import {
  parseState,
  parseError,
  parser,
  Pair,
  pair,
  Option,
  some,
  none,
  Result,
  ok,
  error
} from "./types";

const sourceSub = (
  start: number,
  length: number,
  source: parseState
): parseState => {
  return {
    source: source.source.slice(start, length + start),
    position: source.position + start
  };
};

const toParseState = (source: string): parseState => ({
  source: source,
  position: 0
});

const fail = (e: string) => ({
  run: (state: parseState) => pair(state, error(e))
});

const wrap = <A>(o: A) => ({
  run: (state: parseState) => pair(state, ok(o))
});

const starRight = <A, B>(p1: parser<A>, p2: parser<B>): parser<B> => ({
  run: (state) => {
    const { fst: state_, snd } = p1.run(state);
    return snd._tag == "Ok" ? p2.run(state_) : pair(state_, error(snd.error));
  }
});

const leftStar = <A, B>(p1: parser<A>, p2: parser<B>): parser<A> => ({
  run: (state) => {
    const { fst: state0, snd } = p1.run(state);

    if (snd._tag == "Ok") {
      const { fst: state1, snd: snd1 } = p2.run(state0);

      return snd1._tag == "Ok"
        ? pair(state1, ok(snd.ok))
        : pair(state1, error(snd1.error));
    } else {
      return pair(state0, error(snd.error));
    }
  }
});

const leftStarRight = <A, B>(
  p1: parser<A>,
  p2: parser<B>
): parser<Pair<A, B>> => ({
  run: (state) => {
    const { fst: state0, snd } = p1.run(state);

    if (snd._tag == "Ok") {
      const { fst: state1, snd: snd1 } = p2.run(state0);

      return snd1._tag == "Ok"
        ? pair(state1, ok(pair(snd.ok, snd1.ok)))
        : pair(state1, error(snd1.error));
    } else {
      return pair(state0, error(snd.error));
    }
  }
});

const map = <A, B>(f: (_: A) => B, p: parser<A>): parser<B> => ({
  run: (state) => {
    const { fst: state_, snd } = p.run(state);

    return snd._tag == "Ok"
      ? pair(state_, ok(f(snd.ok)))
      : pair(state_, error(snd.error));
  }
});

export const reduce = <A, B>(
  list: parser<A[]>,
  initial: B,
  reducer: (_: B, __: A) => B
): parser<B> => ({
  run: (state) => {
    const { fst: state_, snd } = list.run(state);

    if (snd._tag == "Error") return pair(state_, error(snd.error));

    const auxReduce = (
      list_: A[],
      initial: B,
      reducer: (_: B, __: A) => B
    ): B => {
      if (list_.length === 0) {
        return initial;
      } else {
        const [first, ...rest] = list_;
        const updatedAcc = reducer(initial, first);
        return auxReduce(rest, updatedAcc, reducer);
      }
    };

    return pair(state_, ok(auxReduce(snd.ok, initial, reducer)));
  }
});

const bind = <A, B>(f: (_: A) => parser<B>, p: parser<A>): parser<B> => ({
  run: (state) => {
    const { fst: state_, snd } = p.run(state);
    return snd._tag == "Ok"
      ? f(snd.ok).run(state_)
      : pair(state_, error(snd.error));
  }
});

const prefix = (prefixStr: string): parser<string> => ({
  run: (state) => {
    const unexpectedPrefixError = `expected ${prefixStr}`;

    try {
      const prefixSize = prefixStr.length;
      const stateSize = state.source.length;
      const prefixState = sourceSub(0, prefixSize, state);

      return prefixState.source == prefixStr
        ? pair(
            sourceSub(prefixSize, stateSize - prefixSize, state),
            ok(prefixStr)
          )
        : pair(state, error(unexpectedPrefixError));
    } catch (err) {
      return pair(state, error(unexpectedPrefixError));
    }
  }
});

const digit = (): parser<string> => ({
  run: (state) => {
    const character = state.source.slice(0, 1);

    if (character < "0" || character > "9") {
      return pair(state, error(`expected a digit, got ${character}`));
    }

    return pair(sourceSub(1, state.source.length, state), ok(character));
  }
});

const string = (): parser<string> => ({
  run: (state) => {
    const character = state.source.slice(0, 1);

    const whiteListedCharacters = {
      "?": 1,
      _: 2
    };

    if (
      (character < "a" || character > "z") &&
      (character < "A" || character > "Z") &&
      !(character in whiteListedCharacters)
    ) {
      return pair(state, error(`expected a digit, got ${character}`));
    }

    return pair(sourceSub(1, state.source.length, state), ok(character));
  }
});

const parseWhile = (p: (_: string) => boolean): parser<string> => ({
  run: (state) => {
    let len = state.source.length;

    let size = (acc: number): number => {
      return acc < len && p(state.source[acc]) ? size(acc + 1) : acc;
    };

    let i = size(0);

    return pair(sourceSub(i, len - i, state), ok(state.source.slice(0, i)));
  }
});

const optional = <A>(p: parser<A>): parser<Option<A>> => ({
  run: (state) => {
    const { fst: state0, snd } = p.run(state);

    return snd._tag == "Ok"
      ? pair(state0, ok(some(snd.ok)))
      : pair(state0, ok(none));
  }
});

const many = <A>(p: parser<A>): parser<A[]> => ({
  run: (state) => {
    const results: any[] = [];

    let previousState: any = state;
    let currentState: any = state;

    while (true) {
      const { fst, snd } = p.run(currentState);
      currentState = fst;

      if (snd._tag == "Error") {
        return results.length === 0
          ? { fst, snd }
          : pair(previousState, ok(results));
      }

      if (snd.ok) {
        if (currentState.source.length > 0) {
          results.push(snd);
        } else {
          return pair(currentState, ok([snd, ...results]));
        }
      }

      previousState = currentState;
    }
  }
});

const sequence = <A>(p: parser<A>[]): parser<A[]> => ({
  run: (state) => {
    const results = [];
    let currentState = state;

    for (const parser of p) {
      let { fst, snd } = parser.run(currentState);
      currentState = fst;

      if (snd._tag == "Error") {
        return pair(currentState, ok(results));
      }

      if (snd.ok != null) {
        results.push(snd.ok);
      }
    }

    return pair(currentState, ok(results));
  }
});

const between = <A>(
  open: parser<any>,
  p: parser<A>,
  close: parser<any>
): parser<A> => ({
  // todo: this is bad but i'm lazy
  run: (state) => {
    const { fst, snd } = sequence([open, p, close]).run(state);

    return snd._tag == "Ok"
      ? pair(fst, ok(snd.ok[1]))
      : pair(fst, error(snd.error));
  }
});

const choice = <A>(parsers: parser<any>[]): parser<any> => ({
  run: (state) => {
    console.log(state);

    for (const parser of parsers) {
      const p = parser.run(state);

      if (p.snd._tag == "Ok") {
        return p;
      }
    }

    return pair(state, error("failed to match any of the choices"));
  }
});

const ignoreIfOk = <A>(parser: parser<A>): parser<null> => ({
  run: (state) => {
    const { fst: state0, snd } = parser.run(state);

    return snd._tag == "Ok"
      ? pair(state0, ok(null))
      : pair(state0, error(snd.error));
  }
});

const anyChar: parser<string> = {
  run: (state) => {
    let n = state.source.length;

    try {
      return pair(sourceSub(1, n - 1, state), ok(state.source[0]));
    } catch (e) {
      return pair(state, error("expected any character"));
    }
  }
};

const run = <A, B>(p: parser<A>, s: string): Result<A, parseError> => {
  const { fst: state0, snd } = p.run(toParseState(s));

  return snd._tag == "Ok"
    ? ok(snd.ok)
    : error({ description: snd.error, position: state0.position });
};

export {
  run,
  map,
  parseWhile,
  starRight,
  leftStar,
  leftStarRight,
  optional,
  many,
  prefix,
  choice,
  digit,
  string,
  between,
  anyChar,
  ignoreIfOk,
  sequence,
  parser
};
