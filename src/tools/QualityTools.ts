import {CartesianQuality} from '../CartesianQuality';
import {LatLng} from './LatLng';

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

    public static roundLatLng(latOrLng: number, cartesianStep = CartesianQuality.DEFAULT_SCALE): number {
        let decimalPlaces = 0;
        if (('' + cartesianStep).indexOf('0.') === 0) {
            decimalPlaces = ('' + cartesianStep).substring(2).length;
        } else {
            return Math.round(latOrLng / cartesianStep) * cartesianStep;
        }
        const p = Math.pow(10, decimalPlaces || 0);
        const n = (latOrLng * p) * (1 + Number.EPSILON);
        return Math.round(n) / p;
    }

    public static isEqualsLatLng(latOrLng1: number, latOrLng2: number, cartesianStep = CartesianQuality.DEFAULT_SCALE): boolean {
        return QualityTools.roundLatLng(latOrLng1, cartesianStep) === QualityTools.roundLatLng(latOrLng2, cartesianStep);
    }

    public static isAroundLatLng(latLngCenter: LatLng, latLngAround: LatLng, stepRange: number,
                                 cartesianStep = CartesianQuality.DEFAULT_SCALE): boolean {

        let isAround = false;
        const min = -stepRange * cartesianStep,
            max = stepRange * cartesianStep;
        for (let lat = min; !isAround && lat <= max; lat += cartesianStep) {
            for (let lng = min; !isAround && lng <= max; lng += cartesianStep) {
                isAround = QualityTools.roundLatLng(latLngCenter.lat, cartesianStep)
                    === QualityTools.roundLatLng(latLngAround.lat + lat, cartesianStep);
                if (isAround) {
                    isAround = QualityTools.roundLatLng(latLngCenter.lng, cartesianStep)
                        === QualityTools.roundLatLng(latLngAround.lng + lng, cartesianStep);
                }
            }
        }

        return isAround;
    }

    public static isNotAroundLatLng(latLngCenter: LatLng, latLngAround: LatLng, stepRange: number,
                                    cartesianStep = CartesianQuality.DEFAULT_SCALE): boolean {

        const max = stepRange * cartesianStep;

        let isOut = QualityTools.roundLatLng(latLngCenter.lat, cartesianStep)
            > QualityTools.roundLatLng(latLngAround.lat + max, cartesianStep)
            || QualityTools.roundLatLng(latLngCenter.lat, cartesianStep)
            < QualityTools.roundLatLng(latLngAround.lat - max, cartesianStep);
        if (!isOut) {
            isOut = QualityTools.roundLatLng(latLngCenter.lng, cartesianStep)
                > QualityTools.roundLatLng(latLngAround.lng + max, cartesianStep)
                || QualityTools.roundLatLng(latLngCenter.lng, cartesianStep)
                < QualityTools.roundLatLng(latLngAround.lng - max, cartesianStep);
        }

        return isOut;
    }

}
