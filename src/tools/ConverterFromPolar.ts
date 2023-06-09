import {CartesianValue, IPolarMeasureValue} from 'raain-model';
import {computeDestinationPoint, getBoundsOfDistance, getDistance, getRhumbLineBearing} from 'geolib';
import {QualityTools} from './QualityTools';
import {LatLng} from './LatLng';
import {CartesianQuality} from '../CartesianQuality';

export class ConverterFromPolar {

    protected azimuthDelta: number;

    constructor(protected center: LatLng,
                protected polarMeasureValue: IPolarMeasureValue,
                protected latLngPointWidth = CartesianQuality.DEFAULT_SCALE) {

        const measureValuePolarContainers = this.polarMeasureValue.getPolars();
        this.azimuthDelta = 0;
        if (measureValuePolarContainers.length >= 2) {
            this.azimuthDelta = measureValuePolarContainers[1].azimuth - measureValuePolarContainers[0].azimuth;
        }
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

    public static CartesianSquare(point: LatLng, cartesianStep = CartesianQuality.DEFAULT_SCALE): {
        p1: LatLng,
        p2: LatLng,
        p3: LatLng,
        p4: LatLng
    } {

        const distanceInMeters = getDistance(new LatLng(0, 0), new LatLng(cartesianStep, 0));
        const bounds = getBoundsOfDistance(point, distanceInMeters);

        // p1 = left bottom, p2 = right top
        const p1 = new LatLng(QualityTools.roundLatLng(point.lat, cartesianStep), QualityTools.roundLatLng(point.lng, cartesianStep));
        if (p1.lat !== point.lat) {
            p1.lat = QualityTools.roundLatLng(bounds[0].latitude, cartesianStep);
        }
        if (p1.lng !== point.lng) {
            p1.lng = QualityTools.roundLatLng(bounds[0].longitude, cartesianStep);
        }

        const p2 = new LatLng(QualityTools.roundLatLng(bounds[1].latitude, cartesianStep),
            QualityTools.roundLatLng(bounds[1].longitude, cartesianStep));

        // optional points p3 = left top, p2 = right bottom
        const p3 = new LatLng(p1.lat, p2.lng);
        const p4 = new LatLng(p2.lat, p1.lng);

        return {p1, p2, p3, p4};
    }

    public toCartesian(point: LatLng): CartesianValue {

        const measureValuePolarContainers = this.polarMeasureValue.getPolars();
        if (measureValuePolarContainers.length <= 0) {
            return null;
        }

        // get the nearest LatLng square points
        const p1p2p3p4 = ConverterFromPolar.CartesianSquare(point, this.latLngPointWidth);

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

        const filteredMeasureValuePolarContainers = measureValuePolarContainers.filter(measureValuePolarContainer => {
            const azimuth1 = measureValuePolarContainer.azimuth;
            const azimuth2 = measureValuePolarContainer.azimuth + this.azimuthDelta;
            let outFull = (a1 > azimuth1 && a1 > azimuth2) || (a2 < azimuth1 && a2 < azimuth2);
            outFull = outFull || (measureValuePolarContainer.distance * measureValuePolarContainer.polarEdges.length < d1);
            return !outFull;
        });

        filteredMeasureValuePolarContainers.forEach(measureValuePolarContainer => {
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

            filteredPolarEdges.forEach((v) => {
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
                        rate = 0.2;
                    }
                }

                if (rate) {
                    polarValuesLinkedToPoint.push({value: v.polarEdge, rate});
                }
            });
        });

        // compute the value based on rated points
        let value = 0;
        if (polarValuesLinkedToPoint.length) {
            let rateSum = 0;
            let valueSum = 0;
            polarValuesLinkedToPoint.forEach(v => {
                valueSum += v.value * v.rate;
                rateSum += v.rate;
            });
            value = valueSum / rateSum;
        }

        return new CartesianValue(value, point.lat, point.lng);
    }

}
