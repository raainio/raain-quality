import {CartesianMeasureValue, CartesianValue, ICartesianMeasureValue, IPolarMeasureValue} from 'raain-model';
import {computeDestinationPoint, getBoundsOfDistance, getDistance, getRhumbLineBearing} from 'geolib';
import {QualityTools} from './QualityTools';
import {LatLng} from './LatLng';
import {CartesianQuality} from '../CartesianQuality';
import {Position} from './Position';

export class Converter {

    protected static TO_CARTESIAN_RATE = 0.3; // [0 - 1]
    protected static POLAR_PRECISION = 10; // [1 - 10]
    protected static CARTESIAN_WIDTH = 250;

    protected azimuthDelta: number;
    protected width: LatLng;

    constructor(protected center: LatLng,
                protected polarMeasureValue: IPolarMeasureValue) {

        const measureValuePolarContainers = this.polarMeasureValue.getPolars();
        this.azimuthDelta = -1;
        if (measureValuePolarContainers.length > 1) {
            this.azimuthDelta = measureValuePolarContainers[1].azimuth - measureValuePolarContainers[0].azimuth;
        }
        if (this.azimuthDelta <= 0) {
            // console.warn('this.azimuthDelta looks not consistent : data issue ?', this.azimuthDelta);
        }

        this.setWidth(CartesianQuality.DEFAULT_SCALE, CartesianQuality.DEFAULT_SCALE);
    }

    public static GetLatLngFromPolar(center: LatLng,
                                     polarAzimuthInDegrees: number,
                                     polarDistanceInMeters: number): LatLng {
        const dest = computeDestinationPoint(
            center,
            polarDistanceInMeters,
            polarAzimuthInDegrees
        );
        return new LatLng(dest.latitude, dest.longitude);
    }

    public static GetXYFromPolar(polarAzimuthInDegrees: number,
                                 polarDistanceInMeters: number,
                                 xyInMeters: number): { x: number, y: number } {

        const az = Converter.degToRad(-polarAzimuthInDegrees + 90);

        let x = polarDistanceInMeters / xyInMeters * Math.cos(az);
        let y = polarDistanceInMeters / xyInMeters * Math.sin(az);

        x = Math.round(x);
        y = Math.round(y);

        return {x, y};
    }

    public static ComputeLatLngRange(cartesianValues: CartesianValue[]): LatLng {

        let lat = CartesianQuality.DEFAULT_SCALE;
        let lng = CartesianQuality.DEFAULT_SCALE;
        if (cartesianValues.length > 1) {
            const lngValues = cartesianValues.sort((a, b) => a.lat - b.lat);
            lng = QualityTools.roundLatLng((lngValues[lngValues.length - 1].lng - lngValues[0].lng), CartesianQuality.DEFAULT_SCALE, true);
            const latValues = cartesianValues.sort((a, b) => a.lng - b.lng);
            lat = QualityTools.roundLatLng((latValues[latValues.length - 1].lat - latValues[0].lat), CartesianQuality.DEFAULT_SCALE, true);
        }
        return new LatLng(lat, lng);
    }

    public static ComputeLatLngStep(cartesianValues: CartesianValue[]): LatLng {

        let lat = CartesianQuality.DEFAULT_SCALE;
        let lng = CartesianQuality.DEFAULT_SCALE;
        if (cartesianValues.length > 1) {
            const lngValues = cartesianValues.sort((a, b) => a.lat - b.lat);
            lng = QualityTools.roundLatLng((lngValues[1].lng - lngValues[0].lng), CartesianQuality.DEFAULT_SCALE, true);
            const latValues = cartesianValues.sort((a, b) => a.lng - b.lng);
            lat = QualityTools.roundLatLng((latValues[1].lat - latValues[0].lat), CartesianQuality.DEFAULT_SCALE, true);
        }
        return new LatLng(lat, lng);
    }

    public static GetLatLngFromDistances(center: LatLng, xMeters: number, yMeters: number): LatLng {

        const polarAzimuthInDegrees = Converter.radToDeg(Math.atan2(xMeters, yMeters));
        const polarDistanceInMeters = Math.sqrt(xMeters * xMeters + yMeters * yMeters);

        const dest = computeDestinationPoint(
            center,
            polarDistanceInMeters,
            polarAzimuthInDegrees
        );
        return new LatLng(dest.latitude, dest.longitude);
    }

    public static CartesianSquare(point: LatLng, width: { lat: number, lng: number }): {
        p1: LatLng,
        p2: LatLng,
        p3: LatLng,
        p4: LatLng
    } {

        const distanceInMeters = getDistance(new LatLng(0, 0), new LatLng(width.lat, 0));
        const bounds = getBoundsOfDistance(point, distanceInMeters);

        // p1 = left bottom, p2 = right top
        const p1 = new LatLng(QualityTools.roundLatLng(point.lat, width.lat, true),
            QualityTools.roundLatLng(point.lng, width.lng, true));
        if (p1.lat !== point.lat) {
            p1.lat = QualityTools.roundLatLng(bounds[0].latitude, width.lat, true);
        }
        if (p1.lng !== point.lng) {
            p1.lng = QualityTools.roundLatLng(bounds[0].longitude, width.lng, true);
        }

        const p2 = new LatLng(QualityTools.roundLatLng(bounds[1].latitude, width.lat, true),
            QualityTools.roundLatLng(bounds[1].longitude, width.lng, true));

        // optional points p3 = left top, p2 = right bottom
        const p3 = new LatLng(p1.lat, p2.lng);
        const p4 = new LatLng(p2.lat, p1.lng);

        return {p1, p2, p3, p4};
    }

    public static MapLatLngToPosition(latLng: LatLng | CartesianValue, rounded = false): Position {
        let x = latLng.lng;
        let y = latLng.lat;
        if (rounded) {
            x = QualityTools.roundLatLng(x, CartesianQuality.DEFAULT_SCALE, true);
            y = QualityTools.roundLatLng(y, CartesianQuality.DEFAULT_SCALE, true);
        }

        return new Position(x, y);
    }

    public static MapPositionToLatLng(position: Position): LatLng {
        const lng = position.x;
        const lat = position.y;
        return new LatLng(lat, lng);
    }

    private static radToDeg(azimuthInRad: number) {
        let azimuthInDegrees = azimuthInRad * 180 / Math.PI; // rads to degs, range (-180, 180]
        if (azimuthInDegrees < 0) {
            azimuthInDegrees = 360 + azimuthInDegrees;
        } else if (azimuthInDegrees >= 360) {
            azimuthInDegrees = azimuthInDegrees - 360;
        }
        return azimuthInDegrees;
    }

    private static degToRad(azimuthInDegrees: number) {
        return azimuthInDegrees * Math.PI / 180;
    }


    public setWidth(lat: number, lng: number) {
        lat = Math.round(lat * 100000) / 100000;
        lng = Math.round(lng * 100000) / 100000;
        this.width = new LatLng(lat, lng);
    }

    public getCenter(): LatLng {
        return this.center;
    }

    public getCartesianMeasureValue(widthInKm: number = Converter.CARTESIAN_WIDTH): ICartesianMeasureValue {

        const azimuthPrecision = this.azimuthDelta / Converter.POLAR_PRECISION;
        const measureValuePolarContainers = this.polarMeasureValue.getPolars();

        const widthOfPixelInMeters = 100 * 1000 * CartesianQuality.DEFAULT_SCALE;

        // Build XY structure => {count, values}
        const subCartesianValues = {};
        for (const measureValuePolarContainer of measureValuePolarContainers) {
            const azimuth = measureValuePolarContainer.azimuth;
            const polarDistance = measureValuePolarContainer.distance;
            const distancePrecision = polarDistance / Converter.POLAR_PRECISION;
            for (const [index, edgeValue] of measureValuePolarContainer.polarEdges.entries()) {
                const distance = polarDistance * (index + 1);

                for (let subAzimuth = azimuth; subAzimuth < azimuth + this.azimuthDelta; subAzimuth += azimuthPrecision) {
                    for (let subDistance = distance; subDistance < distance + polarDistance; subDistance += distancePrecision) {
                        const {x, y} = Converter.GetXYFromPolar(subAzimuth, subDistance, widthOfPixelInMeters);
                        const key = 'x' + x + 'y' + y;

                        const count = subCartesianValues[key] ? subCartesianValues[key].count + 1 : 1;
                        const value = subCartesianValues[key] ? subCartesianValues[key].value + edgeValue : edgeValue;
                        subCartesianValues[key] = {count, value};
                    }
                }
            }
        }

        // Verify that we are realistic
        const keysCount = Object.keys(subCartesianValues).length;
        const matrixCount = Math.pow(Math.round((2 * widthInKm + 1) * 1000 / widthOfPixelInMeters), 2);
        const sRatio = keysCount / matrixCount;
        const sMaxRatio = 3.14 / 4;
        if (sRatio < sMaxRatio) {
            console.warn('>> raain-quality ### not realistic sampling', keysCount, matrixCount, sRatio, sMaxRatio);
        }

        // On each pixel of the map, compute value using XY structure
        const cartesianValues = [];
        for (let mX = -widthInKm * 1000; mX <= widthInKm * 1000; mX += widthOfPixelInMeters) {
            for (let mY = -widthInKm * 1000; mY <= widthInKm * 1000; mY += widthOfPixelInMeters) {
                const key = 'x' + Math.round(mX / widthOfPixelInMeters) + 'y' + Math.round(mY / widthOfPixelInMeters);
                const sub = subCartesianValues[key];
                const value = sub?.count ? sub.value / sub.count : 0;
                const point = Converter.GetLatLngFromDistances(this.center, mX, mY);
                cartesianValues.push(new CartesianValue(value,
                    QualityTools.roundLatLng(point.lat, CartesianQuality.DEFAULT_SCALE, true),
                    QualityTools.roundLatLng(point.lng, CartesianQuality.DEFAULT_SCALE, true)));
            }
        }

        return new CartesianMeasureValue(cartesianValues);
    }

    public getCartesianMeasureValueV1(widthInKm: number = 250): ICartesianMeasureValue {
        const cartesianValues = [];

        for (let kmX = -widthInKm; kmX <= widthInKm; kmX++) {
            for (let kmY = -widthInKm; kmY <= widthInKm; kmY++) {

                const point = Converter.GetLatLngFromDistances(this.center, kmX * 1000, kmY * 1000);
                const cartesianValue = this.toCartesianV1(point);
                const mapValue = new CartesianValue(
                    cartesianValue.value,
                    QualityTools.roundLatLng(cartesianValue.lat, this.width.lat, true),
                    QualityTools.roundLatLng(cartesianValue.lng, this.width.lat, true));
                cartesianValues.push(mapValue);
            }
        }

        return new CartesianMeasureValue(cartesianValues);
    }

    public toCartesianV1(point: LatLng): CartesianValue {

        const measureValuePolarContainers = this.polarMeasureValue.getPolars();
        if (measureValuePolarContainers.length <= 0) {
            return null;
        }

        // get the nearest LatLng square points
        const p1p2p3p4 = Converter.CartesianSquare(point, this.width);

        // get the polar equivalent from square points
        const a_1 = getRhumbLineBearing(this.center, p1p2p3p4.p1);
        const a_2 = getRhumbLineBearing(this.center, p1p2p3p4.p2);
        const a_3 = getRhumbLineBearing(this.center, p1p2p3p4.p3);
        const a_4 = getRhumbLineBearing(this.center, p1p2p3p4.p4);
        const d_1 = getDistance(this.center, p1p2p3p4.p1);
        const d_2 = getDistance(this.center, p1p2p3p4.p2);
        const d_3 = getDistance(this.center, p1p2p3p4.p3);
        const d_4 = getDistance(this.center, p1p2p3p4.p4);
        const a1 = Math.min(a_1, a_2, a_3, a_4);
        const d1 = Math.min(d_1, d_2, d_3, d_4);
        const a2 = Math.max(a_1, a_2, a_3, a_4);
        const d2 = Math.max(d_1, d_2, d_3, d_4);

        // get the list of the point's attached polar values
        const polarValuesLinkedToPoint: { value: number, rate: number }[] = [];

        // filtering out of scope
        const filteredMeasureValuePolarContainers = measureValuePolarContainers.filter(measureValuePolarContainer => {
            const azimuth1 = measureValuePolarContainer.azimuth;
            const azimuth2 = measureValuePolarContainer.azimuth + this.azimuthDelta;
            let outFull = (a1 > azimuth1 && a1 > azimuth2) || (a2 < azimuth1 && a2 < azimuth2);
            if (!measureValuePolarContainer.polarEdges) {
                console.warn('>> raain-quality ### issue with polarEdges ?', measureValuePolarContainer);
            }
            outFull = outFull || (measureValuePolarContainer.distance * measureValuePolarContainer.polarEdges.length < d1);
            return !outFull;
        });

        for (const measureValuePolarContainer of filteredMeasureValuePolarContainers) {
            const azimuth1 = measureValuePolarContainer.azimuth;
            const azimuth2 = measureValuePolarContainer.azimuth + this.azimuthDelta;

            let filteredPolarEdges = measureValuePolarContainer.polarEdges.map((polarEdge, index) => {
                const distance1 = measureValuePolarContainer.distance * index;
                const distance2 = distance1 + measureValuePolarContainer.distance;
                return {polarEdge, distance1, distance2};
            });

            filteredPolarEdges = filteredPolarEdges.filter(v => {
                const outFull = (d1 > v.distance1 && d1 > v.distance2) || (d2 < v.distance1 && d2 < v.distance2);
                return !outFull;
            });

            for (const v of filteredPolarEdges) {
                const distance1 = v.distance1;
                const distance2 = v.distance2;
                let rate = 0;

                let inFull = (a1 <= azimuth1 && azimuth2 <= a2) && (d1 <= distance1 && distance2 <= d2);
                inFull = inFull || (azimuth1 <= a1 && a2 <= azimuth2) && (distance1 <= d1 && d2 <= distance2);
                if (inFull) {
                    rate = 1;
                } else {
                    let inPartial = (a1 <= azimuth1 && azimuth1 <= a2) && (d1 <= distance1 && distance1 <= d2);
                    inPartial = inPartial || (a1 <= azimuth2 && azimuth2 <= a2) && (d1 <= distance1 && distance1 <= d2);
                    inPartial = inPartial || (a1 <= azimuth1 && azimuth1 <= a2) && (d1 <= distance2 && distance2 <= d2);
                    inPartial = inPartial || (a1 <= azimuth2 && azimuth2 <= a2) && (d1 <= distance2 && distance2 <= d2);
                    if (inPartial) {
                        rate = Converter.TO_CARTESIAN_RATE; // TODO manage square measure ?
                    } else {
                        let coveredPartial = (azimuth1 <= a1 && a1 <= azimuth2) && (distance1 <= d1 && d1 <= distance2);
                        coveredPartial = coveredPartial || (azimuth1 <= a2 && a2 <= azimuth2) && (distance1 <= d1 && d1 <= distance2);
                        coveredPartial = coveredPartial || (azimuth1 <= a1 && a1 <= azimuth2) && (distance1 <= d2 && d2 <= distance2);
                        coveredPartial = coveredPartial || (azimuth1 <= a2 && a2 <= azimuth2) && (distance1 <= d2 && d2 <= distance2);
                        if (coveredPartial) {
                            rate = Converter.TO_CARTESIAN_RATE; // TODO manage square measure ?
                        }
                    }
                }

                if (rate) {
                    polarValuesLinkedToPoint.push({value: v.polarEdge, rate});
                }
            }
        }

        // compute the value based on rated points
        let value = 0;
        if (polarValuesLinkedToPoint.length) {
            let rateSum = 0;
            let valueSum = 0;
            for (const v of polarValuesLinkedToPoint) {
                valueSum += v.value * v.rate;
                rateSum += v.rate;
            }
            value = valueSum / rateSum;
        }

        return new CartesianValue(value, point.lat, point.lng);
    }

}
