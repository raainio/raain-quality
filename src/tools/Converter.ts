import {CartesianMeasureValue, CartesianValue, ICartesianMeasureValue, IPolarMeasureValue} from 'raain-model';
import {computeDestinationPoint, getBoundsOfDistance, getDistance, getRhumbLineBearing} from 'geolib';
import {QualityTools} from './QualityTools';
import {LatLng} from './LatLng';
import {CartesianQuality} from '../CartesianQuality';
import {Position} from './Position';

export class Converter {

    public static POLAR_PRECISION = 10; // [1 - 10]
    protected static CARTESIAN_GROUP_BY = 1;
    protected static CARTESIAN_WIDTH_IN_KM = 250;

    /**
     * value of [0 - 1]
     * @deprecated
     */
    protected static TO_CARTESIAN_RATE = 0.3;

    protected azimuthDelta: number;
    protected cartesianPixelWidth: LatLng;
    protected lastCartesianMeasureValueComputed: ICartesianMeasureValue;

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

        this.setCartesianPixelWidth(CartesianQuality.DEFAULT_SCALE, CartesianQuality.DEFAULT_SCALE);
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
                                 xyInMeters: number,
                                 groupWidth = 1): { x: number, y: number } {

        const az = Converter.DegToRad(-polarAzimuthInDegrees + 90);

        let x = (polarDistanceInMeters / xyInMeters * Math.cos(az)) / groupWidth;
        let y = (polarDistanceInMeters / xyInMeters * Math.sin(az)) / groupWidth;

        x = Math.round(x);
        y = Math.round(y);

        return {x, y};
    }

    public static ComputeLatLngRange(cartesianValues: CartesianValue[]): { start: LatLng, end: LatLng } {

        if (cartesianValues.length <= 1) {
            throw new Error('Impossible to compute empty values');
        }

        const lngValues = cartesianValues.sort((a, b) => a.lat - b.lat);
        const lng1 = lngValues[0].lng;
        const lng2 = lngValues[lngValues.length - 1].lng;

        const latValues = cartesianValues.sort((a, b) => a.lng - b.lng);
        const lat1 = latValues[0].lat;
        const lat2 = latValues[latValues.length - 1].lat;

        const start = new LatLng(lat1, lng1);
        const end = new LatLng(lat2, lng2);
        start.setPrecision(12);
        end.setPrecision(12);
        return {start, end};
    }

    public static ComputeLatSteps(cartesianValues: CartesianValue[]): number[] {
        const lats = cartesianValues.map(c => c.lat).sort((a, b) => a - b);
        return Converter.UniqNum(lats);
    }

    public static ComputeLngSteps(cartesianValues: CartesianValue[]): number[] {
        const lngs = cartesianValues.map(c => c.lng).sort((a, b) => a - b);
        return Converter.UniqNum(lngs);
    }

    public static ComputeLatLngStep(cartesianValues: CartesianValue[]): LatLng {

        let lat = CartesianQuality.DEFAULT_SCALE;
        let lng = CartesianQuality.DEFAULT_SCALE;
        if (cartesianValues.length > 1) {
            const lngValues = cartesianValues.sort((a, b) => a.lat - b.lat);
            lng = lngValues[1].lng - lngValues[0].lng;
            const latValues = cartesianValues.sort((a, b) => a.lng - b.lng);
            lat = latValues[1].lat - latValues[0].lat;
        }
        const latLng = new LatLng(lat, lng);
        latLng.setPrecision(12);
        return latLng;
    }

    public static GetLatLngFromDistances(center: LatLng, xMeters: number, yMeters: number): LatLng {

        const polarAzimuthInDegrees = Converter.RadToDeg(Math.atan2(xMeters, yMeters));
        const polarDistanceInMeters = Math.sqrt(xMeters * xMeters + yMeters * yMeters);

        const dest = computeDestinationPoint(
            center,
            polarDistanceInMeters,
            polarAzimuthInDegrees
        );
        return new LatLng(dest.latitude, dest.longitude);
    }

    public static ComputeCartesianSquare(point: LatLng, width: { lat: number, lng: number }): {
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

    public static MapLatLngToPosition(latLng: LatLng | CartesianValue, rounded = false,
                                      cartesianPixelWidth: LatLng =
                                          new LatLng(CartesianQuality.DEFAULT_SCALE, CartesianQuality.DEFAULT_SCALE,)): Position {
        let x = latLng.lng;
        let y = latLng.lat;
        if (rounded) {
            x = QualityTools.roundLatLng(x, cartesianPixelWidth.lng, true);
            y = QualityTools.roundLatLng(y, cartesianPixelWidth.lat, true);
        }

        return new Position(x, y);
    }

    public static MapPositionToLatLng(position: Position): LatLng {
        const lng = position.x;
        const lat = position.y;
        return new LatLng(lat, lng);
    }

    public static GetValueOfGroup(subs: number[], groupWidth: number, xInTheGroup: number, yInTheGroup: number) {
        if (groupWidth <= 0) {
            return 0;
        }

        const groupPos = xInTheGroup + yInTheGroup * groupWidth;
        const nbValuesByGroup = subs.length / (groupWidth * groupWidth);
        const sortedSubs = subs.sort((a, b) => a - b);
        return sortedSubs.reduce((p, v, i) => {
            const inTheSubGroup = Math.floor(i / nbValuesByGroup);
            if (inTheSubGroup === groupPos) {
                return v + p;
            }
            return p;
        }, 0) / nbValuesByGroup;
    }

    public static LabelWithSign(val: number) {
        const value = val;
        if (value < 0) {
            return '' + value;
        } else if (value === 0) {
            return ' ' + 0;
        }
        return '+' + value;
    }

    private static LabelX(key: string) {
        const value = parseInt(key.substring(1, key.indexOf('y')), 10);
        return Converter.LabelWithSign(value);
    }

    private static LabelY(key: string) {
        const value = parseInt(key.substring(key.indexOf('y') + 1), 10);
        return Converter.LabelWithSign(value);
    }

    private static ValueDisplay(v: number): number {
        return v;
    }

    private static RadToDeg(azimuthInRad: number) {
        let azimuthInDegrees = azimuthInRad * 180 / Math.PI; // rads to degs, range (-180, 180]
        if (azimuthInDegrees < 0) {
            azimuthInDegrees = 360 + azimuthInDegrees;
        } else if (azimuthInDegrees >= 360) {
            azimuthInDegrees = azimuthInDegrees - 360;
        }
        return azimuthInDegrees;
    }

    private static DegToRad(azimuthInDegrees: number) {
        return azimuthInDegrees * Math.PI / 180;
    }

    private static LogSubValues(subCartesianValues: {}, maxX: number, maxY: number) {
        console.log('>> raain-quality ### LogSubValues with',
            CartesianQuality.DEFAULT_SCALE, Converter.POLAR_PRECISION, ' in progress...');
        const pointsToShow = {};
        const keys = Object.keys(subCartesianValues);
        const width = Math.max(maxX, maxY); // Math.round((Math.sqrt(keys.length) - 2) / 2);
        for (let y = -width; y <= width; y++) {
            const xObject = {};
            for (let x = -width; x <= width; x++) {
                xObject[Converter.LabelX('x' + x + 'y')] = Converter.ValueDisplay(0);
            }
            pointsToShow[Converter.LabelY('xy' + y)] = xObject;
        }

        for (const [index, key] of keys.entries()) {
            const value = Math.round(subCartesianValues[key].value / subCartesianValues[key].count);
            pointsToShow[Converter.LabelY(key)][Converter.LabelX(key)] = value;
        }

        console.table(pointsToShow);
    }

    private static LogSubValuesGrouped(center: LatLng, subCartesianValues: {}, maxX: number, maxY: number) {
        console.log('>> raain-quality ### LogSubValuesGrouped with',
            center, CartesianQuality.DEFAULT_SCALE, Converter.POLAR_PRECISION, ' in progress...');
        const pointsToShow = {};
        const keys = Object.keys(subCartesianValues);
        const width = Math.max(maxX, maxY); // Math.round((Math.sqrt(keys.length) - 2) / 2);
        for (let y = -width; y <= width; y++) {
            const xObject = {};
            for (let x = -width; x <= width; x++) {
                xObject[Converter.LabelX('x' + x + 'y')] = Converter.ValueDisplay(0);
            }
            pointsToShow[Converter.LabelY('xy' + y)] = xObject;
        }

        for (const [index, key] of keys.entries()) {
            const sum = subCartesianValues[key].reduce((p, v) => p + v, 0);
            const value = Math.round(sum / subCartesianValues[key].length);
            pointsToShow[Converter.LabelY(key)][Converter.LabelX(key)] = value;
        }

        console.table(pointsToShow);
    }

    private static UniqNum(a: number[]) {
        return [...new Set(a)];
    }

    private static UniqStr(a: number[]) {
        return [...new Set(a)];
    }

    public getCartesianPixelWidth() {
        return this.cartesianPixelWidth;
    }

    public getCenter(): LatLng {
        return this.center;
    }

    public getCartesianMeasureValue(widthInKm: number = Converter.CARTESIAN_WIDTH_IN_KM, rounded = true): ICartesianMeasureValue {

        if (this.lastCartesianMeasureValueComputed) {
            return this.lastCartesianMeasureValueComputed;
        }

        const measureValuePolarContainers = this.polarMeasureValue.getPolars();

        const widthOfPixelInMeters = 100000 * CartesianQuality.DEFAULT_SCALE;
        const groupWidth = Math.sqrt(Converter.CARTESIAN_GROUP_BY);

        // Build XY structure => {count, sum(values)}
        const subCartesianValues = {};
        let maxX = 0;
        let maxY = 0;
        for (const measureValuePolarContainer of measureValuePolarContainers) {
            const azimuth = measureValuePolarContainer.azimuth;
            const polarDistance = measureValuePolarContainer.distance;
            const distancePrecision = polarDistance / Converter.POLAR_PRECISION;
            for (const [index, edgeValue] of measureValuePolarContainer.polarEdges.entries()) {
                const distance = polarDistance * (index + 1);
                const azimuthPrecision = this.azimuthDelta * (measureValuePolarContainer.polarEdges.length - index) +
                    this.azimuthDelta / Converter.POLAR_PRECISION * (index);

                for (let subAzimuth = azimuth; subAzimuth < azimuth + this.azimuthDelta; subAzimuth += azimuthPrecision) {
                    for (let subDistance = distance; subDistance < distance + polarDistance; subDistance += distancePrecision) {
                        const {x, y} = Converter.GetXYFromPolar(subAzimuth, subDistance, widthOfPixelInMeters, groupWidth);
                        const key = 'x' + x + 'y' + y;
                        maxX = Math.max(maxX, x);
                        maxY = Math.max(maxY, y);
                        if (!subCartesianValues[key]) {
                            subCartesianValues[key] = [];
                        }
                        subCartesianValues[key].push(edgeValue);
                    }
                }
            }
        }

        if (Object.keys(subCartesianValues).length < 3000) {
            Converter.LogSubValuesGrouped(this.center, subCartesianValues, maxX, maxY);
        }

        // compute cartesianPixelXWidth
        const point1 = Converter.GetLatLngFromDistances(this.center, 0, 0);
        const point2 = Converter.GetLatLngFromDistances(this.center, widthOfPixelInMeters, 0);
        const point3 = Converter.GetLatLngFromDistances(this.center, 0, widthOfPixelInMeters);
        this.setCartesianPixelWidth(Math.abs(point1.lat - point3.lat), Math.abs(point1.lng - point2.lng));

        // On each pixel of the map, ungroup values using XY structure
        const cartesianValues = [];
        const latLngAlreadyDone = {};
        const widthOfCartesianPixel = widthOfPixelInMeters; // TODO / 2
        for (let mX = -widthInKm * 1000; mX <= widthInKm * 1000; mX += widthOfCartesianPixel) {
            for (let mY = -widthInKm * 1000; mY <= widthInKm * 1000; mY += widthOfCartesianPixel) {
                const keyX = Math.round((mX / widthOfPixelInMeters) / groupWidth);
                const keyY = Math.round((mY / widthOfPixelInMeters) / groupWidth);
                const key = 'x' + keyX + 'y' + keyY;
                const subs = subCartesianValues[key];

                let value = 0;
                if (subs) {
                    const xInTheGroup = Math.abs(Math.round(mX / widthOfPixelInMeters)) % groupWidth;
                    const yInTheGroup = Math.abs(Math.round(mY / widthOfPixelInMeters)) % groupWidth;
                    value = Converter.GetValueOfGroup(subs, groupWidth, xInTheGroup, yInTheGroup);
                }

                const point = Converter.GetLatLngFromDistances(this.center, mX, mY);
                if (rounded) {
                    point.rounded(this.getCartesianPixelWidth());
                }

                const alreadyDoneKey = 'lat' + point.lat + 'lng' + point.lng;
                if (!latLngAlreadyDone[alreadyDoneKey]) {
                    cartesianValues.push(new CartesianValue(value, point.lat, point.lng));
                    latLngAlreadyDone[alreadyDoneKey] = true;
                } else {
                    // console.warn('bypass?', value, 'vs', latLngAlreadyDone[alreadyDoneKey]);
                }
            }
        }

        this.lastCartesianMeasureValueComputed = new CartesianMeasureValue(cartesianValues);
        return this.lastCartesianMeasureValueComputed;
    }

    public getCartesianMeasureValueV2(widthInKm: number = Converter.CARTESIAN_WIDTH_IN_KM): ICartesianMeasureValue {

        const azimuthPrecision = this.azimuthDelta / Converter.POLAR_PRECISION;
        const measureValuePolarContainers = this.polarMeasureValue.getPolars();

        const scale = this.cartesianPixelWidth.lat;
        const widthOfPixelInMeters = 100 * 1000 * scale;

        // Build XY structure => {count, sum(values)}
        const subCartesianValues = {};
        let maxX = 0;
        let maxY = 0;
        for (const measureValuePolarContainer of measureValuePolarContainers) {
            const azimuth = measureValuePolarContainer.azimuth;
            const polarDistance = measureValuePolarContainer.distance;
            const distancePrecision = polarDistance / Converter.POLAR_PRECISION;
            for (const [index, edgeValue] of measureValuePolarContainer.polarEdges.entries()) {
                const distance = polarDistance * (index + 1);
                // i=0 => azimuthDelta
                // i=polarEdges.length => this.azimuthDelta / Converter.POLAR_PRECISION
                const azimuthPrecision2 = this.azimuthDelta * (measureValuePolarContainer.polarEdges.length - index) +
                    this.azimuthDelta / Converter.POLAR_PRECISION * (index);

                for (let subAzimuth = azimuth; subAzimuth < azimuth + this.azimuthDelta; subAzimuth += azimuthPrecision2) {
                    for (let subDistance = distance; subDistance < distance + polarDistance; subDistance += distancePrecision) {
                        const {x, y} = Converter.GetXYFromPolar(subAzimuth, subDistance, widthOfPixelInMeters);
                        const key = 'x' + x + 'y' + y;
                        maxX = Math.max(maxX, x);
                        maxY = Math.max(maxY, y);

                        const count = subCartesianValues[key] ? subCartesianValues[key].count + 1 : 1;
                        const value = subCartesianValues[key] ? subCartesianValues[key].value + edgeValue : edgeValue;
                        subCartesianValues[key] = {count, value};
                    }
                }
            }
        }

        // Verify that we are realistic
        if (true) {
            const subKeys = Object.keys(subCartesianValues);
            // const subKeysSorted = subKeys.sort((a, b) => a.localeCompare(b));
            const keysCount = subKeys.length;
            if (keysCount < 3000) {
                Converter.LogSubValues(subCartesianValues, maxX, maxY);
            }
            const matrixCount = Math.pow(Math.round((2 * widthInKm + 1) * 1000 / widthOfPixelInMeters), 2);
            const sRatio = keysCount / matrixCount;
            const sMaxRatio = 3.14 / 4;
            if (sRatio < sMaxRatio) {
                console.warn('>> raain-quality ### not realistic sampling', keysCount, matrixCount, sRatio, sMaxRatio);
            }
        }

        // On each pixel of the map, compute value using XY structure
        let issues = 0, issuesWithSameValue = 0;
        const cartesianValues = [];
        const pixels = {};
        for (let mX = -widthInKm * 1000; mX <= widthInKm * 1000; mX += widthOfPixelInMeters) {
            for (let mY = -widthInKm * 1000; mY <= widthInKm * 1000; mY += widthOfPixelInMeters) {
                const key = 'x' + Math.round(mX / widthOfPixelInMeters) + 'y' + Math.round(mY / widthOfPixelInMeters);
                const sub = subCartesianValues[key];
                const value = sub?.count ? sub.value / sub.count : 0;
                const point = Converter.GetLatLngFromDistances(this.center, mX, mY);
                if (false) {
                    const lat = QualityTools.roundLatLng(point.lat, scale, true);
                    const lng = QualityTools.roundLatLng(point.lng, scale, true);
                    const pixelId = 'lat' + lat + 'lng' + lng;
                    const alreadyAddedValue = pixels[pixelId];
                    if (!alreadyAddedValue) {
                        cartesianValues.push(new CartesianValue(value, lat, lng));
                        pixels[pixelId] = value;
                    } else {
                        issues++;
                        if (alreadyAddedValue === value) {
                            issuesWithSameValue++;
                        } else {
                            //  console.log(value, alreadyAddedValue);
                        }
                    }
                } else {
                    cartesianValues.push(new CartesianValue(value, point.lat, point.lng));
                }
            }
        }

        // console.warn('issues ?', issues, 'issuesWithSameValue?', issuesWithSameValue, 'in', cartesianValues.length);
        return new CartesianMeasureValue(cartesianValues);
    }

    public getCartesianMeasureValueV1(widthInKm: number = Converter.CARTESIAN_WIDTH_IN_KM): ICartesianMeasureValue {
        const cartesianValues = [];
        const scale = CartesianQuality.DEFAULT_SCALE;
        const widthOfPixelInMeters = 100 * 1000 * scale;

        for (let mX = -widthInKm * 1000; mX <= widthInKm * 1000; mX += widthOfPixelInMeters) {
            for (let mY = -widthInKm * 1000; mY <= widthInKm * 1000; mY += widthOfPixelInMeters) {

                const point = Converter.GetLatLngFromDistances(this.center, mX, mY);
                const cartesianValue = this.toCartesianV1(point);
                const mapValue = new CartesianValue(
                    cartesianValue.value,
                    cartesianValue.lat, // QualityTools.roundLatLng(cartesianValue.lat, this.width.lat, true),
                    cartesianValue.lng, // QualityTools.roundLatLng(cartesianValue.lng, this.width.lat, true)
                );
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
        const p1p2p3p4 = Converter.ComputeCartesianSquare(point, this.cartesianPixelWidth);

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

    public setCartesianPixelWidth(lat: number, lng: number) {
        lat = Math.round(lat * 100000) / 100000;
        lng = Math.round(lng * 100000) / 100000;
        this.cartesianPixelWidth = new LatLng(lat, lng);
    }

    protected logCartesianValues() {
        if (!this.lastCartesianMeasureValueComputed) {
            return;
        }

        const cartesianValues = this.lastCartesianMeasureValueComputed.getCartesianValues();
        // const cartesianPixelWidth = this.getCartesianPixelWidth();
        QualityTools.logCartesianValues(cartesianValues);
    }
}
