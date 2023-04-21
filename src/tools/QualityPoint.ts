import {CartesianValue} from 'raain-model';

export class QualityPoint {

    constructor(
        public gaugeId: string,
        public rainCartesianValue: CartesianValue,
        public gaugeCartesianValue: CartesianValue
    ) {
    }


}