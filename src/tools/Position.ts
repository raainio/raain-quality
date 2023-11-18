export class Position {
    constructor(
        public x: number,
        public y: number
    ) {
    }

    static uniq = (a: Position[]): Position[] => {
        const set = [];
        for (const p of a) {
            const same = set.filter(s => s.x === p.x && s.y === p.y);
            if (same.length <= 0) {
                set.push(p);
            }
        }
        return set;
    }
}
