import {Position} from '../tools/Position';

export class PositionHistory extends Position {
    constructor(
        public id: string,
        public date: Date,
        public x: number,
        public y: number,
        public value: number,
        public valueFromGauge?: number,
        public valueFromRain?: number,
    ) {
        super(x, y);
    }
}
