import {CartesianValue} from 'raain-model';


export class CartesianGaugeHistory {
    constructor(
        public gaugeId: string,
        public date: Date,
        public value: CartesianValue
    ) {
    }
}
