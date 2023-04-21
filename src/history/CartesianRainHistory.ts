import {CartesianValue} from 'raain-model';

export class CartesianRainHistory {
    constructor(
        public periodBegin: Date,
        public periodEnd: Date,
        public computedValue: CartesianValue
    ) {
    }
}
