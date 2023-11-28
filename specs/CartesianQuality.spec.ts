import {CartesianGaugeHistory, CartesianQuality, CartesianRainHistory, Converter, LatLng, QualityTools} from '../src';
import {expect} from 'chai';
import {CartesianValue, RainPolarMeasureValue} from 'raain-model';
import * as path from 'path';
import * as fs from 'fs';

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
                    const gaugeValue = 5 + gaugeIndex * 0.001;
                    const cartesianGaugeHistory = new CartesianGaugeHistory(
                        'gauge' + gaugeIndex,
                        measureDate1,
                        new CartesianValue(gaugeValue, latitude, longitude));
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
                    const rainValue = (5.01 + gaugeIndex * 0.001) * 12;
                    cartesianRainHistory = new CartesianRainHistory(
                        measureDate1,
                        measureDate2,
                        new CartesianValue(rainValue, latitude, longitude));
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
        let lastDate = minDate;
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
            lastDate = rainDate;
            cartesianRainHistories.push.apply(cartesianRainHistories,
                prepareRains(latLngMin, latLngMax, scale, rainDate, possibleGaugePositions, gaugeTranslation));
        }

        return {cartesianRainHistories, cartesianGaugeHistories, date: lastDate};
    }

    function getPreparedMovingScenario(latLngMin = -0.1,
                                       latLngMax = 0.1,
                                       scale = CartesianQuality.DEFAULT_SCALE,
                                       gaugeTranslation: number = 0,
                                       gaugeCount = 1,
                                       minDateTime = 0) {
        const minDate = new Date(minDateTime);
        let lastDate = minDate;
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
            lastDate = rainDate;

            const possibleRainPositions = [];
            for (const gp of possibleGaugePositions) {
                for (let i = 0; i < stepIndex; i++) {
                    possibleRainPositions.push([
                        QualityTools.roundLatLng(gp[0] + gaugeTranslation + i * scale),
                        QualityTools.roundLatLng(gp[1])]);
                }
            }

            cartesianRainHistories.push.apply(cartesianRainHistories,
                prepareRains(latLngMin, latLngMax, scale, rainDate, possibleRainPositions, 0));
        }

        return {cartesianRainHistories, cartesianGaugeHistories, date: lastDate};
    }

    it('should getRainComputationQuality undefined by default', async () => {
        const cartesianQuality = new CartesianQuality([], []);
        const rainComputationQuality = await cartesianQuality.getRainComputationQuality(new Date());

        expect(rainComputationQuality.qualitySpeedMatrixContainer).eq(undefined);
    });

    it('should getRainComputationQuality for one gauge === rain', async () => {

        // Prepare scenario : full map with 1 gauge
        const scenario = getPreparedScenario();

        // Compute the quality
        const cartesianQuality = new CartesianQuality(scenario.cartesianRainHistories, scenario.cartesianGaugeHistories);
        const rainComputationQuality = await cartesianQuality.getRainComputationQuality(scenario.date);

        // Verify results
        expect(rainComputationQuality.qualitySpeedMatrixContainer.getQualityPoints().length).eq(1);
        expect(rainComputationQuality.qualitySpeedMatrixContainer.getQualityPoints()[0].gaugeId).eq('gauge0');
        expect(rainComputationQuality.qualitySpeedMatrixContainer.getQualityPoints()[0].rainCartesianValue.value).eq(60.12);
        expect(rainComputationQuality.qualitySpeedMatrixContainer.getQualityPoints()[0].gaugeCartesianValue.value).eq(60);

        expect(rainComputationQuality.qualitySpeedMatrixContainer.getQuality()).eq(0.11999999999999744);
        expect(rainComputationQuality.qualitySpeedMatrixContainer.getTrustedIndicators()[0]).eq(1);
        expect(rainComputationQuality.qualitySpeedMatrixContainer.getMaxGauge()).eq(60);
        expect(rainComputationQuality.qualitySpeedMatrixContainer.getMaxRain()).eq(60.12);

        const matrix = rainComputationQuality.qualitySpeedMatrixContainer.getMatrix();
        matrix.logFlatten();
        expect(matrix.getTrustedTechnicalIndicator()).eq(1);
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
        const rainComputationQuality = await cartesianQuality.getRainComputationQuality(scenario.date);

        // Verify results
        const qualityPoints = rainComputationQuality.qualitySpeedMatrixContainer.getQualityPoints();
        expect(qualityPoints.length).eq(1);
        expect(qualityPoints[0].gaugeId).eq('gauge0');
        expect(qualityPoints[0].gaugeCartesianValue.value).eq(60);
        expect(qualityPoints[0].rainCartesianValue.value).eq(60.12);

        expect(rainComputationQuality.qualitySpeedMatrixContainer.getQuality()).eq(0.11999999999999744);
        expect(rainComputationQuality.qualitySpeedMatrixContainer.getMaxGauge()).eq(60);
        expect(rainComputationQuality.qualitySpeedMatrixContainer.getMaxRain()).eq(60.12);

        const matrix = rainComputationQuality.qualitySpeedMatrixContainer.getMatrix();

        expect(matrix.getTrustedTechnicalIndicator()).eq(1);

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
        expect(flattenMatrix[144].value).equal(0.9992022337455126);
        expect(flattenMatrix[141].value).equal(0.9998004390341247);
        expect(flattenMatrix[140].value).equal(1);

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
        const cartesianQuality = new CartesianQuality(scenario.cartesianRainHistories, scenario.cartesianGaugeHistories);
        const rainComputationQuality = await cartesianQuality.getRainComputationQuality(scenario.date);

        // Verify results
        expect(rainComputationQuality.qualitySpeedMatrixContainer.getQuality()).eq(0.10499999999999865);
        expect(rainComputationQuality.qualitySpeedMatrixContainer.getMaxGauge()).eq(60.036);
        expect(rainComputationQuality.qualitySpeedMatrixContainer.getMaxRain()).eq(60.132000000000005);

        expect(rainComputationQuality.qualitySpeedMatrixContainer.getQualityPoints().length).eq(4);
        expect(rainComputationQuality.qualitySpeedMatrixContainer.getQualityPoints()[0].gaugeId).eq('gauge0');
        expect(rainComputationQuality.qualitySpeedMatrixContainer.getQualityPoints()[0].rainCartesianValue.value).eq(60.12);
        expect(rainComputationQuality.qualitySpeedMatrixContainer.getQualityPoints()[0].gaugeCartesianValue.value).eq(60);

        const matrix = rainComputationQuality.qualitySpeedMatrixContainer.getMatrix();

        expect(matrix.getTrustedTechnicalIndicator()).eq(1);

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
        expect(flatten[144].value).eq(1);

        // Get the cached result
        const rainComputationQualityCached = await cartesianQuality.getRainComputationQuality(scenario.date);

        // Verify same results
        expect(rainComputationQuality).eq(rainComputationQualityCached);
    });

    it('should getRainComputationQuality on 4 gauges translated', async () => {

        // Prepare scenario : full map with 4 gauges
        const scenario = getPreparedScenario(40, 42, CartesianQuality.DEFAULT_SCALE, 0.01, 4);

        // Compute the quality
        const cartesianQuality = new CartesianQuality(scenario.cartesianRainHistories, scenario.cartesianGaugeHistories);
        const rainComputationQuality = await cartesianQuality.getRainComputationQuality(scenario.date);

        // Verify results
        expect(rainComputationQuality.qualitySpeedMatrixContainer.getQuality()).eq(0.10499999999999865);
        expect(rainComputationQuality.qualitySpeedMatrixContainer.getMaxGauge()).eq(60.036);
        expect(rainComputationQuality.qualitySpeedMatrixContainer.getMaxRain()).eq(60.132000000000005);

        const matrix = rainComputationQuality.qualitySpeedMatrixContainer.getMatrix();

        expect(matrix.getTrustedTechnicalIndicator()).eq(1);

        expect(rainComputationQuality.qualitySpeedMatrixContainer.getQualityPoints().length).eq(4);
        expect(rainComputationQuality.qualitySpeedMatrixContainer.getQualityPoints()[0].gaugeId).eq('gauge0');
        expect(rainComputationQuality.qualitySpeedMatrixContainer.getQualityPoints()[0].rainCartesianValue.value).eq(60.12);
        expect(rainComputationQuality.qualitySpeedMatrixContainer.getQualityPoints()[0].gaugeCartesianValue.value).eq(60);

        const flatten = matrix.renderFlatten();
        matrix.logFlatten();

        expect(matrix.getQualityPoints()[0].rainCartesianValue.lat).eq(40.1);
        expect(matrix.getQualityPoints()[0].rainCartesianValue.lng).eq(41.91);
        expect(matrix.getQualityPoints()[0].gaugeCartesianValue.lat).eq(40.09);
        expect(matrix.getQualityPoints()[0].gaugeCartesianValue.lng).eq(41.91);
        expect(matrix.getQualityPoints()[0].speed.x).eq(0.01);
        expect(matrix.getQualityPoints()[0].speed.y).eq(0);

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
        const rainComputationQualityCached = await cartesianQuality.getRainComputationQuality(scenario.date);

        // Verify same results
        expect(rainComputationQuality).eq(rainComputationQualityCached);
    });

    it('should merge rainComputationQualities and especially qualitySpeedMatrixContainer', async () => {

        const scenario1 = getPreparedScenario(40, 42, CartesianQuality.DEFAULT_SCALE, -0.01, 4, 0);
        const scenario2 = getPreparedScenario(40, 42, CartesianQuality.DEFAULT_SCALE, -0.02, 4, 30 * 60000); // 30 min later
        const cartesianQuality1 = new CartesianQuality(scenario1.cartesianRainHistories, scenario1.cartesianGaugeHistories);
        const rainComputationQuality1 = await cartesianQuality1.getRainComputationQuality(scenario1.date);
        const cartesianQuality2 = new CartesianQuality(scenario2.cartesianRainHistories, scenario2.cartesianGaugeHistories);
        const rainComputationQuality2 = await cartesianQuality2.getRainComputationQuality(scenario2.date);

        expect(rainComputationQuality1.periodBegin.getTime()).eq(new Date(25 * 60000).getTime());
        expect(rainComputationQuality2.periodBegin.getTime()).eq(new Date(55 * 60000).getTime());
        expect(rainComputationQuality1.progressIngest).eq(undefined);
        expect(rainComputationQuality1.progressComputing).eq(undefined);
        expect(rainComputationQuality1.timeSpentInMs).greaterThan(10);

        expect(rainComputationQuality1.qualitySpeedMatrixContainer.getQuality()).eq(0.10499999999999865);
        expect(rainComputationQuality1.qualitySpeedMatrixContainer.getMaxGauge()).eq(60.036);
        expect(rainComputationQuality1.qualitySpeedMatrixContainer.getMaxRain()).eq(60.132000000000005);
        expect(rainComputationQuality2.qualitySpeedMatrixContainer.getQuality()).eq(0.11999999999999744);
        expect(rainComputationQuality2.qualitySpeedMatrixContainer.getMaxGauge()).eq(60.036);
        expect(rainComputationQuality2.qualitySpeedMatrixContainer.getMaxRain()).eq(60.156);

        expect(rainComputationQuality1.qualitySpeedMatrixContainer.getQualityPoints().length).eq(4);
        expect(rainComputationQuality2.qualitySpeedMatrixContainer.getQualityPoints().length).eq(4);
        expect(rainComputationQuality1.qualitySpeedMatrixContainer.getQualityPoints()[0].gaugeCartesianValue.value).eq(60.036);
        expect(rainComputationQuality1.qualitySpeedMatrixContainer.getQualityPoints()[0].rainCartesianValue.value).eq(60.156);

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

    it('should getRainComputationQuality with Json files', async () => {

        // read Polar files
        let cartesianGaugeHistories: CartesianGaugeHistory[], center: LatLng, lastDate: Date;
        const measures = [];
        const filesPath = path.resolve(__dirname, 'files');
        const files = fs.readdirSync(filesPath, {withFileTypes: true});
        for (const file of files) {
            if (file.isFile() && file.name.indexOf('cartesianGaugeHistories') >= 0) {
                cartesianGaugeHistories = require(path.resolve(filesPath, file.name)).cartesianGaugeHistories;
            }
            if (file.isFile() && file.name.indexOf('rainNode') >= 0) {
                const rainNode = require(path.resolve(filesPath, file.name)).rainNode;
                center = new LatLng(rainNode.latitude, rainNode.longitude);
            }
            if (file.isFile() && file.name.indexOf('rainPolarMeasureValues') >= 0) {
                lastDate = new Date(file.name.substring(file.name.indexOf('.snap.') + 6, file.name.indexOf('.json')));
                const data = require(path.resolve(filesPath, file.name)).rainPolarMeasureValues.polars;
                const rainPolarMeasureValue = new RainPolarMeasureValue(data);
                const periodEnd = new Date(lastDate);
                periodEnd.setMinutes(lastDate.getMinutes() + 5); // TODO 5mn debt
                measures.push({periodBegin: lastDate, periodEnd, rainPolarMeasureValue});
            }
        }

        expect(measures.length).to.greaterThan(0, 'Files are probably missing');
        // tslint:disable-next-line:no-unused-expression
        expect(cartesianGaugeHistories).to.exist;
        // tslint:disable-next-line:no-unused-expression
        expect(center).to.exist;

        // Polar => Cartesian
        const cartesianRainHistories: CartesianRainHistory[] = [];
        let cartesianPixelWidth: LatLng;
        for (const measure of measures) {
            const converter = new Converter(center, measure.rainPolarMeasureValue);
            const cartesianMeasureValue = converter.getCartesianMeasureValue();
            cartesianPixelWidth = converter.getCartesianPixelWidth();
            for (const cv of cartesianMeasureValue.getCartesianValues()) {
                const cartesianRainHistory = new CartesianRainHistory(measure.periodBegin, measure.periodEnd, cv);
                cartesianRainHistories.push(cartesianRainHistory);
            }
        }

        // TODO special filter for test
        // cartesianGaugeHistories = cartesianGaugeHistories.filter(h => h.gaugeId === 'PL02');
        // for (const gauge of cartesianGaugeHistories) {
        //     const gaugeTime = new Date(gauge.date).getTime();
        //     cartesianRainHistories.forEach(crh => {
        //         if (crh.periodBegin.getTime() <= gaugeTime && gaugeTime <= crh.periodEnd.getTime()) {
        //             const c = Converter.MapLatLngToPosition(crh.computedValue, true, cartesianPixelWidth);
        //             const g = Converter.MapLatLngToPosition(gauge.value, true, cartesianPixelWidth);
        //             if (c.x >= g.x && c.y >= g.y) {
        //                 crh.computedValue.value = gauge.value.value * 12;
        //             }
        //         }
        //     });
        // }

        // Compute the quality
        const cartesianQuality = new CartesianQuality(cartesianRainHistories, cartesianGaugeHistories, cartesianPixelWidth);

        let rainComputationQuality;
        // TODO only one ? const rainComputationQuality = await cartesianQuality.getRainComputationQuality(lastDate);
        const dates = cartesianQuality.getRainDates();
        for (const stepDate of dates) {
            rainComputationQuality = await cartesianQuality.getRainComputationQuality(stepDate);
        }

        // Verify results
        cartesianQuality.logQualities();

        // Expected Quality indicator => 0
        // TODO check if we are improving ? actual Challenge === 0.12 \o/
        const indicator = rainComputationQuality.qualitySpeedMatrixContainer?.getQuality();
        expect(indicator).lessThanOrEqual(0.12);

    })
        .timeout(200000);
});
