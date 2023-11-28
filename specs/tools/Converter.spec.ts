import {expect} from 'chai';
import {CartesianValue, MeasureValuePolarContainer, PolarMeasureValue} from 'raain-model';
import {CartesianQuality, Converter, LatLng, Position, QualityTools} from '../../src/';

describe('Converter', () => {

    const DISTANCE = 1000;

    // tslint:disable:max-line-length
    const latLngAz0_d0 = [7, 7]; // https://www.google.com/maps/place/7%C2%B000'00.0%22N+7%C2%B000'00.0%22E/@7,6.9922752,4305m/data=!3m1!1e3!4m4!3m3!8m2!3d7!4d7?entry=ttu
    const latLngAz0_d1000 = [7.008993216059187, 7]; // https://www.google.com/maps/place/7%C2%B000'32.4%22N+7%C2%B000'00.0%22E/@7.0089985,6.9974251,1076m/data=!3m2!1e3!4b1!4m4!3m3!8m2!3d7.0089932!4d7?entry=ttu
    const latLngAz90_d1000 = [6.9999999133395, 7.009060753540984]; // https://www.google.com/maps/place/7%C2%B000'00.0%22N+7%C2%B000'32.4%22E/@7.0000053,6.9986949,4305m/data=!3m1!1e3!4m4!3m3!8m2!3d7!4d7.0089946?entry=ttu
    const latLngAz180_d1000 = [6.9910067839408128, 7]; // https://www.google.com/maps/place/6%C2%B059'27.6%22N+7%C2%B000'00.0%22E/@6.9963366,6.9903011,4305m/data=!3m1!1e3!4m4!3m3!8m2!3d6.9910068!4d7?entry=ttu
    const latLngAz225_d1000 = [6.9936407926232675, 6.993593167011922]; // https://www.google.com/maps/place/6%C2%B059'37.1%22N+6%C2%B059'37.1%22E/@6.9965852,6.984971,4305m/data=!3m1!1e3!4m4!3m3!8m2!3d6.9936408!4d6.9936399?entry=ttu
    const latLngAz50_d100000 = [7.577549652229804, 7.694977967491999]; // https://www.google.com/maps/dir/7.000,+7.0000/7.5779865,7.68917/@7.2923411,6.9956728,137684m/data=!3m2!1e3!4b1!4m7!4m6!1m3!2m2!1d7!2d7!1m0!3e2?entry=ttu

    function getPreparedScenario(withComplexValues: boolean) {

        const measureValuePolarContainers = [];
        for (let azimuth = 0; azimuth < 360; azimuth++) {
            const polarEdges = [];
            for (let edge = 0; edge < 250; edge++) {
                let value = edge;
                if (withComplexValues) {
                    value += azimuth;
                }
                polarEdges.push(value);
            }
            measureValuePolarContainers.push(new MeasureValuePolarContainer(
                {
                    azimuth,
                    distance: DISTANCE,
                    polarEdges
                }));
        }

        const polarMeasureValue = new PolarMeasureValue(measureValuePolarContainers);
        return {polarMeasureValue};
    }

    function getPreparedScenarioSimplistic() {
        const measureValuePolarContainers = [
            new MeasureValuePolarContainer(0, DISTANCE, [1, 2]),
            new MeasureValuePolarContainer(180, DISTANCE, [1, 2]),
        ];
        const polarMeasureValue = new PolarMeasureValue(measureValuePolarContainers);
        return {polarMeasureValue}
    }

    function getPreparedScenarioSimple() {
        const measureValuePolarContainers = [];
        for (let az = 0; az < 360; az++) {
            measureValuePolarContainers.push(new MeasureValuePolarContainer(az, DISTANCE, [1, 2, az]));
        }
        const polarMeasureValue = new PolarMeasureValue(measureValuePolarContainers);
        return {polarMeasureValue}
    }

    it('should GetLatLngFromPolar', () => {

        const center = new LatLng(latLngAz0_d0[0], latLngAz0_d0[1]);
        let point = Converter.GetLatLngFromPolar(center, 0, 0);
        expect(point.lat).eq(latLngAz0_d0[0]);
        expect(point.lng).eq(latLngAz0_d0[1]);

        point = Converter.GetLatLngFromPolar(center, 0, 1000);
        expect(point.lat).eq(latLngAz0_d1000[0]);
        expect(point.lng).eq(latLngAz0_d1000[1]);

        point = Converter.GetLatLngFromPolar(center, 180, 1000);
        expect(point.lat).eq(latLngAz180_d1000[0]);
        expect(point.lng).eq(latLngAz180_d1000[1]);

        point = Converter.GetLatLngFromPolar(center, 90, 1000);
        expect(point.lat).eq(latLngAz90_d1000[0]);
        expect(point.lng).eq(latLngAz90_d1000[1]);

        point = Converter.GetLatLngFromPolar(center, 225, 1000);
        expect(point.lat).eq(latLngAz225_d1000[0]);
        expect(point.lng).eq(latLngAz225_d1000[1]);

        point = Converter.GetLatLngFromPolar(center, 50, 100000);
        expect(point.lat).eq(latLngAz50_d100000[0]);
        expect(point.lng).eq(latLngAz50_d100000[1]);
    });

    it('should GetLatLngFromDistances', () => {

        const center = new LatLng(latLngAz0_d0[0], latLngAz0_d0[1]);
        let point = Converter.GetLatLngFromDistances(center, 0, 0);
        expect(point.lat).eq(latLngAz0_d0[0]);
        expect(point.lng).eq(latLngAz0_d0[1]);

        point = Converter.GetLatLngFromDistances(center, 0, 1000);
        expect(point.lat).eq(latLngAz0_d1000[0]);
        expect(point.lng).eq(latLngAz0_d1000[1]);

        point = Converter.GetLatLngFromDistances(center, 0, -1000);
        expect(point.lat).eq(latLngAz180_d1000[0]);
        expect(point.lng).eq(latLngAz180_d1000[1]);

        point = Converter.GetLatLngFromDistances(center, 1000, 0);
        expect(point.lat).eq(latLngAz90_d1000[0]);
        expect(point.lng).eq(latLngAz90_d1000[1]);

        point = Converter.GetLatLngFromDistances(center, -707, -707);
        const precision = 0.00001;
        expect(QualityTools.isEqualsLatLng(point.lat, latLngAz225_d1000[0], precision)).eq(true);
        expect(QualityTools.isEqualsLatLng(point.lng, latLngAz225_d1000[1], precision)).eq(true);


        point = Converter.GetLatLngFromDistances(center, 10000, 0);
        expect(point.lat).eq(latLngAz90_d1000[0]);
        expect(point.lng).eq(latLngAz90_d1000[1]);
    });

    it('should GetXYFromPolar', () => {

        let xyFromPolar = Converter.GetXYFromPolar(0, 0, 0);
        // tslint:disable-next-line:no-unused-expression
        expect(xyFromPolar.x).be.NaN;
        // tslint:disable-next-line:no-unused-expression
        expect(xyFromPolar.y).be.NaN;

        xyFromPolar = Converter.GetXYFromPolar(0, 0, -1);
        expect(xyFromPolar.x).eq(0);
        expect(xyFromPolar.y).eq(0);

        xyFromPolar = Converter.GetXYFromPolar(0, 1000, 1000);
        expect(xyFromPolar.x).eq(0);
        expect(xyFromPolar.y).eq(1);

        xyFromPolar = Converter.GetXYFromPolar(0, 2000, 1000);
        expect(xyFromPolar.x).eq(0);
        expect(xyFromPolar.y).eq(2);

        xyFromPolar = Converter.GetXYFromPolar(0, 2400, 1000);
        expect(xyFromPolar.x).eq(0);
        expect(xyFromPolar.y).eq(2);

        xyFromPolar = Converter.GetXYFromPolar(0, 2500, 1000);
        expect(xyFromPolar.x).eq(0);
        expect(xyFromPolar.y).eq(3);

        xyFromPolar = Converter.GetXYFromPolar(90, 1000, 1000);
        expect(xyFromPolar.x).eq(1);
        expect(xyFromPolar.y).eq(0);

        xyFromPolar = Converter.GetXYFromPolar(180, 1000, 1000);
        expect(xyFromPolar.x).eq(0);
        expect(xyFromPolar.y).eq(-1);

        xyFromPolar = Converter.GetXYFromPolar(225, 1000, 1000);
        expect(xyFromPolar.x).eq(-1);
        expect(xyFromPolar.y).eq(-1);

        xyFromPolar = Converter.GetXYFromPolar(225, 1000, 200);
        expect(xyFromPolar.x).eq(-4);
        expect(xyFromPolar.y).eq(-4);

        xyFromPolar = Converter.GetXYFromPolar(225, 2000, 500);
        expect(xyFromPolar.x).eq(-3);
        expect(xyFromPolar.y).eq(-3);

        xyFromPolar = Converter.GetXYFromPolar(270, 2000, 500);
        expect(xyFromPolar.x).eq(-4);
        expect(xyFromPolar.y).eq(0);

        xyFromPolar = Converter.GetXYFromPolar(270, 5000, 1000);
        expect(xyFromPolar.x).eq(-5);
        expect(xyFromPolar.y).eq(0);
    });

    it('should MapPositionToLatLng and MapLatLngToPosition', () => {

        let point = new Position(0, 0);
        let latLng = Converter.MapPositionToLatLng(point);
        expect(Converter.MapLatLngToPosition(latLng).x).eq(point.x);
        expect(Converter.MapLatLngToPosition(latLng).y).eq(point.y);
        expect(latLng.lat).eq(0);
        expect(latLng.lng).eq(0);

        point = new Position(10, -10);
        latLng = Converter.MapPositionToLatLng(point);
        expect(Converter.MapLatLngToPosition(latLng).x).eq(point.x);
        expect(Converter.MapLatLngToPosition(latLng).y).eq(point.y);
        expect(latLng.lat).eq(-10);
        expect(latLng.lng).eq(10);

        point = new Position(11.0003, -11.03);
        latLng = Converter.MapPositionToLatLng(point);
        expect(Converter.MapLatLngToPosition(latLng).x).eq(point.x);
        expect(Converter.MapLatLngToPosition(latLng).y).eq(point.y);

        point = new Position(11.0003, -11.03);
        latLng = Converter.MapPositionToLatLng(point);
        expect(Converter.MapLatLngToPosition(latLng, true).x).eq(11);
        expect(Converter.MapLatLngToPosition(latLng, true).y).eq(-11.03);

        const cartesianWidth = new LatLng(0.01426, 0.00898);
        expect(Converter.MapLatLngToPosition(latLng, true, cartesianWidth).y).eq(-11.02298);
        expect(Converter.MapLatLngToPosition(latLng, true, cartesianWidth).x).eq(11.0005);


        // => (2.26296, 48.86902); ???
        // cartesianRainHistories.filter(v => Math.floor(v.computedValue.lng*100)/100 === 2.26 && Math.floor(v.computedValue.lat*100)/100 === 48.86 )
        latLng = new LatLng(48.86420972077865, 2.2681507839189115);
        expect(Converter.MapLatLngToPosition(latLng, true, cartesianWidth).x).eq(2.27194);
        expect(Converter.MapLatLngToPosition(latLng, true, cartesianWidth).y).eq(48.86902);
        latLng = new LatLng(48.86423959124331, 2.254480156320581);
        expect(Converter.MapLatLngToPosition(latLng, true, cartesianWidth).x).eq(2.25398);
        expect(Converter.MapLatLngToPosition(latLng, true, cartesianWidth).y).eq(48.86902);

    });

    it('should ComputeLatLngStep', () => {

        let cartesianValues = [];
        let latLng = Converter.ComputeLatLngStep(cartesianValues);
        expect(latLng.lat).eq(CartesianQuality.DEFAULT_SCALE);
        expect(latLng.lng).eq(CartesianQuality.DEFAULT_SCALE);

        cartesianValues = [new CartesianValue(NaN, 3.00002, 4.4)];
        latLng = Converter.ComputeLatLngStep(cartesianValues);
        expect(latLng.lat).eq(CartesianQuality.DEFAULT_SCALE);
        expect(latLng.lng).eq(CartesianQuality.DEFAULT_SCALE);

        cartesianValues = [new CartesianValue(NaN, 3.00002, 4.4), new CartesianValue(NaN, 3.00002, 4.4)];
        latLng = Converter.ComputeLatLngStep(cartesianValues);
        expect(latLng.lat).eq(0);
        expect(latLng.lng).eq(0);

        cartesianValues = [new CartesianValue(NaN, 3, 4.4), new CartesianValue(NaN, 3.00002, 4.5)];
        latLng = Converter.ComputeLatLngStep(cartesianValues);
        expect(latLng.lat).eq(0);
        expect(latLng.lng).eq(0.1);

        cartesianValues = [new CartesianValue(NaN, 3, 4.4), new CartesianValue(NaN, 3.00002, 4.5), new CartesianValue(NaN, 8, 8)];
        latLng = Converter.ComputeLatLngStep(cartesianValues);
        expect(latLng.lat).eq(0);
        expect(latLng.lng).eq(0.1);

        cartesianValues = [new CartesianValue(NaN, 8, 8), new CartesianValue(NaN, 3.00002, 2.5), new CartesianValue(NaN, 3, 1.4)];
        latLng = Converter.ComputeLatLngStep(cartesianValues);
        expect(latLng.lat).eq(0);
        expect(latLng.lng).eq(1.1);

        cartesianValues = [new CartesianValue(NaN, -8, -8), new CartesianValue(NaN, -3.00002, -2.5), new CartesianValue(NaN, -3, -1.4)];
        latLng = Converter.ComputeLatLngStep(cartesianValues);
        expect(latLng.lat).eq(5);
        expect(latLng.lng).eq(5.5);
    });

    it('should ComputeLatLngRange', () => {

        let cartesianValues = [];
        cartesianValues = [new CartesianValue(NaN, 3.00002, 4.4), new CartesianValue(NaN, 3.00002, 4.4)];
        let latLng = Converter.ComputeLatLngRange(cartesianValues);
        expect(latLng.end.lat).eq(0);
        expect(latLng.end.lng).eq(0);

        cartesianValues = [new CartesianValue(NaN, 3, 4.4), new CartesianValue(NaN, 3.00002, 4.5)];
        latLng = Converter.ComputeLatLngRange(cartesianValues);
        expect(latLng.end.lat).eq(0);
        expect(latLng.end.lng).eq(0.1);

        cartesianValues = [new CartesianValue(NaN, 3, 4.4), new CartesianValue(NaN, 3.00002, 4.5), new CartesianValue(NaN, 8, 8)];
        latLng = Converter.ComputeLatLngRange(cartesianValues);
        expect(latLng.end.lat).eq(5);
        expect(latLng.end.lng).eq(3.6);

        cartesianValues = [new CartesianValue(NaN, 8, 8), new CartesianValue(NaN, 3.00002, 2.5), new CartesianValue(NaN, 3, 1.4)];
        latLng = Converter.ComputeLatLngRange(cartesianValues);
        expect(latLng.end.lat).eq(5);
        expect(latLng.end.lng).eq(6.6);

        cartesianValues = [new CartesianValue(NaN, -8, -8), new CartesianValue(NaN, -3.00002, -2.5), new CartesianValue(NaN, -3, -1.4)];
        latLng = Converter.ComputeLatLngRange(cartesianValues);
        expect(latLng.end.lat).eq(5);
        expect(latLng.end.lng).eq(6.6);
    });

    it('should ComputeCartesianSquare', () => {

        let center = new LatLng(1, 1);
        let square = Converter.ComputeCartesianSquare(center,
            {lat: CartesianQuality.DEFAULT_SCALE, lng: CartesianQuality.DEFAULT_SCALE});
        expect(square.p1.lat).eq(1);
        expect(square.p1.lng).eq(1);
        expect(square.p2.lat).eq(1.01);
        expect(square.p2.lng).eq(1.01);
        expect(square.p3.lat).eq(1);
        expect(square.p3.lng).eq(1.01);
        expect(square.p4.lat).eq(1.01);
        expect(square.p4.lng).eq(1);

        center = new LatLng(1.005, 1);
        square = Converter.ComputeCartesianSquare(center,
            {lat: CartesianQuality.DEFAULT_SCALE, lng: CartesianQuality.DEFAULT_SCALE});
        expect(square.p1.lat).eq(1);
        expect(square.p1.lng).eq(1);
        expect(square.p2.lat).eq(1.01);
        expect(square.p2.lng).eq(1.01);
        expect(square.p3.lat).eq(1);
        expect(square.p3.lng).eq(1.01);
        expect(square.p4.lat).eq(1.01);
        expect(square.p4.lng).eq(1);

        center = new LatLng(1.005, 1.005);
        square = Converter.ComputeCartesianSquare(center,
            {lat: CartesianQuality.DEFAULT_SCALE, lng: CartesianQuality.DEFAULT_SCALE});
        expect(square.p1.lat).eq(1);
        expect(square.p1.lng).eq(1);
        expect(square.p2.lat).eq(1.01);
        expect(square.p2.lng).eq(1.01);
        expect(square.p3.lat).eq(1);
        expect(square.p3.lng).eq(1.01);
        expect(square.p4.lat).eq(1.01);
        expect(square.p4.lng).eq(1);

        center = new LatLng(1.005, 0.995);
        square = Converter.ComputeCartesianSquare(center,
            {lat: CartesianQuality.DEFAULT_SCALE, lng: CartesianQuality.DEFAULT_SCALE});
        expect(square.p1.lat).eq(1);
        expect(square.p1.lng).eq(0.99);
        expect(square.p2.lat).eq(1.01);
        expect(square.p2.lng).eq(1);
        expect(square.p3.lat).eq(1);
        expect(square.p3.lng).eq(1);
        expect(square.p4.lat).eq(1.01);
        expect(square.p4.lng).eq(0.99);

    });

    it('should GetValueOfGroup', () => {

        expect(Converter.GetValueOfGroup([], 0, 0, 0)).eq(0);
        expect(Converter.GetValueOfGroup([1, 2, 3, 4], 2, 0, 0)).eq(1);
        expect(Converter.GetValueOfGroup([1, 2, 3, 4], 2, 1, 0)).eq(2);
        expect(Converter.GetValueOfGroup([1, 2, 3, 4], 2, 0, 1)).eq(3);
        expect(Converter.GetValueOfGroup([1, 2, 3, 4], 2, 1, 1)).eq(4);

        expect(Converter.GetValueOfGroup([1, 2, 3, 4, 5, 6, 7, 8], 2, 1, 0)).eq((3 + 4) / 2);

    });

    describe('V3', () => {

        it('should getCartesianMeasureValue V3 even simplistic', () => {

            const center = new LatLng(1, 1);
            // simplistic scenario is a [1,2] circles
            const polarMeasureValue = getPreparedScenarioSimplistic().polarMeasureValue;
            const converterFromPolar = new Converter(center, polarMeasureValue);

            const rainCartesianMeasureValue = converterFromPolar.getCartesianMeasureValue(2);

            // Verify
            QualityTools.logCartesianValues(rainCartesianMeasureValue.getCartesianValues());
            const json = rainCartesianMeasureValue.toJSON();
            expect(json['cartesianValues'].length).eq(25);

            const uniq = a => [...new Set(a)];
            const positions = rainCartesianMeasureValue.getCartesianValues().map(v => 'x' + v.lat + 'y' + v.lng);
            expect(uniq(positions).length).eq(25);
        });

        it('should getCartesianMeasureValue V3 simple', () => {

            const center = new LatLng(40, 40);
            // Simple 3 circles of [1,2,az], distance=1000m all around 360deg
            const polarMeasureValue = getPreparedScenarioSimple().polarMeasureValue;
            const converterFromPolar = new Converter(center, polarMeasureValue);

            const rainCartesianMeasureValue = converterFromPolar.getCartesianMeasureValue(5);

            // Verify
            QualityTools.logCartesianValues(rainCartesianMeasureValue.getCartesianValues());
            const json = rainCartesianMeasureValue.toJSON();
            expect(json['cartesianValues'].length).eq(121);
            expect(converterFromPolar.getCartesianPixelWidth().lat).eq(0.00899);
            expect(converterFromPolar.getCartesianPixelWidth().lng).eq(0.01174);

            const uniq = a => [...new Set(a)];
            const positions = rainCartesianMeasureValue.getCartesianValues().map(v => 'x' + v.lat + 'y' + v.lng);
            expect(uniq(positions).length).eq(121);
        });

        it('should getCartesianMeasureValue V3', () => {

            const center = new LatLng(40, 40);
            const polarMeasureValue = getPreparedScenario(true).polarMeasureValue;
            const converterFromPolar = new Converter(center, polarMeasureValue);

            const rainCartesianMeasureValue = converterFromPolar.getCartesianMeasureValue();
            const json = rainCartesianMeasureValue.toJSON();
            const cartesianValues = rainCartesianMeasureValue.getCartesianValues();
            const uniq = a => [...new Set(a)];
            const positions = cartesianValues.map(v => 'x' + v.lat + 'y' + v.lng);

            expect(cartesianValues.length).eq(251130); // (251 + 251) * (250 + 251) ?
            expect(json['cartesianValues'].length).eq(251130);
            expect(uniq(positions).length).eq(251130);

            expect(converterFromPolar.getCartesianPixelWidth().lat).eq(0.00899);
            expect(converterFromPolar.getCartesianPixelWidth().lng).eq(0.01174);
        });
    });

    xdescribe('V2', () => {
        it('should getCartesianMeasureValue V2 even simplistic', () => {

            const center = new LatLng(1, 1);
            // simplistic scenario is a [1,2] circles
            const polarMeasureValue = getPreparedScenarioSimplistic().polarMeasureValue;
            const converterFromPolar = new Converter(center, polarMeasureValue);

            const rainCartesianMeasureValue = converterFromPolar.getCartesianMeasureValueV2(2);

            // Verify
            QualityTools.logCartesianValues(rainCartesianMeasureValue.getCartesianValues());
            const json = rainCartesianMeasureValue.toJSON();
            expect(json['cartesianValues'].length).eq(25);
            expect(rainCartesianMeasureValue.getCartesianValueRounded(1, 1).value).eq(0);
            expect(rainCartesianMeasureValue.getCartesianValueRounded(1.01, 1.01).value).eq(1);
            expect(rainCartesianMeasureValue.getCartesianValueRounded(0.99, 0.99).value).eq(1);
            // expect(rainCartesianMeasureValue.getCartesianValueRounded(1.01, 0.99).value).eq(1.05); // KO
            expect(rainCartesianMeasureValue.getCartesianValueRounded(0.99, 1.01).value).eq(1);
            expect(rainCartesianMeasureValue.getCartesianValueRounded(1.02, 1.02).value).eq(2);
            expect(rainCartesianMeasureValue.getCartesianValueRounded(0.98, 0.98).value).eq(2);
            expect(rainCartesianMeasureValue.getCartesianValueRounded(1.02, 0.98).value).eq(2);
            expect(rainCartesianMeasureValue.getCartesianValueRounded(0.98, 1.02).value).eq(2);

            // in between values
            expect(rainCartesianMeasureValue.getCartesianValueRounded(1.02, 0.99).value).eq(1.8125);
            expect(rainCartesianMeasureValue.getCartesianValueRounded(0.98, 0.99).value).eq(1.8125);
        });

        it('should getCartesianMeasureValue V2 simple', () => {

            const center = new LatLng(1, 1);
            // Simple 3 circles of [1,2,az], distance=1000m all around 360deg
            const polarMeasureValue = getPreparedScenarioSimple().polarMeasureValue;
            const converterFromPolar = new Converter(center, polarMeasureValue);

            const rainCartesianMeasureValue = converterFromPolar.getCartesianMeasureValueV2(5);

            // Verify
            QualityTools.logCartesianValues(rainCartesianMeasureValue.getCartesianValues());
            const json = rainCartesianMeasureValue.toJSON();
            expect(json['cartesianValues'].length).eq(121);
            expect(rainCartesianMeasureValue.getCartesianValueRounded(1, 1).value).eq(0);
            expect(rainCartesianMeasureValue.getCartesianValueRounded(1.01, 1.01).value).eq(1);
            expect(rainCartesianMeasureValue.getCartesianValueRounded(1.02, 1.02).value).eq(1.3653846153846154);
            expect(rainCartesianMeasureValue.getCartesianValueRounded(0.98, 0.98).value).eq(1.3653458697112155);
            expect(rainCartesianMeasureValue.getCartesianValueRounded(1.03, 1.03).value).eq(13.134743875278396);
            expect(rainCartesianMeasureValue.getCartesianValueRounded(0.97, 0.97).value).eq(60.04347826086956);
        });

        it('should getCartesianMeasureValue V2', () => {

            const center = new LatLng(1, 1);
            const polarMeasureValue = getPreparedScenario(true).polarMeasureValue;
            const converterFromPolar = new Converter(center, polarMeasureValue);

            const rainCartesianMeasureValue = converterFromPolar.getCartesianMeasureValueV2();
            const json = rainCartesianMeasureValue.toJSON();
            // TODO expect(json['cartesianValues'].length).eq((250 + 251) * (250 + 251)
            //    * (0.01 / CartesianQuality.DEFAULT_SCALE) * (0.01 / CartesianQuality.DEFAULT_SCALE));

            //  expect(rainCartesianMeasureValue.getCartesianValueRounded(1, 1).value).eq(0);
            //  expect(rainCartesianMeasureValue.getCartesianValueRounded(1.02, 1.02).value).eq(0.3653314917127072);
            //  expect(rainCartesianMeasureValue.getCartesianValueRounded(0.98, 0.98).value).eq(0.36554621848739494);
            //  expect(rainCartesianMeasureValue.getCartesianValueRounded(2, 2).value).eq(103.05263157894737);

            expect(rainCartesianMeasureValue.getCartesianValueRounded(1, 1, CartesianQuality.DEFAULT_SCALE).value).eq(0);
            expect(rainCartesianMeasureValue.getCartesianValueRounded(1.01, 1.01, CartesianQuality.DEFAULT_SCALE).value).eq(45);
            expect(rainCartesianMeasureValue.getCartesianValueRounded(0.99, 0.99, CartesianQuality.DEFAULT_SCALE).value).eq(224.5183585313175);
            expect(rainCartesianMeasureValue.getCartesianValueRounded(2, 2, CartesianQuality.DEFAULT_SCALE).value).eq(147.8);
            expect(rainCartesianMeasureValue.getCartesianValueRounded(2, 0.99, CartesianQuality.DEFAULT_SCALE).value).eq(431.5882352941176);
            expect(rainCartesianMeasureValue.getCartesianValueRounded(2, 0, CartesianQuality.DEFAULT_SCALE).value).eq(417.8);
        }).timeout(5000);
    });

    xdescribe('V1', () => {

        it('should convert toCartesian', () => {

            let point, cartesianValue;
            const center = new LatLng(1, 1);
            const polarMeasureValue = getPreparedScenario(false).polarMeasureValue;
            const converterFromPolar = new Converter(center, polarMeasureValue);

            converterFromPolar.setCartesianPixelWidth(0.01, 0.01);

            point = new LatLng(1, 1);
            cartesianValue = converterFromPolar.toCartesianV1(point);
            expect(cartesianValue.lat).eq(1);
            expect(cartesianValue.lng).eq(1);
            expect(cartesianValue.value).eq(0.2321428571428579);

            point = new LatLng(1.02, 1.02);
            cartesianValue = converterFromPolar.toCartesianV1(point);
            expect(cartesianValue.lat).eq(point.lat);
            expect(cartesianValue.lng).eq(point.lng);
            expect(cartesianValue.value).eq(2.499999999999998);

            point = new LatLng(1.1, 1.1);
            cartesianValue = converterFromPolar.toCartesianV1(point);
            expect(cartesianValue.lat).eq(point.lat);
            expect(cartesianValue.lng).eq(point.lng);
            expect(cartesianValue.value).eq(10.500000000000002);

            point = new LatLng(0.2, 0.64);
            cartesianValue = converterFromPolar.toCartesianV1(point);
            expect(cartesianValue.value).eq(64.50000000000001);

        });


        it('should convert toCartesian out of scope => 0', () => {

            let point, cartesianValue;
            const center = new LatLng(1, 1);
            const polarMeasureValue = getPreparedScenario(false).polarMeasureValue;
            const converterFromPolar = new Converter(center, polarMeasureValue);

            converterFromPolar.setCartesianPixelWidth(0.01, 0.01);

            point = new LatLng(1.1, 6);
            cartesianValue = converterFromPolar.toCartesianV1(point);
            expect(cartesianValue.value).eq(0);
            point = new LatLng(6, 1.1);
            cartesianValue = converterFromPolar.toCartesianV1(point);
            expect(cartesianValue.value).eq(0);
            point = new LatLng(6, 6);
            cartesianValue = converterFromPolar.toCartesianV1(point);
            expect(cartesianValue.value).eq(0);
        });

        it('should convert toCartesian even with greater or less precision', () => {

            let point, cartesianValue;
            const center = new LatLng(1, 1);
            const polarMeasureValue = getPreparedScenario(false).polarMeasureValue;
            const converterFromPolar = new Converter(center, polarMeasureValue);

            // more precise
            converterFromPolar.setCartesianPixelWidth(0.001, 0.001);
            point = new LatLng(1.02, 1.02);
            cartesianValue = converterFromPolar.toCartesianV1(point);
            expect(cartesianValue.lat).eq(point.lat);
            expect(cartesianValue.lng).eq(point.lng);
            expect(cartesianValue.value).eq(2); // compare to 2.5

            point = new LatLng(1.021, 1.019);
            cartesianValue = converterFromPolar.toCartesianV1(point);
            expect(cartesianValue.lat).eq(point.lat);
            expect(cartesianValue.lng).eq(point.lng);
            expect(cartesianValue.value).eq(2); // compare to 2.5

            // less precise
            converterFromPolar.setCartesianPixelWidth(0.1, 0.1);
            point = new LatLng(1.08, 1.08);
            cartesianValue = converterFromPolar.toCartesianV1(point);
            expect(cartesianValue.lat).eq(point.lat);
            expect(cartesianValue.lng).eq(point.lng);
            expect(cartesianValue.value).eq(9.65635738831617); // compare to 10.5 in (1.1, 1.1)
        });

        it('should convert toCartesian even simplistic', () => {

            let point, cartesianValue;
            const center = new LatLng(1, 1);
            const polarMeasureValue = getPreparedScenarioSimplistic().polarMeasureValue;
            const converterFromPolar = new Converter(center, polarMeasureValue);

            point = new LatLng(0.981, 0.981);
            cartesianValue = converterFromPolar.toCartesianV1(point);
            expect(cartesianValue.lat).eq(point.lat);
            expect(cartesianValue.lng).eq(point.lng);
            expect(cartesianValue.value).eq(2);
        });

        it('should getCartesianMeasureValue V1 event simplistic', () => {

            const center = new LatLng(1, 1);
            const polarMeasureValue = getPreparedScenarioSimplistic().polarMeasureValue;
            const converterFromPolar = new Converter(center, polarMeasureValue);

            const rainCartesianMeasureValue = converterFromPolar.getCartesianMeasureValueV1(2);

            // Verify
            QualityTools.logCartesianValues(rainCartesianMeasureValue.getCartesianValues());
            const json = rainCartesianMeasureValue.toJSON();
            expect(json['cartesianValues'].length).eq(25);
            expect(rainCartesianMeasureValue.getCartesianValue(1, 1).value).eq(44.964285714285786);
            expect(rainCartesianMeasureValue.getCartesianValue(1.01, 1.01).value).eq(45.39393939393932);
            expect(rainCartesianMeasureValue.getCartesianValue(0.99, 0.99).value).eq(135.39218523878452);
            expect(rainCartesianMeasureValue.getCartesianValue(2, 2).value).eq(148.49999999999997);
        });

        it('should getCartesianMeasureValue V1 event simple', () => {

            const center = new LatLng(1, 1);
            const polarMeasureValue = getPreparedScenarioSimple().polarMeasureValue;
            const converterFromPolar = new Converter(center, polarMeasureValue);

            const rainCartesianMeasureValue = converterFromPolar.getCartesianMeasureValueV1(5);

            // Verify
            QualityTools.logCartesianValues(rainCartesianMeasureValue.getCartesianValues());
            const json = rainCartesianMeasureValue.toJSON();
            expect(json['cartesianValues'].length).eq(121);
            expect(rainCartesianMeasureValue.getCartesianValue(1, 1).value).eq(44.964285714285786);
            expect(rainCartesianMeasureValue.getCartesianValue(1.01, 1.01).value).eq(45.39393939393932);
            expect(rainCartesianMeasureValue.getCartesianValue(0.99, 0.99).value).eq(135.39218523878452);
            expect(rainCartesianMeasureValue.getCartesianValue(2, 2).value).eq(148.49999999999997);
        });

        it('should getCartesianMeasureValue V1', () => {

            const center = new LatLng(1, 1);
            const polarMeasureValue = getPreparedScenario(true).polarMeasureValue;
            const converterFromPolar = new Converter(center, polarMeasureValue);

            const rainCartesianMeasureValue = converterFromPolar.getCartesianMeasureValueV1();

            // Verify
            // QualityTools.logCartesianValues(center, rainCartesianMeasureValue.getCartesianValues());
            const json = rainCartesianMeasureValue.toJSON();
            expect(json['cartesianValues'].length).eq((250 + 251) * (250 + 251));
            expect(rainCartesianMeasureValue.getCartesianValue(1, 1).value).eq(44.964285714285786);
            expect(rainCartesianMeasureValue.getCartesianValue(1.01, 1.01).value).eq(45.39393939393932);
            expect(rainCartesianMeasureValue.getCartesianValue(0.99, 0.99).value).eq(135.39218523878452);
            expect(rainCartesianMeasureValue.getCartesianValue(2, 2).value).eq(148.49999999999997);
        }).timeout(5000);
    });

});
