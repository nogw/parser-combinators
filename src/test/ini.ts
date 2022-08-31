import {
  run,
  map,
  parseWhile,
  starRight,
  leftStar,
  leftStarRight,
  many,
  anyChar,
  prefix,
  parser
} from "../core";
import fs from "fs/promises";

const readFile = async () => {
  const data = await fs.readFile("./src/test/test.ini", {
    encoding: "utf-8"
  });

  return data;
};

type key = string;

type value = string;

type pair_t = { fst: key; snd: value };

type section_t = {
  name: string;
  pairs: pair_t[];
};

const sectionName: parser<string> = leftStar(
  starRight(
    prefix("["),
    parseWhile((x) => x != "]")
  ),
  anyChar
);

const isSpace = (x: string) => x == " " || x == "\n";

const spaces: parser<string> = parseWhile(isSpace);

const pair = (): parser<pair_t> => {
  let name = parseWhile((x) => !(isSpace(x) && x != "="));

  return leftStarRight(
    leftStar(
      leftStar(leftStar(starRight(spaces, name), spaces), prefix("=")),
      spaces
    ),
    leftStar(name, spaces)
  );
};

const section: parser<section_t> = map(({ fst, snd }) => {
  return { name: fst, pairs: snd };
}, leftStarRight(sectionName, many(pair())));

let ini: parser<section_t[]> = many(section);

let main = async () => {
  const data = await readFile();
  const result = run(ini, data);

  result._tag == "Ok" ? console.log(result.ok) : console.error(result.error);
};
main();
