import {CartesianValue} from 'raain-model';

export class QualityPoint {

    constructor(
        public gaugeId: string,
        public gaugeDate: Date,
        public rainDate: Date,
        public gaugeCartesianValue: CartesianValue,
        public rainCartesianValue: CartesianValue
    ) {
    }


}
