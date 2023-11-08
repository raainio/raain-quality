import {CartesianGaugeHistory, CartesianQuality, CartesianRainHistory, QualityTools} from '../src';
import {expect} from 'chai';
import {CartesianValue} from 'raain-model';
import * as path from 'path';
import {readFileSync} from 'node:fs';


describe('CartesianQuality', () => {

    function prepareGauges(latLngMin, latLngMax, scale, date, possibleGaugePositions) {
        const cartesianGaugeHistories = [];
        for (let latitude = latLngMin; latitude <= latLngMax; latitude += scale) {
            for (let longitude = latLngMin; longitude <= latLngMax; longitude += scale) {

                latitude = QualityTools.roundLatLng(latitude);
                longitude = QualityTools.roundLatLng(longitude);
                const measureDate1 = new Date(date.getTime() + 2 * 60 * 1000); // +2mn

                const gaugeIndex = QualityTools.indexOfDualArray(possibleGaugePositions, [latitude, longitude]);
                if (gaugeIndex >= 0) {
                    const cartesianGaugeHistory = new CartesianGaugeHistory(
                        'gauge' + gaugeIndex,
                        measureDate1,
                        new CartesianValue(5 + gaugeIndex * 0.001, latitude, longitude));
                    cartesianGaugeHistories.push(cartesianGaugeHistory);
                }
            }
        }
        return cartesianGaugeHistories;
    }

    function prepareRains(latLngMin, latLngMax, scale, date, possibleGaugePositions, gaugeTranslation) {
        const cartesianRainHistories = [];
        for (let latitude = latLngMin; latitude <= latLngMax; latitude += scale) {
            for (let longitude = latLngMin; longitude <= latLngMax; longitude += scale) {

                latitude = QualityTools.roundLatLng(latitude);
                longitude = QualityTools.roundLatLng(longitude);

                const measureDate1 = new Date(date.getTime());
                const measureDate2 = new Date(date.getTime() + 5 * 60 * 1000); // +5mn
                let cartesianRainHistory = new CartesianRainHistory(
                    measureDate1,
                    measureDate2,
                    new CartesianValue(120, latitude, longitude));

                const gaugeIndex = QualityTools.indexOfDualArray(possibleGaugePositions,
                    [QualityTools.roundLatLng(latitude - gaugeTranslation), longitude]);
                if (gaugeIndex >= 0) {
                    cartesianRainHistory = new CartesianRainHistory(
                        measureDate1,
                        measureDate2,
                        new CartesianValue(5.01 + gaugeIndex * 0.001, latitude, longitude));
                }

                cartesianRainHistories.push(cartesianRainHistory);
            }
        }
        return cartesianRainHistories;
    }

    function getPreparedScenario(latLngMin = -0.1,
                                 latLngMax = 0.1,
                                 scale = CartesianQuality.DEFAULT_SCALE,
                                 gaugeTranslation: number = 0,
                                 gaugeCount = 1,
                                 minDateTime = 0) {
        const minDate = new Date(minDateTime);
        const gaugePadding = scale * 8 + scale;
        const possibleGaugePositions = [[
            QualityTools.roundLatLng(latLngMin + gaugePadding),
            QualityTools.roundLatLng(latLngMax - gaugePadding)]];
        const cartesianGaugeHistories = [];
        const cartesianRainHistories = [];
        for (let i = 1; i < gaugeCount; i++) {
            possibleGaugePositions.push([
                QualityTools.roundLatLng(latLngMin + i * scale + gaugePadding),
                QualityTools.roundLatLng(latLngMax - i * scale - gaugePadding)]);
        }

        // Gauges
        for (let mnStep = 0; mnStep < 30; mnStep += 5) {
            const gaugeDate = new Date(minDate);
            gaugeDate.setMinutes(gaugeDate.getMinutes() + mnStep);
            cartesianGaugeHistories.push.apply(cartesianGaugeHistories,
                prepareGauges(latLngMin, latLngMax, scale, gaugeDate, possibleGaugePositions));
        }

        // Rains
        for (let mnStep = 0; mnStep < 30; mnStep += 5) {
            const rainDate = new Date(minDate);
            rainDate.setMinutes(rainDate.getMinutes() + mnStep);
            cartesianRainHistories.push.apply(cartesianRainHistories,
                prepareRains(latLngMin, latLngMax, scale, rainDate, possibleGaugePositions, gaugeTranslation));
        }

        return {cartesianRainHistories, cartesianGaugeHistories};
    }

    function getPreparedMovingScenario(latLngMin = -0.1,
                                       latLngMax = 0.1,
                                       scale = CartesianQuality.DEFAULT_SCALE,
                                       gaugeTranslation: number = 0,
                                       gaugeCount = 1,
                                       minDateTime = 0) {
        const minDate = new Date(minDateTime);
        const gaugePadding = scale * 9;
        const possibleGaugePositions = [[
            QualityTools.roundLatLng(latLngMin + gaugePadding),
            QualityTools.roundLatLng(latLngMax - gaugePadding)]];
        const cartesianGaugeHistories = [];
        const cartesianRainHistories = [];
        for (let i = 1; i < gaugeCount; i++) {
            possibleGaugePositions.push([
                QualityTools.roundLatLng(latLngMin + i * scale + gaugePadding),
                QualityTools.roundLatLng(latLngMax - i * scale - gaugePadding)]);
        }

        // Gauges
        for (let mnStep = 0; mnStep < 30; mnStep += 5) {
            const gaugeDate = new Date(minDate);
            gaugeDate.setMinutes(gaugeDate.getMinutes() + mnStep);
            cartesianGaugeHistories.push.apply(cartesianGaugeHistories,
                prepareGauges(latLngMin, latLngMax, scale, gaugeDate, possibleGaugePositions));
        }

        // Rains
        for (let mnStep = 0; mnStep < 30; mnStep += 5) {
            const rainDate = new Date(minDate);
            const stepIndex = 1 + (mnStep / 5);
            rainDate.setMinutes(rainDate.getMinutes() + mnStep);

            const possibleRainPositions = [];
            possibleGaugePositions.forEach(gp => {

                for (let i = 0; i < stepIndex; i++) {
                    possibleRainPositions.push([
                        QualityTools.roundLatLng(gp[0] + gaugeTranslation + i * scale),
                        QualityTools.roundLatLng(gp[1])]);
                }
            });

            cartesianRainHistories.push.apply(cartesianRainHistories,
                prepareRains(latLngMin, latLngMax, scale, rainDate, possibleRainPositions, 0));
        }

        return {cartesianRainHistories, cartesianGaugeHistories};
    }

    it('should getRainComputationQuality undefined by default', async () => {
        const cartesianQuality = new CartesianQuality([], []);
        const rainComputationQuality = await cartesianQuality.getRainComputationQuality();

        expect(rainComputationQuality.qualitySpeedMatrixContainer).eq(undefined);
    });

    it('should getRainComputationQuality for one gauge === rain', async () => {

        // Prepare scenario : full map with 1 gauge
        const scenario = getPreparedScenario();

        // Compute the quality
        const cartesianQuality = new CartesianQuality(scenario.cartesianRainHistories, scenario.cartesianGaugeHistories);
        const rainComputationQuality = await cartesianQuality.getRainComputationQuality();

        // Verify results
        expect(rainComputationQuality.qualitySpeedMatrixContainer.getQualityPoints().length).eq(1);
        expect(rainComputationQuality.qualitySpeedMatrixContainer.getQualityPoints()[0].gaugeId).eq('gauge0');
        expect(rainComputationQuality.qualitySpeedMatrixContainer.getQualityPoints()[0].rainCartesianValue.value).eq(5.01);
        expect(rainComputationQuality.qualitySpeedMatrixContainer.getQualityPoints()[0].gaugeCartesianValue.value).eq(5);

        expect(rainComputationQuality.qualitySpeedMatrixContainer.getQuality()).eq(0.009999999999999787);
        expect(rainComputationQuality.qualitySpeedMatrixContainer.getTrustedIndicators()[0]).eq(1);
        expect(rainComputationQuality.qualitySpeedMatrixContainer.getMaxGauge()).eq(5);
        expect(rainComputationQuality.qualitySpeedMatrixContainer.getMaxRain()).eq(5.01);

        const matrix = rainComputationQuality.qualitySpeedMatrixContainer.getMatrix();
        matrix.logFlatten();
        expect(matrix.getTrustedIndicator()).eq(1);
        const qualityPoint = matrix.getQualityPoints()[0];
        expect(qualityPoint.rainCartesianValue.lat).eq(-0.01);
        expect(qualityPoint.rainCartesianValue.lng).eq(0.01);
        expect(qualityPoint.gaugeCartesianValue.lat).eq(-0.01);
        expect(qualityPoint.gaugeCartesianValue.lng).eq(0.01);
        expect(qualityPoint.speed.x).eq(0);
        expect(qualityPoint.speed.y).eq(0);

    });


    it('should getRainComputationQuality for one gauge with rain moving', async () => {

        // Prepare scenario : full map with 1 gauge
        const scenario = getPreparedMovingScenario(-1, +1, CartesianQuality.DEFAULT_SCALE, -0.04, 1);

        // Compute the quality
        const cartesianQuality = new CartesianQuality(scenario.cartesianRainHistories, scenario.cartesianGaugeHistories);
        const rainComputationQuality = await cartesianQuality.getRainComputationQuality();

        // Verify results
        expect(rainComputationQuality.qualitySpeedMatrixContainer.getQualityPoints().length).eq(1);
        expect(rainComputationQuality.qualitySpeedMatrixContainer.getQualityPoints()[0].gaugeId).eq('gauge0');
        expect(rainComputationQuality.qualitySpeedMatrixContainer.getQualityPoints()[0].gaugeCartesianValue.value).eq(5);
        expect(rainComputationQuality.qualitySpeedMatrixContainer.getQualityPoints()[0].rainCartesianValue.value).eq(5.01);

        expect(rainComputationQuality.qualitySpeedMatrixContainer.getQuality()).eq(0.009999999999999787);
        expect(rainComputationQuality.qualitySpeedMatrixContainer.getMaxGauge()).eq(5);
        expect(rainComputationQuality.qualitySpeedMatrixContainer.getMaxRain()).eq(5.01);

        const matrix = rainComputationQuality.qualitySpeedMatrixContainer.getMatrix();

        expect(matrix.getTrustedIndicator()).eq(1);

        const flattenMatrix = matrix.renderFlatten();
        matrix.logFlatten();
        expect(flattenMatrix[0].x).equal(-8);
        expect(flattenMatrix[0].y).equal(-8);
        expect(flattenMatrix[0].value).equal(0);
        expect(flattenMatrix[(17 * 17) - 1].x).equal(8);
        expect(flattenMatrix[(17 * 17) - 1].y).equal(8);
        expect(flattenMatrix[(17 * 17) - 1].value).equal(0);

        expect(flattenMatrix[144].x).equal(0);
        expect(flattenMatrix[144].y).equal(0);
        expect(flattenMatrix[144].value).equal(0.2526718292230032);
        expect(flattenMatrix[141].value).equal(0.9998004390341247);

        expect(matrix.getQualityPoints()[0].gaugeCartesianValue.lat).eq(-0.91);
        expect(matrix.getQualityPoints()[0].gaugeCartesianValue.lng).eq(0.91);
        expect(matrix.getQualityPoints()[0].rainCartesianValue.lat).eq(-0.95);
        expect(matrix.getQualityPoints()[0].rainCartesianValue.lng).eq(0.91);
        expect(matrix.getQualityPoints()[0].speed.x).eq(0);
        expect(matrix.getQualityPoints()[0].speed.y).eq(-0.04);

    });

    it('should getRainComputationQuality on 4 gauges', async () => {

        // Prepare scenario : full map with 4 gauges
        const scenario = getPreparedScenario(-1, +1, CartesianQuality.DEFAULT_SCALE, 0, 4);

        // Compute the quality
        console.log(new Date().toISOString(), 'begin');
        const cartesianQuality = new CartesianQuality(scenario.cartesianRainHistories, scenario.cartesianGaugeHistories);
        const rainComputationQuality = await cartesianQuality.getRainComputationQuality();
        console.log(new Date().toISOString(), 'end');

        // Verify results
        expect(rainComputationQuality.qualitySpeedMatrixContainer.getQuality()).eq(0.008749999999999813);
        expect(rainComputationQuality.qualitySpeedMatrixContainer.getMaxGauge()).eq(5.003);
        expect(rainComputationQuality.qualitySpeedMatrixContainer.getMaxRain()).eq(5.011);

        expect(rainComputationQuality.qualitySpeedMatrixContainer.getQualityPoints().length).eq(4);
        expect(rainComputationQuality.qualitySpeedMatrixContainer.getQualityPoints()[0].gaugeId).eq('gauge0');
        expect(rainComputationQuality.qualitySpeedMatrixContainer.getQualityPoints()[0].rainCartesianValue.value).eq(5.01);
        expect(rainComputationQuality.qualitySpeedMatrixContainer.getQualityPoints()[0].gaugeCartesianValue.value).eq(5);

        const matrix = rainComputationQuality.qualitySpeedMatrixContainer.getMatrix();

        expect(matrix.getTrustedIndicator()).eq(1);

        expect(matrix.getQualityPoints()[0].rainCartesianValue.lat).eq(-0.91);
        expect(matrix.getQualityPoints()[0].rainCartesianValue.lng).eq(0.91);
        expect(matrix.getQualityPoints()[0].gaugeCartesianValue.lat).eq(-0.91);
        expect(matrix.getQualityPoints()[0].gaugeCartesianValue.lng).eq(0.91);
        expect(matrix.getQualityPoints()[0].speed.x).eq(0);
        expect(matrix.getQualityPoints()[0].speed.y).eq(0);

        const flatten = matrix.renderFlatten();
        matrix.logFlatten();
        const defaultWidth = 8 + 8 + 1;
        expect(flatten.length).eq(defaultWidth * defaultWidth);
        expect(flatten[0].x).eq(-8);
        expect(flatten[0].y).eq(-8);
        expect(flatten[0].value).eq(0);
        expect(flatten[defaultWidth * defaultWidth - 1].x).eq(8);
        expect(flatten[defaultWidth * defaultWidth - 1].y).eq(8);
        expect(flatten[defaultWidth * defaultWidth - 1].value).eq(0);
        expect(flatten[144].x).eq(0);
        expect(flatten[144].y).eq(0);
        expect(flatten[144].value).eq(1532.9350492338667);

        // Get the cached result
        const rainComputationQualityCached = await cartesianQuality.getRainComputationQuality();

        // Verify same results
        expect(rainComputationQuality).eq(rainComputationQualityCached);
    });

    it('should getRainComputationQuality on 4 gauges translated', async () => {

        // Prepare scenario : full map with 4 gauges
        const scenario = getPreparedScenario(40, 42, CartesianQuality.DEFAULT_SCALE, 0.01, 4);

        // Compute the quality
        console.log(new Date().toISOString(), 'begin');
        const cartesianQuality = new CartesianQuality(scenario.cartesianRainHistories, scenario.cartesianGaugeHistories);
        const rainComputationQuality = await cartesianQuality.getRainComputationQuality();
        console.log(new Date().toISOString(), 'end');

        // Verify results
        expect(rainComputationQuality.qualitySpeedMatrixContainer.getQuality()).eq(0.008749999999999813);
        expect(rainComputationQuality.qualitySpeedMatrixContainer.getMaxGauge()).eq(5.003);
        expect(rainComputationQuality.qualitySpeedMatrixContainer.getMaxRain()).eq(5.011);

        const matrix = rainComputationQuality.qualitySpeedMatrixContainer.getMatrix();

        expect(matrix.getTrustedIndicator()).eq(1);

        expect(rainComputationQuality.qualitySpeedMatrixContainer.getQualityPoints().length).eq(4);
        expect(rainComputationQuality.qualitySpeedMatrixContainer.getQualityPoints()[0].gaugeId).eq('gauge0');
        expect(rainComputationQuality.qualitySpeedMatrixContainer.getQualityPoints()[0].rainCartesianValue.value).eq(5.01);
        expect(rainComputationQuality.qualitySpeedMatrixContainer.getQualityPoints()[0].gaugeCartesianValue.value).eq(5);

        expect(matrix.getQualityPoints()[0].rainCartesianValue.lat).eq(40.1);
        expect(matrix.getQualityPoints()[0].rainCartesianValue.lng).eq(41.91);
        expect(matrix.getQualityPoints()[0].gaugeCartesianValue.lat).eq(40.09);
        expect(matrix.getQualityPoints()[0].gaugeCartesianValue.lng).eq(41.91);
        expect(matrix.getQualityPoints()[0].speed.x).eq(0.01);
        expect(matrix.getQualityPoints()[0].speed.y).eq(0);

        const flatten = matrix.renderFlatten();
        matrix.logFlatten();
        const defaultWidth = 8 + 8 + 1;
        expect(flatten.length).eq(defaultWidth * defaultWidth);
        expect(flatten[0].x).eq(-8);
        expect(flatten[0].y).eq(-8);
        expect(flatten[0].value).eq(0);
        expect(flatten[defaultWidth * defaultWidth - 1].x).eq(8);
        expect(flatten[defaultWidth * defaultWidth - 1].y).eq(8);
        expect(flatten[defaultWidth * defaultWidth - 1].value).eq(0);
        expect(flatten[129].x).eq(-1);
        expect(flatten[129].y).eq(2);
        expect(flatten[129].value).eq(766.7737750601372);

        // Get the cached result
        const rainComputationQualityCached = await cartesianQuality.getRainComputationQuality();

        // Verify same results
        expect(rainComputationQuality).eq(rainComputationQualityCached);
    });

    it('should merge rainComputationQualities and especially qualitySpeedMatrixContainer', async () => {

        const scenario1 = getPreparedScenario(40, 42, CartesianQuality.DEFAULT_SCALE, -0.01, 4, 0);
        const scenario2 = getPreparedScenario(40, 42, CartesianQuality.DEFAULT_SCALE, -0.02, 4, 30 * 60000); // 30 min later
        const cartesianQuality1 = new CartesianQuality(scenario1.cartesianRainHistories, scenario1.cartesianGaugeHistories);
        const rainComputationQuality1 = await cartesianQuality1.getRainComputationQuality();
        const cartesianQuality2 = new CartesianQuality(scenario2.cartesianRainHistories, scenario2.cartesianGaugeHistories);
        const rainComputationQuality2 = await cartesianQuality2.getRainComputationQuality();

        expect(rainComputationQuality1.periodBegin.getTime()).eq(new Date(0).getTime());
        expect(rainComputationQuality2.periodBegin.getTime()).eq(new Date(30 * 60000).getTime());
        expect(rainComputationQuality1.progressIngest).eq(undefined);
        expect(rainComputationQuality1.progressComputing).eq(undefined);
        expect(rainComputationQuality1.timeSpentInMs).greaterThan(10);

        expect(rainComputationQuality1.qualitySpeedMatrixContainer.getQuality()).eq(0.008749999999999813);
        expect(rainComputationQuality1.qualitySpeedMatrixContainer.getMaxGauge()).eq(5.003);
        expect(rainComputationQuality1.qualitySpeedMatrixContainer.getMaxRain()).eq(5.011);
        expect(rainComputationQuality2.qualitySpeedMatrixContainer.getQuality()).eq(0.008749999999999813);
        expect(rainComputationQuality2.qualitySpeedMatrixContainer.getMaxGauge()).eq(5.003);
        expect(rainComputationQuality2.qualitySpeedMatrixContainer.getMaxRain()).eq(5.011);

        expect(rainComputationQuality1.qualitySpeedMatrixContainer.getQualityPoints().length).eq(4);
        expect(rainComputationQuality2.qualitySpeedMatrixContainer.getQualityPoints().length).eq(4);
        expect(rainComputationQuality1.qualitySpeedMatrixContainer.getQualityPoints()[0].gaugeCartesianValue.value).eq(5);
        expect(rainComputationQuality1.qualitySpeedMatrixContainer.getQualityPoints()[0].rainCartesianValue.value).eq(5.01);

        rainComputationQuality1.merge(rainComputationQuality2);

        expect(rainComputationQuality1.periodBegin.getTime()).eq(rainComputationQuality1.periodBegin.getTime());
        expect(rainComputationQuality1.periodEnd.getTime()).eq(rainComputationQuality2.periodEnd.getTime());
        expect(rainComputationQuality1.timeSpentInMs).greaterThan(10);

        expect(rainComputationQuality1.qualitySpeedMatrixContainer.getQuality()).eq(0.017499999999999627);
        expect(rainComputationQuality1.qualitySpeedMatrixContainer.getMaxGauge()).eq(10.006);
        expect(rainComputationQuality1.qualitySpeedMatrixContainer.getMaxRain()).eq(10.022);

        expect(rainComputationQuality1.qualitySpeedMatrixContainer.getQualityPoints().length).eq(4);
        expect(rainComputationQuality1.qualitySpeedMatrixContainer.getQualityPoints()[0].gaugeCartesianValue.value).eq(10);
        expect(rainComputationQuality1.qualitySpeedMatrixContainer.getQualityPoints()[0].rainCartesianValue.value).eq(10.02);

    });


    it('should getRainComputationQuality with json files', async () => {

        // read files
        const {cartesianGaugeHistories} = require('./files/555555b00000000000000007-cartesianGaugeHistories-2023-11-07T14:04:52.690Z.gitignored.json');
        const msgpack = require('msgpack-lite');

        const fileName = path.resolve(__dirname, './files/555555b00000000000000007-cartesianRainHistories-2023-11-07T14:04:52.791Z.gitignored.encoded.json');
        const cartesianRainHistoriesEncoded = readFileSync(fileName);
        // tslint:disable-next-line:max-line-length
        // const cartesianRainHistoriesEncoded = require('./files/555555b00000000000000007-cartesianRainHistories-2023-11-07T14:04:52.791Z.gitignored.encoded.json')
        const {cartesianRainHistories} = msgpack.decode(cartesianRainHistoriesEncoded);

        // possible period filtering
        const dateToConsider = new Date('2018-05-25T23:51:00+02:00'); // any sample date
        const periodBegin = new Date(dateToConsider.getTime() - 30 * 60000); // 30 mn before
        const cartesianRainHistoriesFiltered = cartesianRainHistories
            .filter(crh => periodBegin.getTime() <= crh.periodBegin.getTime() && crh.periodBegin.getTime() <= dateToConsider.getTime());
        const nonNullValues = cartesianRainHistoriesFiltered.filter(crh => crh.computedValue.value);
        console.log('Filtering period:', dateToConsider.toISOString(),
            ', non null values:', nonNullValues.length, 'in', cartesianRainHistoriesFiltered.length);

        // Compute the quality
        const cartesianQuality = new CartesianQuality(cartesianRainHistoriesFiltered, cartesianGaugeHistories);
        const rainComputationQuality = await cartesianQuality.getRainComputationQuality();

        // Verify results
        const matrix = rainComputationQuality.qualitySpeedMatrixContainer.getMatrix();
        matrix.logFlatten();

        // Expected => 0
        // TODO check if we are improving ?
        expect(rainComputationQuality.qualitySpeedMatrixContainer.getQuality()).lessThanOrEqual(0.073);
        expect(rainComputationQuality.qualitySpeedMatrixContainer.getMaxGauge()).eq(5.003);
        expect(rainComputationQuality.qualitySpeedMatrixContainer.getMaxRain()).eq(5.011);

    });

});
