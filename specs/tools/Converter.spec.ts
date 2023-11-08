import {expect} from 'chai';
import {MeasureValuePolarContainer, PolarMeasureValue} from 'raain-model';
import {CartesianQuality, Converter, LatLng, Position, QualityTools} from '../../src/';


describe('Converter', () => {

    const DISTANCE = 1500;

    // tslint:disable:max-line-length
    const az0_d0 = [7, 7]; // https://www.google.com/maps/place/7%C2%B000'00.0%22N+7%C2%B000'00.0%22E/@7,6.9922752,4305m/data=!3m1!1e3!4m4!3m3!8m2!3d7!4d7?entry=ttu
    const az0_d1000 = [7.008993216059187, 7]; // https://www.google.com/maps/place/7%C2%B000'32.4%22N+7%C2%B000'00.0%22E/@7.0089985,6.9974251,1076m/data=!3m2!1e3!4b1!4m4!3m3!8m2!3d7.0089932!4d7?entry=ttu
    const az90_d1000 = [6.9999999133395, 7.009060753540984]; // https://www.google.com/maps/place/7%C2%B000'00.0%22N+7%C2%B000'32.4%22E/@7.0000053,6.9986949,4305m/data=!3m1!1e3!4m4!3m3!8m2!3d7!4d7.0089946?entry=ttu
    const az180_d1000 = [6.9910067839408128, 7]; // https://www.google.com/maps/place/6%C2%B059'27.6%22N+7%C2%B000'00.0%22E/@6.9963366,6.9903011,4305m/data=!3m1!1e3!4m4!3m3!8m2!3d6.9910068!4d7?entry=ttu
    const az225_d1000 = [6.9936407926232675, 6.993593167011922]; // https://www.google.com/maps/place/6%C2%B059'37.1%22N+6%C2%B059'37.1%22E/@6.9965852,6.984971,4305m/data=!3m1!1e3!4m4!3m3!8m2!3d6.9936408!4d6.9936399?entry=ttu
    const az50_d100000 = [7.577549652229804, 7.694977967491999]; // https://www.google.com/maps/dir/7.000,+7.0000/7.5779865,7.68917/@7.2923411,6.9956728,137684m/data=!3m2!1e3!4b1!4m7!4m6!1m3!2m2!1d7!2d7!1m0!3e2?entry=ttu

    function getPreparedScenario() {

        const measureValuePolarContainers = [];
        for (let azimuth = 0; azimuth < 360; azimuth++) {
            const polarEdges = [];
            for (let edge = 0; edge < 250; edge++) {
                polarEdges.push(edge);
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
            new MeasureValuePolarContainer(0, 1000, [1, 2]),
            new MeasureValuePolarContainer(180, 1000, [1, 2]),
        ];
        const polarMeasureValue = new PolarMeasureValue(measureValuePolarContainers);
        return {polarMeasureValue}
    }

    it('should GetLatLngFromPolar', () => {

        const center = new LatLng(az0_d0[0], az0_d0[1]);
        let point = Converter.GetLatLngFromPolar(center, 0, 0);
        expect(point.lat).eq(az0_d0[0]);
        expect(point.lng).eq(az0_d0[1]);

        point = Converter.GetLatLngFromPolar(center, 0, 1000);
        expect(point.lat).eq(az0_d1000[0]);
        expect(point.lng).eq(az0_d1000[1]);

        point = Converter.GetLatLngFromPolar(center, 180, 1000);
        expect(point.lat).eq(az180_d1000[0]);
        expect(point.lng).eq(az180_d1000[1]);

        point = Converter.GetLatLngFromPolar(center, 90, 1000);
        expect(point.lat).eq(az90_d1000[0]);
        expect(point.lng).eq(az90_d1000[1]);

        point = Converter.GetLatLngFromPolar(center, 225, 1000);
        expect(point.lat).eq(az225_d1000[0]);
        expect(point.lng).eq(az225_d1000[1]);

        point = Converter.GetLatLngFromPolar(center, 50, 100000);
        expect(point.lat).eq(az50_d100000[0]);
        expect(point.lng).eq(az50_d100000[1]);
    });

    it('should GetLatLngFromDistances', () => {

        const center = new LatLng(az0_d0[0], az0_d0[1]);
        let point = Converter.GetLatLngFromDistances(center, 0, 0);
        expect(point.lat).eq(az0_d0[0]);
        expect(point.lng).eq(az0_d0[1]);

        point = Converter.GetLatLngFromDistances(center, 0, 1000);
        expect(point.lat).eq(az0_d1000[0]);
        expect(point.lng).eq(az0_d1000[1]);

        point = Converter.GetLatLngFromDistances(center, 0, -1000);
        expect(point.lat).eq(az180_d1000[0]);
        expect(point.lng).eq(az180_d1000[1]);

        point = Converter.GetLatLngFromDistances(center, 1000, 0);
        expect(point.lat).eq(az90_d1000[0]);
        expect(point.lng).eq(az90_d1000[1]);

        point = Converter.GetLatLngFromDistances(center, -707, -707);
        const precision = 0.00001;
        expect(QualityTools.isEqualsLatLng(point.lat, az225_d1000[0], precision)).eq(true);
        expect(QualityTools.isEqualsLatLng(point.lng, az225_d1000[1], precision)).eq(true);
    });

    it('should TODO MapPositionToLatLng and MapLatLngToPosition', () => {

        const center = new LatLng(az0_d0[0], az0_d0[1]);
        // todo scale and center
        const latLng = Converter.MapPositionToLatLng(new Position(az0_d0[0], az0_d0[1]));

        // let point = Converter.MapLatLngToPosition(center, 0, 0);
        expect(latLng.lat).eq(az0_d0[0]);
        expect(latLng.lng).eq(az0_d0[1]);
    });

    it('should get cartesianSquare', () => {

        let center = new LatLng(1, 1);
        let square = Converter.CartesianSquare(center,
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
        square = Converter.CartesianSquare(center,
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
        square = Converter.CartesianSquare(center,
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
        square = Converter.CartesianSquare(center,
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

    it('should convert toCartesian', () => {

        let point, cartesianValue;
        const center = new LatLng(1, 1);
        const polarMeasureValue = getPreparedScenario().polarMeasureValue;
        const converterFromPolar = new Converter(center, polarMeasureValue);

        converterFromPolar.setWidth(0.01, 0.01);

        point = new LatLng(1, 1);
        cartesianValue = converterFromPolar.toCartesian(point);
        expect(cartesianValue.lat).eq(1);
        expect(cartesianValue.lng).eq(1);
        expect(cartesianValue.value).eq(0.2321428571428579);

        point = new LatLng(1.02, 1.02);
        cartesianValue = converterFromPolar.toCartesian(point);
        expect(cartesianValue.lat).eq(point.lat);
        expect(cartesianValue.lng).eq(point.lng);
        expect(cartesianValue.value).eq(2.499999999999998);

        point = new LatLng(1.1, 1.1);
        cartesianValue = converterFromPolar.toCartesian(point);
        expect(cartesianValue.lat).eq(point.lat);
        expect(cartesianValue.lng).eq(point.lng);
        expect(cartesianValue.value).eq(10.500000000000002);

        point = new LatLng(0.2, 0.64);
        cartesianValue = converterFromPolar.toCartesian(point);
        expect(cartesianValue.value).eq(64.50000000000001);

    });


    it('should convert toCartesian out of scope => 0', () => {

        let point, cartesianValue;
        const center = new LatLng(1, 1);
        const polarMeasureValue = getPreparedScenario().polarMeasureValue;
        const converterFromPolar = new Converter(center, polarMeasureValue);

        converterFromPolar.setWidth(0.01, 0.01);

        point = new LatLng(1.1, 6);
        cartesianValue = converterFromPolar.toCartesian(point);
        expect(cartesianValue.value).eq(0);
        point = new LatLng(6, 1.1);
        cartesianValue = converterFromPolar.toCartesian(point);
        expect(cartesianValue.value).eq(0);
        point = new LatLng(6, 6);
        cartesianValue = converterFromPolar.toCartesian(point);
        expect(cartesianValue.value).eq(0);
    });

    it('should convert toCartesian even with greater or less precision', () => {

        let point, cartesianValue;
        const center = new LatLng(1, 1);
        const polarMeasureValue = getPreparedScenario().polarMeasureValue;
        const converterFromPolar = new Converter(center, polarMeasureValue);

        // more precise
        converterFromPolar.setWidth(0.001, 0.001);
        point = new LatLng(1.02, 1.02);
        cartesianValue = converterFromPolar.toCartesian(point);
        expect(cartesianValue.lat).eq(point.lat);
        expect(cartesianValue.lng).eq(point.lng);
        expect(cartesianValue.value).eq(2); // compare to 2.5

        point = new LatLng(1.021, 1.019);
        cartesianValue = converterFromPolar.toCartesian(point);
        expect(cartesianValue.lat).eq(point.lat);
        expect(cartesianValue.lng).eq(point.lng);
        expect(cartesianValue.value).eq(2); // compare to 2.5

        // less precise
        converterFromPolar.setWidth(0.1, 0.1);
        point = new LatLng(1.08, 1.08);
        cartesianValue = converterFromPolar.toCartesian(point);
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
        cartesianValue = converterFromPolar.toCartesian(point);
        expect(cartesianValue.lat).eq(point.lat);
        expect(cartesianValue.lng).eq(point.lng);
        expect(cartesianValue.value).eq(2);
    });

    it('should getRainCartesianMeasureValue', () => {

        const center = new LatLng(1, 1);
        const polarMeasureValue = getPreparedScenario().polarMeasureValue;
        const converterFromPolar = new Converter(center, polarMeasureValue);

        const rainCartesianMeasureValue = converterFromPolar.getRainCartesianMeasureValue();
        const json = rainCartesianMeasureValue.toJSON();
        expect(json['cartesianValues'].length).eq((250 + 251) * (250 + 251));

        expect(rainCartesianMeasureValue.getCartesianValue(1, 1).value).eq(0.2321428571428579);
        expect(rainCartesianMeasureValue.getCartesianValue(1.01, 1.01).value).eq(0.6969696969696948);
        expect(rainCartesianMeasureValue.getCartesianValue(0.99, 0.99).value).eq(0.696092619392189);
        expect(rainCartesianMeasureValue.getCartesianValue(2, 2).value).eq(103.99999999999999);
    }).timeout(5000);

});
