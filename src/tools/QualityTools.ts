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

    public static logCartesianValues(cartesianValues: CartesianValue[]) {
        console.log('>> raain-quality ### logCartesianValues with', cartesianValues.length,
            CartesianQuality.DEFAULT_SCALE, Converter.POLAR_PRECISION, ' in progress...');
        const pointsToShow = {};
        const latSteps = Converter.ComputeLatSteps(cartesianValues);
        const lngSteps = Converter.ComputeLngSteps(cartesianValues);
        console.log('>> raain-quality ### logCartesianValues latSteps:', latSteps, 'lngSteps:', lngSteps);

        const labelX = (v: number) => {
            return Converter.LabelWithSign(v)
        }
        const labelY = (v: number) => {
            return Converter.LabelWithSign(v)
        }
        const valueDisplay = (v) => {
            return '' + Math.round(v * 100) / 100;
        }

        for (let lat of latSteps) {
            const xObject = {};
            for (let lng of lngSteps) {

                const latLng = new LatLng(lat, lng);
                latLng.setPrecision(12);
                lat = latLng.lat;
                lng = latLng.lng;
                xObject[labelX(lng)] = valueDisplay(0);
            }
            pointsToShow[labelY(lat)] = xObject;
        }

        for (const [index, point] of cartesianValues.entries()) {
            let value = valueDisplay(point.value)
            if (pointsToShow[labelY(point.lat)][labelX(point.lng)] !== '0') {
                value = '' + value + '?' + pointsToShow[labelY(point.lat)][labelX(point.lng)];
            }

            pointsToShow[labelY(point.lat)][labelX(point.lng)] = value;
        }

        console.table(pointsToShow);
    }

}
