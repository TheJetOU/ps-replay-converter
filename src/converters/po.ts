import { Log, Converter } from "..";

type PlayerNum = "1" | "2";

type Status = "tox" | "psn" | "brn" | "slp" | "par";

interface Pokemon {
    specie: string;
    /** This property is `pokemon.nickname || pokemon.species` */
    name: string;
    hp: number;
    nickname?: string;
    status?: Status;
    toxicTurns?: number;
}

interface Player<T extends PlayerNum = PlayerNum> {
    pNum: T;
    name: string;
    pokemon: { [name: string]: Pokemon };
    curPokemon?: Pokemon;
}

export interface Context {
    p1: Player<"1">;
    p2: Player<"2">;
    gen: number;
    turn: number;
    lastMoveBy: Player;
}

function createPokemon(specie: string, nickname?: string): Pokemon {
    const pokemon: Pokemon = { specie, name: nickname || specie, hp: 100 };
    if (pokemon.nickname) {
        pokemon.nickname = nickname;
    }
    return pokemon;
}

function createPlayer<T extends PlayerNum = PlayerNum>(
    name: string,
    pNum: T
): Player<T> {
    return {
        name,
        pNum,
        pokemon: {},
    };
}

function convertStat(poStat: string) {
    switch (poStat) {
        case "Attack":
            return "atk";
        case "Defense":
            return "def";
        case "Sp. Att.":
            return "spa";
        case "Sp. Def.":
            return "spd";
        case "Speed":
            return "spe";
        default:
            throw new Error("Unrecognized stat: " + poStat);
    }
}

function parseTier(str: string) {
    const tiers = [
        "OU",
        "OverUsed",
        "UU",
        "UnderUsed",
        "RU",
        "RarelyUsed",
        "NU",
        "NeverUsed",
        "LC",
        "Little Cup",
    ];
    const gens: { [k: string]: number } = {
        RBY: 1,
        GSC: 2,
        ADV: 3,
        DPP: 4,
        DP: 4,
        BW: 5,
    };
    const obj = { tier: "OverUsed", gen: 5 };
    const matches = {
        gen: str
            .match(new RegExp(`(${Object.keys(gens).join("|")}|\\d)`, "i"))
            ?.slice(1),
        tier: str.match(new RegExp(`(${tiers.join("|")})`, "i"))?.slice(1),
    };
    if (matches.gen) {
        const [$1] = matches.gen;
        if (isNaN(parseInt($1))) {
            const tierNum = gens[$1.toUpperCase()];
            if (!tierNum) {
                throw new Error(`Couldn't parse tier: ${JSON.stringify(str)}`);
            }
            obj.gen = tierNum;
        } else {
            obj.gen = parseInt($1);
        }
    }
    if (matches.tier) {
        const [$1] = matches.tier;
        obj.tier = $1;
    }
    return obj;
}

function parsePlayers(ctx: Context, str: string) {
    str = str?.trim();
    const [p1, p2] = [ctx.p1, ctx.p2];
    switch (str) {
        case undefined:
        case `${p1.name}`:
        case `${p1.name}'s`:
            return [p1, p2];
        case "The foe's":
        case `${p2.name}`:
        case `${p2.name}'s`:
            return [p2, p1];
        default:
            throw new Error(
                `Couldn't parse players in string: ${JSON.stringify(str)}`
            );
    }
}

function parsePokemon(pokemonName: string) {
    if (pokemonName.includes("(")) {
        // This pokemon has a nickname
        const specie = pokemonName.slice(
            pokemonName.lastIndexOf("(") + 1,
            pokemonName.lastIndexOf(")")
        );
        const nickname = pokemonName.slice(0, -(specie.length + 4));
        return createPokemon(specie, nickname);
    } else {
        return createPokemon(
            pokemonName.slice(0, pokemonName.endsWith("!") ? -1 : undefined)
        );
    }
}

function findPokemon(ctx: Context, name: string) {
    const guessOwner = (
        possibleOwners: {
            player: Player;
            pokemon: Pokemon;
        }[]
    ) => {
        let owner: { player: Player; pokemon: Pokemon } | null = null;
        for (const possibleOwner of possibleOwners) {
            const { player, pokemon } = possibleOwner;
            if (player.curPokemon?.name !== pokemon.name) {
                owner = { player, pokemon };
            }
        }
        if (!owner) {
            throw new Error(
                `Could not parse owner for pokemon: ${JSON.stringify(name)}`
            );
        }
        return owner;
    };
    const possibleOwners: {
        player: Player;
        pokemon: Pokemon;
    }[] = [];
    for (const pokemon of Object.values(ctx.p1.pokemon)) {
        if (pokemon.name === name) {
            possibleOwners.push({
                player: ctx.p1,
                pokemon: pokemon,
            });
        }
    }
    for (const pokemon of Object.values(ctx.p2.pokemon)) {
        if (pokemon.name === name) {
            possibleOwners.push({ player: ctx.p2, pokemon: pokemon });
        }
    }
    if (!possibleOwners.length) {
        throw new Error(
            `Could not parse owner for pokemon: ${JSON.stringify(name)}`
        );
    }
    if (possibleOwners.length > 1) {
        return guessOwner(possibleOwners);
    }
    return possibleOwners[0];
}

function findOtherPlayer(
    player: Player,
    p1: Player<"1">,
    p2: Player<"2">
): Player {
    return player.pNum === "1" ? p2 : p1;
}

// function catRegExp(
//     flag: string | null | undefined = undefined,
//     ...regexps: RegExp[]
// ) {
//     if (flag === null) {
//         flag = undefined;
//     }
//     return new RegExp(
//         regexps.reduce((acc, cur) => {
//             return (
//                 acc + cur.toString().slice(1, cur.toString().lastIndexOf("/"))
//             );
//         }, ""),
//         flag
//     );
// }

const CHARGE_MOVES = ["Bounce"];

const SPECIAL_MOVES: {
    [move: string]: (
        ctx: Context,
        user: Player,
        otherPlayer: Player
    ) => string[];
} = {
    Protect(_ctx, user) {
        return [
            `|-singleturn|p${user.pNum}a: ${user.curPokemon!.name}|protect`,
        ];
    },
    "Perish Song"(_ctx, user, otherPlayer) {
        return [
            "|-fieldactivate|move: Perish Song",
            `|-start|p1a: ${user.curPokemon!.name}|perish3`,
            `|-start|p2a: ${otherPlayer.curPokemon!.name}|perish3`,
        ];
    },
    "Mean Look"(_ctx, _user, otherPlayer) {
        return [
            `|-activate|p${otherPlayer.pNum}a: ${
                otherPlayer.curPokemon!.name
            }|trapped`,
        ];
    },
};

export const PO: Converter<Context> = {
    buildParams(ctx: Context, log: Log<Context, typeof PO>, params: string[]) {
        const paramVals = [];
        for (const param of params) {
            switch (param) {
                case "context":
                    paramVals.push(ctx);
                    break;
                case "missed":
                    paramVals.push(
                        !!log
                            .next()
                            ?.curLine.match(/The attack of(.+'s )? missed/)
                    );
                    break;
                case "failed":
                    paramVals.push(
                        !!log.next()?.curLine.match(/But it failed!/)
                    );
                    break;
                case "nextMove":
                    let player: Player;
                    let pokemon: Pokemon;
                    let nextLine = log.next();
                    while (nextLine !== null) {
                        const match = nextLine.curLine
                            .match(/(.+'s )?(.+) used .+!/)
                            ?.slice(1);
                        if (match) {
                            const [$1, $2] = match;
                            player = parsePlayers(ctx, $1)[0];
                            pokemon = parsePokemon($2);
                            paramVals.push({ player, pokemon });
                            break;
                        }
                        nextLine = nextLine.next();
                    }
            }
        }
        return paramVals;
    },
    convertLine(
        line: string
    ): { params: string[]; fn: (...args: any[]) => string[] | void } {
        const noop = { params: [], fn: () => undefined };
        ///////////////////////////////////////////////////////////////////////
        // Miscellaneous Logs
        ///////////////////////////////////////////////////////////////////////
        let match: RegExpMatchArray | undefined = undefined;
        match = line
            .match(/Battle between (.+) and (.+) (started|is underway)!/)
            ?.slice(1);
        if (match) {
            const [$1, $2] = match;
            return {
                params: ["context"],
                fn: (ctx: Context) => {
                    ctx.p1 = createPlayer($1, "1");
                    ctx.p2 = createPlayer($2, "2");
                    return [
                        `|player|p1|${ctx.p1.name}|1`,
                        `|player|p2|${ctx.p2.name}|2`,
                    ];
                },
            };
        }
        match = line.match(/Mode: (.+)/)?.slice(1);
        if (match) {
            const [$1] = match;
            return {
                params: [],
                fn: () => {
                    return [`|gametype|${$1.toLowerCase()}`];
                },
            };
        }
        match = line.match(/Rule: (.+)/)?.slice(1);
        if (match) {
            const [$1] = match;
            return {
                params: [],
                fn: () => {
                    return [`|rule|${$1}`];
                },
            };
        }
        match = line.match(/Tier: (.+)/)?.slice(1);
        if (match) {
            const [$1] = match;
            const { tier, gen } = parseTier($1);
            return {
                params: ["context"],
                fn: (ctx: Context) => {
                    ctx.gen = gen;
                    return [`|gen|${gen}`, `|tier|[Gen ${gen}] ${tier}`];
                },
            };
        }
        match = line.match(/(.+): (.+)/)?.slice(1);
        if (match) {
            const [$1, $2] = match;
            return {
                params: ["context"],
                fn: (ctx: Context) => {
                    return [
                        `|c|${
                            [ctx.p1.name, ctx.p2.name].includes($1) ? "☆" : ""
                        }${$1}|${$2}`,
                    ];
                },
            };
        }
        match = line.match(/(.+) is watching the battle/)?.slice(1);
        if (match) {
            const [$1] = match;
            return {
                params: [],
                fn: () => {
                    return [`|j|${$1}`];
                },
            };
        }
        match = line.match(/(.+) stopped watching the battle/)?.slice(1);
        if (match) {
            const [$1] = match;
            return {
                params: [],
                fn: () => {
                    return [`|l|${$1}`];
                },
            };
        }
        match = line.match(/(.+) won the battle/)?.slice(1);
        if (match) {
            const [$1] = match;
            return {
                params: [],
                fn: () => {
                    return [`|win|${$1}`];
                },
            };
        }
        match = line.match(/(.+) forfeited against (.+)!/)?.slice(1);
        if (match) {
            const [$1, $2] = match;
            return {
                params: [],
                fn: () => {
                    return [`|-message|${$1} forfeited`, `|`, `|win|${$2}`];
                },
            };
        }
        match = line.match(/Start of turn (\d+)!?/)?.slice(1);
        if (match) {
            const [$1] = match;
            const turn = parseInt($1);
            if (isNaN(turn)) {
                throw new Error(`Couldn't parse turn: ${JSON.stringify($1)}`);
            }
            return {
                params: ["context"],
                fn: (ctx: Context) => {
                    ctx.turn = turn;
                    // TODO: investigate when to use `|upkeep`
                    const ret = [`|`, `|turn|${turn}`];
                    if (ctx.turn === 1) {
                        ret.unshift(`|start`);
                    }
                    return ret;
                },
            };
        }
        ///////////////////////////////////////////////////////////////////////
        // Battle Logs
        ///////////////////////////////////////////////////////////////////////
        match = line.match(/(.+) sent out (.+)/)?.slice(1);
        if (match) {
            const [$1, $2] = match;
            return {
                params: ["context"],
                fn: (ctx: Context) => {
                    const pokemon = parsePokemon($2);
                    const [player] = parsePlayers(ctx, $1);
                    if (!player.pokemon[pokemon.name]) {
                        player.pokemon[pokemon.name] = pokemon;
                    }
                    player.curPokemon = pokemon;
                    if (player.curPokemon.toxicTurns && ctx.gen > 2) {
                        player.curPokemon.toxicTurns = 1;
                    }
                    return [
                        `|switch|p${player.pNum}a: ${pokemon.name}|${
                            pokemon.specie
                        }|${pokemon.hp}/100${
                            pokemon.status ? " " + pokemon.status : ""
                        }`,
                    ];
                },
            };
        }
        match = line.match(/(.+'s )?(.+) used (.+)!/)?.slice(1);
        if (match) {
            const [$1, $2, $3] = match;
            return {
                params: ["context", "missed", "failed", "nextMove"],
                fn: (
                    ctx: Context,
                    missed: boolean,
                    failed: boolean,
                    nextMove: { player: Player; pokemon: Pokemon }
                ) => {
                    const protocol = [];
                    // rename later
                    const p1 = parsePlayers(ctx, $1)[0];
                    // Some battle don't have switch in messages
                    // and just started the battle with a move
                    if (!p1.curPokemon) {
                        p1.curPokemon = parsePokemon($2);
                        p1.pokemon[p1.curPokemon.name] = p1.curPokemon;
                        protocol.push(
                            `|switch|p${p1.pNum}a: ${p1.curPokemon.name}|${p1.curPokemon.name}|100`
                        );
                        const otherPlayer = findOtherPlayer(p1, ctx.p1, ctx.p2);
                        otherPlayer.curPokemon = nextMove.pokemon;
                        otherPlayer.pokemon[nextMove.pokemon.name] =
                            nextMove.pokemon;
                        protocol.push(
                            `|switch|p${otherPlayer.pNum}a: ${otherPlayer.curPokemon.name}|${otherPlayer.curPokemon.name}|100`
                        );
                    }
                    const { player, pokemon } = findPokemon(ctx, $2);
                    const otherPlayer = findOtherPlayer(player, ctx.p1, ctx.p2);
                    ctx.lastMoveBy = player;
                    protocol.push(
                        `|move|p${player.pNum}a: ${pokemon.name}|${$3}|p${
                            otherPlayer.pNum
                        }a: ${player.curPokemon!.name}`
                    );
                    if (missed) {
                        protocol[0] += `|miss`;
                        protocol.push(
                            `|-miss|p${player.pNum}a: ${pokemon.name}`
                        );
                    }
                    if (failed) {
                        protocol.push(
                            `|-fail|p${player.pNum}a: ${pokemon.name}|${$3}`
                        );
                    }
                    if (CHARGE_MOVES.includes($3)) {
                        protocol[0] += `|[from]lockedmove`;
                    }
                    if (SPECIAL_MOVES[$3]) {
                        protocol.push(
                            ...SPECIAL_MOVES[$3](ctx, player, otherPlayer)
                        );
                    }
                    return protocol;
                },
            };
        }
        match = line
            .match(/(.+) lost \d+ HP! \((\d+)% of its health\)/)
            ?.slice(1);
        if (match) {
            const [$1, $2] = match;
            return {
                params: ["context"],
                fn: (ctx: Context) => {
                    const { player, pokemon } = findPokemon(ctx, $1);
                    let hp = pokemon.hp - parseInt($2);
                    if (hp < 0) hp = 0;
                    pokemon.hp = hp;
                    return [
                        `|-damage|p${player.pNum}a: ${pokemon.name}|${
                            pokemon.hp
                        }/100${pokemon.status ? " " + pokemon.status : ""}`,
                    ];
                },
            };
        }
        match = line
            .match(/(?:.+'s )?(.+) lost (\d+)% of its health!/)
            ?.slice(1);
        if (match) {
            const [$1, $2] = match;
            return {
                params: ["context"],
                fn: (ctx: Context) => {
                    const { player, pokemon } = findPokemon(ctx, $1);
                    let hp = pokemon.hp - parseInt($2);
                    if (hp < 0) hp = 0;
                    pokemon.hp = hp;
                    return [
                        `|-damage|p${player.pNum}a: ${pokemon.name}|${
                            pokemon.hp
                        }/100${pokemon.status ? " " + pokemon.status : ""}`,
                    ];
                },
            };
        }
        match = line.match(/(?:.+'s )?(.+) regained health!/)?.slice(1);
        if (match) {
            const [$1] = match;
            return {
                params: ["context"],
                fn: (ctx: Context) => {
                    const { player, pokemon } = findPokemon(ctx, $1);
                    let hp = pokemon.hp + 50;
                    if (hp > 100) hp = 100;
                    pokemon.hp = hp;
                    return [
                        `|-heal|p${player.pNum}a: ${pokemon.name}|${
                            pokemon.hp
                        }/100${pokemon.status ? " " + pokemon.status : ""}`,
                    ];
                },
            };
        }
        match = line.match(/(?:.+'s )?(.+) fainted!/)?.slice(1);
        if (match) {
            const [$1] = match;
            return {
                params: ["context"],
                fn: (ctx: Context) => {
                    const { player, pokemon } = findPokemon(ctx, $1);
                    return [`|faint|p${player.pNum}a: ${pokemon.name}`];
                },
            };
        }
        if (line === "It's super effective!") {
            return {
                params: ["context"],
                fn: (ctx: Context) => {
                    const player = findOtherPlayer(
                        ctx.lastMoveBy,
                        ctx.p1,
                        ctx.p2
                    );
                    return [
                        `|-supereffective|p${player.pNum}a: ${
                            player.curPokemon!.name
                        }`,
                    ];
                },
            };
        }
        if (line === "It's not very effective...") {
            return {
                params: ["context"],
                fn: (ctx: Context) => {
                    const player = findOtherPlayer(
                        ctx.lastMoveBy,
                        ctx.p1,
                        ctx.p2
                    );
                    return [
                        `|-resisted|p${player.pNum}a: ${
                            player.curPokemon!.name
                        }`,
                    ];
                },
            };
        }
        if (line === "A critical hit!") {
            return {
                params: ["context"],
                fn: (ctx: Context) => {
                    const player = findOtherPlayer(
                        ctx.lastMoveBy,
                        ctx.p1,
                        ctx.p2
                    );
                    return [
                        `|-crit|p${player.pNum}a: ${player.curPokemon!.name}`,
                    ];
                },
            };
        }
        match = line.match(/It had no effect on .+!/)?.slice(1);
        if (match) {
            return {
                params: ["context"],
                fn: (ctx: Context) => {
                    const player = findOtherPlayer(
                        ctx.lastMoveBy,
                        ctx.p1,
                        ctx.p2
                    );
                    return [
                        `|-immune|p${player.pNum}a: ${player.curPokemon!.name}`,
                    ];
                },
            };
        }
        match = line
            .match(/(?:.+'s )?(.+) is paralyzed! It may be unable to move!/)
            ?.slice(1);
        if (match) {
            const [$1] = match;
            return {
                params: ["context"],
                fn: (ctx: Context) => {
                    const { player, pokemon } = findPokemon(ctx, $1);
                    pokemon.status = "par";
                    return [`|-status|p${player.pNum}a: ${pokemon.name}|par`];
                },
            };
        }
        match = line
            .match(/(?:.+'s )?(.+) is paralyzed! It can't move!/)
            ?.slice(1);
        if (match) {
            const [$1] = match;
            return {
                params: ["context"],
                fn: (ctx: Context) => {
                    const { player, pokemon } = findPokemon(ctx, $1);
                    return [`|cant|p${player.pNum}a: ${pokemon.name}`];
                },
            };
        }
        match = line.match(/(?:.+'s )?(.+) fell asleep!/)?.slice(1);
        if (match) {
            const [$1] = match;
            return {
                params: ["context"],
                fn: (ctx: Context) => {
                    const { player, pokemon } = findPokemon(ctx, $1);
                    pokemon.status = "slp";
                    return [`|-status|p${player.pNum}a: ${pokemon.name}|slp`];
                },
            };
        }
        match = line.match(/(?:.+'s )?(.+) is fast asleep!/)?.slice(1);
        if (match) {
            const [$1] = match;
            return {
                params: ["context"],
                fn: (ctx: Context) => {
                    const { player, pokemon } = findPokemon(ctx, $1);
                    return [`|cant|p${player.pNum}a: ${pokemon.name}`];
                },
            };
        }
        match = line.match(/(?:.+'s )?(.+) was (badly )?poisoned!/)?.slice(1);
        if (match) {
            const [$1, $2] = match;
            return {
                params: ["context"],
                fn: (ctx: Context) => {
                    const { player, pokemon } = findPokemon(ctx, $1);
                    pokemon.status = $2 ? "psn" : "tox";
                    if (pokemon.status === "tox") {
                        pokemon.toxicTurns = 1;
                    }
                    return [`|-status|p${player.pNum}a: ${pokemon.name}|psn`];
                },
            };
        }
        match = line.match(/(?:.+'s )?(.+) was hurt by poison!/)?.slice(1);
        if (match) {
            const [$1] = match;
            return {
                params: ["context"],
                fn: (ctx: Context) => {
                    const { player, pokemon } = findPokemon(ctx, $1);
                    let dmg;
                    if (pokemon.status === "tox") {
                        dmg = 6 * pokemon.toxicTurns!++;
                    } else {
                        dmg = ctx.gen === 1 ? 6 : 12;
                    }
                    pokemon.hp -= dmg;
                    return [
                        `|-damage|p${player.pNum}a: ${pokemon.name}|${pokemon.hp}/100 tox|[from] ${pokemon.status}`,
                    ];
                },
            };
        }
        match = line.match(/(?:.+'s )?(.+) woke up!/)?.slice(1);
        if (match) {
            const [$1] = match;
            return {
                params: ["context"],
                fn: (ctx: Context) => {
                    const { player, pokemon } = findPokemon(ctx, $1);
                    pokemon.status = undefined;
                    return [
                        `|-curestatus|p${player.pNum}a: ${pokemon.name}|slp`,
                    ];
                },
            };
        }
        match = line
            .match(/(?:.+'s )?(.+) restored a little HP using its Leftovers!/)
            ?.slice(1);
        if (match) {
            const [$1] = match;
            return {
                params: ["context"],
                fn: (ctx: Context) => {
                    const { player, pokemon } = findPokemon(ctx, $1);
                    let hp = pokemon.hp + 6;
                    if (hp > 100) hp = 100;
                    pokemon.hp = hp;
                    return [
                        `|-heal|p${player.pNum}a: ${pokemon.name}|${
                            pokemon.hp
                        }/100${
                            pokemon.status ? " " + pokemon.status : ""
                        }|[from] item: Leftovers`,
                    ];
                },
            };
        }
        match = line
            .match(/(?:.+'s )?(.+)'s perish count fell to (\d)!/)
            ?.slice(1);
        if (match) {
            const [$1, $2] = match;
            return {
                params: ["context"],
                fn: (ctx: Context) => {
                    const { player, pokemon } = findPokemon(ctx, $1);
                    if ($2 === "3") return [];
                    return [
                        `|-start|p${player.pNum}a: ${pokemon.name}|perish${$2}`,
                    ];
                },
            };
        }
        match = line.match(/(?:.+'s )?(.+) sprang up!/)?.slice(1);
        if (match) {
            const [$1] = match;
            return {
                params: ["context"],
                fn: (ctx: Context) => {
                    const { player, pokemon } = findPokemon(ctx, $1);
                    const otherPlayer = findOtherPlayer(player, ctx.p1, ctx.p2);
                    return [
                        `|move|p${player.pNum}a: ${pokemon.name}|Bounce|[still]`,
                        `|-prepare|p${player.pNum}a: ${pokemon.name}|Bounce|p${
                            otherPlayer.pNum
                        }a: ${otherPlayer.curPokemon!.name}`,
                    ];
                },
            };
        }
        match = line.match(/(?:.+'s )?(.+) fell for the taunt!/)?.slice(1);
        if (match) {
            const [$1] = match;
            return {
                params: ["context"],
                fn: (ctx: Context) => {
                    const { player, pokemon } = findPokemon(ctx, $1);
                    return [
                        `|-start|p${player.pNum}a: ${pokemon.name}|move: Taunt`,
                    ];
                },
            };
        }
        match = line
            .match(/(?:.+'s )?(.+) can't use (.+) after the taunt!/)
            ?.slice(1);
        if (match) {
            const [$1, $2] = match;
            return {
                params: ["context"],
                fn: (ctx: Context) => {
                    const { player, pokemon } = findPokemon(ctx, $1);
                    return [
                        `|cant|p${player.pNum}a: ${pokemon.name}|move: Taunt|${$2}`,
                    ];
                },
            };
        }
        match = line
            .match(/Spikes were scattered all around the feet of (.+)'s team!/)
            ?.slice(1);
        if (match) {
            const [$1] = match;
            return {
                params: ["context"],
                fn: (ctx: Context) => {
                    const player = parsePlayers(ctx, $1)[0];
                    return [
                        `|-sidestart|p${player.pNum}: ${player.name}|Spikes`,
                    ];
                },
            };
        }
        match = line
            .match(/Pointed stones float in the air around (.+) team!/)
            ?.slice(1);
        if (match) {
            const [$1] = match;
            return {
                params: ["context"],
                fn: (ctx: Context) => {
                    const player = parsePlayers(ctx, $1)[0];
                    return [
                        `|-sidestart|p${player.pNum}: ${player.name}|Stealth Rock`,
                    ];
                },
            };
        }
        match = line
            .match(
                /Poison Spikes were scattered all around the feet of (.+)'s team!/
            )
            ?.slice(1);
        if (match) {
            const [$1] = match;
            return {
                params: ["context"],
                fn: (ctx: Context) => {
                    const player = parsePlayers(ctx, $1)[0];
                    return [
                        `|-sidestart|p${player.pNum}: ${player.name}|Toxic Spikes`,
                    ];
                },
            };
        }
        match = line.match(/(?:.+'s )?(.+) blew away (.+)!/)?.slice(1);
        if (match) {
            const [$1, $2] = match;
            return {
                params: ["context"],
                fn: (ctx: Context) => {
                    const { player } = findPokemon(ctx, $1);
                    const otherPlayer = findOtherPlayer(player, ctx.p1, ctx.p2);
                    return [
                        `|-sideend|p${otherPlayer.pNum}: ${otherPlayer.name}|${$2}`,
                    ];
                },
            };
        }
        match = line
            .match(
                /(?:.+'s )?(.+)'s (Attack|Defense|Speed|Sp\. Att.|Sp\. Def\.) (sharply )?(rose|fell)!/
            )
            ?.slice(1);
        if (match) {
            const [$1, $2, $3, $4] = match;
            return {
                params: ["context"],
                fn: (ctx: Context) => {
                    const { player, pokemon } = findPokemon(ctx, $1);
                    return [
                        `|-${$4 === "fell" ? "un" : ""}boost|p${
                            player.pNum
                        }a: ${pokemon.name}|${convertStat($2)}|${
                            $3 ? "2" : "1"
                        }`,
                    ];
                },
            };
        }
        match = line
            .match(/(?:.+'s )?(.+)'s Sand Stream whipped up a sandstorm!/)
            ?.slice(1);
        if (match) {
            const [$1] = match;
            return {
                params: ["context"],
                fn: (ctx: Context) => {
                    const { player, pokemon } = findPokemon(ctx, $1);
                    return [
                        `|-weather|Sandstorm|[from] ability: Sand Stream|[of] p${player.pNum}a: ${pokemon.name}`,
                    ];
                },
            };
        }
        if (line === "The sandstorm rages.") {
            return {
                params: [],
                fn: () => ["|-weather|Sandstorm|[upkeep]"],
            };
        }
        match = line
            .match(/(?:.+'s )?(.+) is buffeted by the sandstorm!/)
            ?.slice(1);
        if (match) {
            const [$1] = match;
            return {
                params: ["context"],
                fn: (ctx: Context) => {
                    const { player, pokemon } = findPokemon(ctx, $1);
                    let hp = pokemon.hp - 6;
                    if (hp < 0) hp = 0;
                    pokemon.hp = hp;
                    return [
                        `|-damage|p${player.pNum}a: ${pokemon.name}|${
                            pokemon.hp
                        }/100${
                            pokemon.status ? " " + pokemon.status : ""
                        }|[from] Sandstorm`,
                    ];
                },
            };
        }
        return noop;
    },
};
