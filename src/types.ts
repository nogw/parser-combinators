// core types

type parseState = {
  source: string;
  position: number;
};

type parser<A> = {
  run: (_: parseState) => Pair<parseState, Result<A, string>>;
};

type parseError = {
  description: string;
  position: number;
};

// pair type

type Pair<A, B> = {
  fst: A;
  snd: B;
};

const pair = <A, B>(a: A, b: B): Pair<A, B> => ({
  fst: a,
  snd: b
});

// option type

type Option<A> = { none: boolean; some: A | null };

const some = <A>(x: A) => ({
  none: false,
  some: x
});

const none = {
  none: false,
  some: null
};

// result type

type Ok<A> = {
  readonly _tag: "Ok";
  readonly ok: A;
};

type Error<A> = {
  readonly _tag: "Error";
  readonly error: A;
};

type Result<A, B> = Ok<A> | Error<B>;

let ok = <A>(value: A): Ok<A> => ({
  _tag: "Ok",
  ok: value
});

let error = <B>(error: B): Error<B> => ({
  _tag: "Error",
  error: error
});

export {
  parseState,
  error,
  parser,
  Pair,
  pair,
  Option,
  some,
  none,
  Result,
  ok,
  parseError
};
