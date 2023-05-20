import {expect} from 'chai';
import {MeasureValuePolarContainer, PolarMeasureValue} from 'raain-model';
import {CartesianQuality, ConverterFromPolar, LatLng} from '../../src/';


describe('ConverterFromPolar', () => {

    const DISTANCE = 1500;

    function getPreparedScenario() {

        const measureValuePolarContainers = [];
        for (let azimuth = 0; azimuth < 360; azimuth++) {
            const polarEdges = [];
            for (let edge = 0; edge < 100; edge++) {
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

    it('should get cartesianSquare', () => {

        let center = new LatLng(1, 1);
        let square = ConverterFromPolar.CartesianSquare(center, CartesianQuality.DEFAULT_SCALE);
        expect(square.p1.lat).eq(1);
        expect(square.p1.lng).eq(1);
        expect(square.p2.lat).eq(1.01);
        expect(square.p2.lng).eq(1.01);
        expect(square.p3.lat).eq(1);
        expect(square.p3.lng).eq(1.01);
        expect(square.p4.lat).eq(1.01);
        expect(square.p4.lng).eq(1);

        center = new LatLng(1.005, 1);
        square = ConverterFromPolar.CartesianSquare(center, CartesianQuality.DEFAULT_SCALE);
        expect(square.p1.lat).eq(1);
        expect(square.p1.lng).eq(1);
        expect(square.p2.lat).eq(1.01);
        expect(square.p2.lng).eq(1.01);
        expect(square.p3.lat).eq(1);
        expect(square.p3.lng).eq(1.01);
        expect(square.p4.lat).eq(1.01);
        expect(square.p4.lng).eq(1);

        center = new LatLng(1.005, 1.005);
        square = ConverterFromPolar.CartesianSquare(center, CartesianQuality.DEFAULT_SCALE);
        expect(square.p1.lat).eq(1);
        expect(square.p1.lng).eq(1);
        expect(square.p2.lat).eq(1.01);
        expect(square.p2.lng).eq(1.01);
        expect(square.p3.lat).eq(1);
        expect(square.p3.lng).eq(1.01);
        expect(square.p4.lat).eq(1.01);
        expect(square.p4.lng).eq(1);

        center = new LatLng(1.005, 0.995);
        square = ConverterFromPolar.CartesianSquare(center, CartesianQuality.DEFAULT_SCALE);
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

        const center = new LatLng(1, 1);
        const polarMeasureValue = getPreparedScenario().polarMeasureValue;
        const converterFromPolar = new ConverterFromPolar(center, polarMeasureValue);

        let point = new LatLng(1, 1);
        let cartesianValue = converterFromPolar.toCartesian(point);
        expect(cartesianValue.lat).eq(1);
        expect(cartesianValue.lng).eq(1);
        expect(cartesianValue.value).eq(0.1678966789667891);

        point = new LatLng(1.02, 1.02);
        cartesianValue = converterFromPolar.toCartesian(point);
        expect(cartesianValue.lat).eq(point.lat);
        expect(cartesianValue.lng).eq(point.lng);
        expect(cartesianValue.value).eq(2.5000000000000004);

        point = new LatLng(0.2, 0.64);
        cartesianValue = converterFromPolar.toCartesian(point);
        expect(cartesianValue.value).eq(64.5);

        // Out of scope => 0
        point = new LatLng(2, 2);
        cartesianValue = converterFromPolar.toCartesian(point);
        expect(cartesianValue.value).eq(0);
    });

});
