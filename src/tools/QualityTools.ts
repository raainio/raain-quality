import {CartesianQuality} from '../CartesianQuality';
import {LatLng} from './LatLng';
import {CartesianValue} from '../../../raain-model/dist';
import {Converter} from './Converter';

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

    public static roundLatLng(latOrLng: number, scale = CartesianQuality.DEFAULT_SCALE, needPrecision = false): number {

        const result = Math.round(latOrLng / scale) * scale;
        if (!needPrecision) {
            return result;
        }
        return parseFloat(parseFloat('' + result).toPrecision(12));

        // alternative ?
        // let decimalPlaces = 0;
        // if (('' + scale).indexOf('0.') === 0) {
        //     decimalPlaces = ('' + scale).substring(2).length;
        // } else {
        //     return Math.round(latOrLng / scale) * scale;
        // }
        // const p = Math.pow(10, decimalPlaces || 0);
        // const n = (latOrLng * p) * (1 + Number.EPSILON);
        // return Math.round(n) / p;
    }

    public static isEqualsLatLng(latOrLng1: number, latOrLng2: number, cartesianStep = CartesianQuality.DEFAULT_SCALE): boolean {
        return QualityTools.roundLatLng(latOrLng1, cartesianStep, true) === QualityTools.roundLatLng(latOrLng2, cartesianStep, true);
    }

    public static isAroundLatLng(latLngCenter: LatLng, latLngAround: LatLng, stepRange: number,
                                 cartesianStep = CartesianQuality.DEFAULT_SCALE): boolean {

        let isAround = false;
        const min = -stepRange * cartesianStep,
            max = stepRange * cartesianStep;
        for (let lat = min; !isAround && lat <= max; lat += cartesianStep) {
            for (let lng = min; !isAround && lng <= max; lng += cartesianStep) {
                isAround = QualityTools.roundLatLng(latLngCenter.lat, cartesianStep, true)
                    === QualityTools.roundLatLng(latLngAround.lat + lat, cartesianStep, true);
                if (isAround) {
                    isAround = QualityTools.roundLatLng(latLngCenter.lng, cartesianStep, true)
                        === QualityTools.roundLatLng(latLngAround.lng + lng, cartesianStep, true);
                }
            }
        }

        return isAround;
    }

    public static isNotAroundLatLng(latLngCenter: LatLng, latLngAround: LatLng, stepRange: number,
                                    cartesianStep = CartesianQuality.DEFAULT_SCALE): boolean {

        const max = (stepRange * cartesianStep) + Number.EPSILON;

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

    public static logCartesianValues(center: LatLng, cartesianValues: CartesianValue[], scale = CartesianQuality.DEFAULT_SCALE) {
        const pointsToShow = {};

        const latLngStep = Converter.ComputeLatLngStep(cartesianValues);
        const latLngRange = Converter.ComputeLatLngRange(cartesianValues);


        const labelWithSign = (val) => {
            const value = QualityTools.roundLatLng(val, scale, true);
            if (value < 0) {
                return '' + value;
            } else if (value === 0) {
                return ' ' + 0;
            }
            return '+' + value;
        }
        const labelX = (x) => {
            return labelWithSign(x);
        };
        const labelY = (y) => {
            return labelWithSign(y);
        };
        const valueDisplay = (v) => {
            return Math.round(v * 100) / 100;
        }

        for (let lat = center.lat - (latLngRange.lat / 2); lat < center.lat + (latLngRange.lat / 2); lat += latLngStep.lat) {
            const xObject = {};
            for (let lng = center.lng - (latLngRange.lng / 2); lng < center.lng + (latLngRange.lng / 2); lng += latLngStep.lng) {
                xObject[labelX(lng)] = valueDisplay(0);
            }
            pointsToShow[labelY(lat)] = xObject;
        }

        for (const [index, point] of cartesianValues.entries()) {
            pointsToShow[labelX(point.lat)][labelY(point.lng)] = valueDisplay(point.value);
        }

        console.table(pointsToShow);
    }

}
