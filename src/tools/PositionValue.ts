import {Position} from './Position';

export class PositionValue extends Position {
    constructor(
        public x: number,
        public y: number,
        public value: number
    ) {
        super(x, y);
    }
}
