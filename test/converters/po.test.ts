import { Log } from "../../src/";
import { POConverter, Context } from "../../src/converters/po";

function convert(log: string[], ctx: Partial<Context> = {}) {
    const converter = new POConverter(new Log(log));
    if (ctx) {
        // @ts-expect-error: shouldn't do this but it's in a test file
        converter.ctx = Object.assign(converter.ctx, ctx);
    }
    return converter.convert();
}

describe("PO", () => {
    describe("Miscellaneous logs", () => {
        it("Battle starting message", () => {
            expect(convert(["Battle between jetou and BKC started!"])).toEqual([
                `|player|p1|jetou|1`,
                `|player|p2|BKC|2`,
            ]);
            expect(
                convert(["Battle between jetou and BKC is underway!"])
            ).toEqual([`|player|p1|jetou|1`, `|player|p2|BKC|2`]);
        });
        it("Game mode", () => {
            expect(convert(["Mode: Singles"])).toEqual([`|gametype|singles`]);
        });
        it("Game rules", () => {
            expect(convert(["Rule: Species Clause"])).toEqual([
                `|rule|Species Clause`,
            ]);
        });
        it("Tier", () => {
            expect(convert(["Tier: Adv OU"])).toEqual([
                `|gen|3`,
                `|tier|[Gen 3] OU`,
            ]);
            expect(convert(["Tier: 4th Gen OU"])).toEqual([
                `|gen|4`,
                `|tier|[Gen 4] OU`,
            ]);
            expect(convert(["Tier: OU Gen 4"])).toEqual([
                `|gen|4`,
                `|tier|[Gen 4] OU`,
            ]);
            expect(convert(["Tier: OverUsed Gen 4"])).toEqual([
                `|gen|4`,
                `|tier|[Gen 4] OverUsed`,
            ]);
            expect(convert(["Tier: Standard OU"])).toEqual([
                `|gen|5`,
                `|tier|[Gen 5] OU`,
            ]);
        });
        describe("Chat message", () => {
            it("Convert them correctly", () => {
                expect(
                    convert(["jetou: lol"], {
                        p1: { pNum: "1", name: "a", pokemon: {} },
                        p2: { pNum: "2", name: "b", pokemon: {} },
                    })
                ).toEqual(["|c|jetou|lol"]);
            });
            it("Add player rank if the messenger is a player", () => {
                expect(
                    convert(["jetou: lol"], {
                        p1: { pNum: "1", name: "jetou", pokemon: {} },
                        p2: { pNum: "2", name: "b", pokemon: {} },
                    })
                ).toEqual(["|c|☆jetou|lol"]);
            });
        });
        it("Joins", () => {
            expect(convert(["jetou is watching the battle"])).toEqual([
                "|j|jetou",
            ]);
        });
        it("Leaves", () => {
            expect(convert(["jetou stopped watching the battle."])).toEqual([
                "|l|jetou",
            ]);
        });
        it("Wins", () => {
            expect(convert(["jetou won the battle!"])).toEqual(["|win|jetou"]);
        });
        it("Forfeits", () => {
            expect(convert(["BKC forfeited against jetou!"])).toEqual([
                "|-message|BKC forfeited",
                "|",
                "|win|jetou",
            ]);
        });
        it("Turns", () => {
            expect(convert(["Start of turn 42!"])).toEqual([
                "|start",
                "|",
                "|turn|42",
            ]);
        });
    });
});
