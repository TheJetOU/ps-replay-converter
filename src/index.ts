// Used by POCovnerter so it needs to be before the import
export abstract class Converter {
    constructor(readonly log: Log) {}
    abstract convert(): string[];
}

import { POConverter } from "./converters/po";

const CONVERTERS: { [sim: string]: new (log: Log) => Converter } = {
    PO: POConverter,
};

export class Log {
    readonly curLine: string;
    private readonly curLineIdx: number;
    constructor(public readonly lines: string[]) {
        this.curLine = lines[0];
        this.curLineIdx = 0;
    }
    next(): Log | null {
        if (this.curLineIdx === this.lines.length - 1) return null;
        return new Log(this.lines.slice(this.curLineIdx + 1));
    }
    *read() {
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        let curLog: Log | null = this;
        while (curLog !== null) {
            yield curLog;
            curLog = curLog.next();
        }
    }
}

export function convert<T extends keyof typeof CONVERTERS>(
    sim: T,
    logs: string
) {
    return new CONVERTERS[sim](new Log(logs.split("\n"))).convert().join("\n");
}

if (typeof window === "object") {
    // @ts-expect-error: TypeScript doesn't like people assinging
    // props to `window` for some reason
    window.convert = convert;
} else {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    // const fs = require("fs");
    // fs.readdir("./.test-data", (err: Error, files: string[]) => {
    //     if (err) throw err;
    //     for (const file of files) {
    //         fs.readFile(
    //             `./.test-data/${file}`,
    //             { encoding: "utf8" },
    //             (err: Error, data: string) => {
    //                 if (err) throw err;
    //                 if (file.startsWith("psp-")) return;
    //                 fs.writeFile(
    //                     `./.test-data/psp-${file}`,
    //                     convert("PO", data),
    //                     () => {
    //                         console.log(`Done writing ${file}`);
    //                     }
    //                 );
    //             }
    //         );
    //     }
    // });
}
