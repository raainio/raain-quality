import {PositionValue} from '../tools/PositionValue';

export class PositionHistory extends PositionValue {
    constructor(
        public id: string,
        public date: Date,
        public x: number,
        public y: number,
        public value: number,
        public valueFromGauge?: number,
        public valueFromRain?: number,
    ) {
        super(x, y, value);
    }
}
