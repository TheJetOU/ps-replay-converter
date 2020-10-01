import { PO, Context as POContext } from "./converters/po";

const CONVERTERS = {
    PO,
};

export interface Converter<
    T extends { [k: string]: any } = Record<string, any>
> {
    buildParams: (ctx: T, log: Log<T, this>, params: string[]) => any[];
    convertLine: (
        line: string
    ) => { params: string[]; fn: (...args: any[]) => string[] | void };
}

export class Log<
    T extends { [k: string]: any } = Record<string, any>,
    U extends Converter<T> = Converter<T>
> {
    curLine: string;
    curLineIdx: number;
    constructor(public readonly converter: U, public readonly lines: string[]) {
        this.curLine = lines[0];
        this.curLineIdx = 0;
    }
    next(): Log<T, U> | null {
        if (this.curLineIdx === this.lines.length - 1) return null;
        return new Log<T, U>(
            this.converter,
            this.lines.slice(this.curLineIdx + 1)
        );
    }
    convert() {
        const ctx = {} as T;
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        let curLog: Log<T, U> | null = this;
        const protocol = [];
        while (curLog !== null) {
            const { params, fn } = this.converter.convertLine(curLog.curLine);
            const res = fn(
                ...this.converter.buildParams(ctx, curLog.clone(), params)
            );
            if (res) {
                protocol.push(...res);
            }
            curLog = curLog.next();
        }
        return protocol;
    }
    clone(): Log<T, U> {
        return new Log<T, U>(this.converter, this.lines.slice(this.curLineIdx));
    }
}

function convert<T extends keyof typeof CONVERTERS>(sim: T, logs: string) {
    return new Log<POContext>(CONVERTERS[sim], logs.split("\n"))
        .convert()
        .join("\n");
}

// import fs = require("fs");

// fs.readdir("./.test-data", (err, files) => {
//     if (err) throw err;
//     for (const file of files) {
//         fs.readFile(
//             `./.test-data/${file}`,
//             { encoding: "utf8" },
//             (err, data) => {
//                 if (err) throw err;
//                 if (file.startsWith("psp-")) return;
//                 fs.writeFile(
//                     `./.test-data/psp-${file}`,
//                     new Log<Context, typeof PO>(PO, data.split("\n"))
//                         .convert()
//                         .join("\n"),
//                     () => {
//                         console.log(`Done writing ${file}`);
//                     }
//                 );
//             }
//         );
//     }
// });
if (typeof window === "object") {
    // @ts-expect-error: TypeScript doesn't like people assinging
    // props to `window` for some reason
    window.convert = convert;
}
