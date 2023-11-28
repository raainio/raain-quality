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

    setPrecision(precision: number = 5) {
        const tenPower = Math.pow(10, precision);
        this.x = Math.round(this.x * tenPower) / tenPower;
        this.y = Math.round(this.y * tenPower) / tenPower;
    }

    samePosition(p: Position) {
        return this.x === p.x && this.y === p.y;
    }
}
