import { PO } from "../../src/converters/po";

describe("PO", () => {
    describe("Miscellaneous logs", () => {
        it("Battle starting message", () => {
            expect(
                PO.convertLine("Battle between jetou and BKC started!").fn({})
            ).toEqual([`|player|p1|jetou|1`, `|player|p2|BKC|2`]);
            expect(
                PO.convertLine("Battle between jetou and BKC is underway!").fn(
                    {}
                )
            ).toEqual([`|player|p1|jetou|1`, `|player|p2|BKC|2`]);
        });
        it("Game mode", () => {
            expect(PO.convertLine("Mode: Singles").fn()).toEqual([
                `|gametype|singles`,
            ]);
        });
        it("Game rules", () => {
            expect(PO.convertLine("Rule: Species Clause").fn()).toEqual([
                `|rule|Species Clause`,
            ]);
        });
        it("Tier", () => {
            expect(PO.convertLine("Tier: Adv OU").fn({})).toEqual([
                `|gen|3`,
                `|tier|[Gen 3] OU`,
            ]);
            expect(PO.convertLine("Tier: 4th Gen OU").fn({})).toEqual([
                `|gen|4`,
                `|tier|[Gen 4] OU`,
            ]);
            expect(PO.convertLine("Tier: OU Gen 4").fn({})).toEqual([
                `|gen|4`,
                `|tier|[Gen 4] OU`,
            ]);
            expect(PO.convertLine("Tier: OverUsed Gen 4").fn({})).toEqual([
                `|gen|4`,
                `|tier|[Gen 4] OverUsed`,
            ]);
            expect(PO.convertLine("Tier: Standard OU").fn({})).toEqual([
                `|gen|5`,
                `|tier|[Gen 5] OU`,
            ]);
        });
        describe("Chat message", () => {
            it("Convert them correctly", () => {
                expect(
                    PO.convertLine("jetou: lol").fn({
                        p1: { name: "a" },
                        p2: { name: "b" },
                    })
                ).toEqual(["|c|jetou|lol"]);
            });
            it("Add player rank if the messenger is a player", () => {
                expect(
                    PO.convertLine("jetou: lol").fn({
                        p1: { name: "jetou" },
                        p2: { name: "b" },
                    })
                ).toEqual(["|c|☆jetou|lol"]);
            });
        });
        it("Joins", () => {
            expect(
                PO.convertLine("jetou is watching the battle").fn()
            ).toEqual(["|j|jetou"]);
        });
        it("Leaves", () => {
            expect(
                PO.convertLine("jetou stopped watching the battle.").fn()
            ).toEqual(["|l|jetou"]);
        });
        it("Wins", () => {
            expect(PO.convertLine("jetou won the battle!").fn()).toEqual([
                "|win|jetou",
            ]);
        });
        it("Forfeits", () => {
            expect(
                PO.convertLine("BKC forfeited against jetou!").fn()
            ).toEqual(["|-message|BKC forfeited", "|", "|win|jetou"]);
        });
        it("Turns", () => {
            expect(PO.convertLine("Start of turn 42!").fn({})).toEqual([
                "|turn|42",
            ]);
        });
    });
    describe("Battle Logs", () => {
        it("Switches", () => {
            expect(PO.convertLine(``).fn());
        });
    });
});
