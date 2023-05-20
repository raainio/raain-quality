import {CartesianQuality} from '../CartesianQuality';

export class QualityTools {

    public static indexOfDualArray(array, itemToFind) {
        for (const [index, value] of array.entries()) {
            if (value[0] === itemToFind[0] && value[1] === itemToFind[1]) {
                return index;
            }
        }
        return -1;
    }

    public static precision(a) {
        if (!isFinite(a)) {
            return 0;
        }
        let e = 1, p = 0;
        while (Math.round(a * e) / e !== a) {
            e *= 10;
            p++;
        }
        return p;
    }

    public static roundLatLng(value: number, cartesianStep = CartesianQuality.DEFAULT_SCALE): number {
        // return value.toFixed(2);
        const decimalPlaces = 2;
        // return Math.round((value + Number.EPSILON) / cartesianStep) * cartesianStep;
        const p = Math.pow(10, decimalPlaces || 0);
        const n = (value * p) * (1 + Number.EPSILON);
        return Math.round(n) / p;
    }

    public static isEqualsLatLng(value1: number, value2: number, cartesianStep = CartesianQuality.DEFAULT_SCALE): boolean {
        return QualityTools.roundLatLng(value1, cartesianStep) === QualityTools.roundLatLng(value2, cartesianStep);
    }


}
