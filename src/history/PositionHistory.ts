export class PositionHistory {
    constructor(
        public id: string,
        public date: Date,
        public x: number,
        public y: number,
        public value: number
    ) {
    }
}