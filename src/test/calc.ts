import {
  parser,
  choice,
  digit,
  leftStar,
  leftStarRight,
  many,
  parseWhile,
  prefix,
  reduce,
  run,
  starRight,
  map
} from "../core";

type num = {
  num: number;
};

type binop = {
  op: "+" | "-" | "*" | "/";
  v1: num;
  v2: num;
};

const isSpace = (x: string) => x == " " || x == "\n";

const spaces: parser<string> = parseWhile(isSpace);

const num = (): parser<num> =>
  reduce(many(digit()), { num: 0 }, (acc: num, current: any) => {
    return {
      num: parseInt(acc.num + current.ok)
    };
  });

const operator = (): parser<string> => choice([prefix("+"), prefix("-")]);

const expr = () => {
  return map((x: any) => {
    return {
      op: x.fst.snd,
      v1: x.fst.fst,
      v2: x.snd
    };
  }, leftStarRight(leftStar(leftStarRight(leftStar(starRight(spaces, num()), spaces), operator()), spaces), leftStar(num(), spaces)));
};

const evaluate = ({ op, v1, v2 }: binop): number => {
  switch (op) {
    case "+":
      return v1.num + v2.num;
    case "-":
      return v1.num - v2.num;
    case "*":
      return v1.num * v2.num;
    case "/":
      return v1.num / v2.num;
  }
};

let main = async () => {
  const data = "1 + 1";
  const result = run(expr(), data);

  result._tag == "Ok"
    ? console.log(evaluate(result.ok))
    : console.error(result.error);
};
main();
